"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { RhythmEvent, RhythmQuestion } from "@/lib/types";
import { audioNow, playRhythm, stopAll, type PlayHandle } from "@/lib/audio";
import { loadProgress, saveProgress } from "@/lib/progress";
import RhythmNotation from "./RhythmNotation";
import PlayButton from "./PlayButton";

interface Props {
  level: number;
  title: string;
  subtitle: string;
  questions: RhythmQuestion[];
}

export default function RhythmQuiz({ level, title, subtitle, questions }: Props) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);

  // Playback / cursor.
  const [cursor, setCursor] = useState<number | null>(null);
  const [playingMain, setPlayingMain] = useState(false);
  const handleRef = useRef<PlayHandle | null>(null);
  const rafRef = useRef<number | null>(null);

  const q = questions[index];
  const beats = q.timeSignature[0];

  const stopPlayback = useCallback(() => {
    handleRef.current?.stop();
    handleRef.current = null;
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    setPlayingMain(false);
    setCursor(null);
  }, []);

  // Stop any audio when the question changes or the component unmounts.
  useEffect(() => {
    return () => {
      stopPlayback();
      stopAll();
    };
  }, [index, stopPlayback]);

  const animate = useCallback(() => {
    const h = handleRef.current;
    if (!h) return;
    const f = (audioNow() - h.startTime) / h.totalSeconds;
    if (f >= 1) {
      setCursor(1);
      return;
    }
    setCursor(Math.max(0, f));
    rafRef.current = requestAnimationFrame(animate);
  }, []);

  const play = useCallback(
    async (events: RhythmEvent[], withCursor: boolean) => {
      stopPlayback();
      if (withCursor) setPlayingMain(true);
      const handle = await playRhythm(events, q.bpm, q.timeSignature, {
        metronome: true,
        onEnd: () => {
          if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
          setPlayingMain(false);
          setCursor(null);
          handleRef.current = null;
        },
      });
      handleRef.current = handle;
      if (withCursor) {
        setCursor(0);
        rafRef.current = requestAnimationFrame(animate);
      }
    },
    [animate, q.bpm, q.timeSignature, stopPlayback]
  );

  const toggleMain = () => {
    if (playingMain) stopPlayback();
    else void play(q.rhythm, true);
  };

  const handleAnswer = (i: number) => {
    if (answered) {
      void play(q.choices[i].rhythm, false); // compare choices after answering
      return;
    }
    setSelected(i);
    setAnswered(true);
    stopPlayback();
    const ok = i === q.correctIndex;
    if (ok) setCorrectCount((c) => c + 1);
    setResults((r) => {
      const next = [...r];
      next[index] = ok;
      return next;
    });
  };

  const handleNext = () => {
    stopPlayback();
    if (index + 1 >= questions.length) {
      const prev = loadProgress(level, questions.length);
      saveProgress(level, {
        total: questions.length,
        finished: true,
        bestScore: Math.max(prev.bestScore, correctCount),
      });
      setFinished(true);
    } else {
      setIndex((n) => n + 1);
      setSelected(null);
      setAnswered(false);
    }
  };

  const handleRetry = () => {
    stopPlayback();
    setIndex(0);
    setSelected(null);
    setAnswered(false);
    setCorrectCount(0);
    setFinished(false);
    setResults([]);
  };

  // ---- Results screen --------------------------------------------------------
  if (finished) {
    const pct = Math.round((correctCount / questions.length) * 100);
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <div className="animate-fade-in rounded-2xl border border-gold/30 bg-zinc-900/50 p-8 text-center">
          <div className="text-sm font-bold tracking-widest text-gold">{title}</div>
          <h1 className="mt-3 text-2xl font-bold text-gold">結果</h1>
          <p className="mt-6 text-5xl font-bold">
            {correctCount}
            <span className="text-2xl text-zinc-400"> / {questions.length}</span>
          </p>
          <p className="mt-2 text-zinc-400">正答率 {pct}%</p>

          <div className="mt-8 grid grid-cols-5 gap-2 sm:grid-cols-10">
            {results.map((ok, i) => (
              <div
                key={i}
                className={`flex h-9 items-center justify-center rounded text-sm font-bold ${
                  ok ? "bg-gold/20 text-gold" : "bg-red-500/15 text-red-400"
                }`}
                title={`Q${i + 1}`}
              >
                {ok ? "○" : "×"}
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={handleRetry}
              className="rounded-xl bg-gold px-6 py-3 font-bold text-black transition hover:brightness-110"
            >
              もう一度
            </button>
            <Link
              href="/"
              className="rounded-xl border border-zinc-700 px-6 py-3 font-bold text-zinc-200 transition hover:border-gold/50"
            >
              トップへ戻る
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // ---- Quiz screen -----------------------------------------------------------
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center justify-between text-sm">
        <Link href="/" className="text-zinc-400 transition hover:text-gold">
          ← トップ
        </Link>
        <span className="text-zinc-500">
          {title}・{index + 1} / {questions.length}
        </span>
      </div>
      <p className="mt-1 text-center text-xs text-zinc-600">{subtitle}</p>

      {/* progress bar */}
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full bg-gold transition-all"
          style={{ width: `${((index + (answered ? 1 : 0)) / questions.length) * 100}%` }}
        />
      </div>

      <div key={index} className="animate-fade-in">
        <h2 className="mt-6 text-center text-lg font-bold">{q.question}</h2>

        {/* Stimulus: blank rhythm staff with moving cursor */}
        <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="text-zinc-500">
            <RhythmNotation events={[]} beats={beats} cursor={cursor} />
          </div>
          <div className="mt-3 flex items-center justify-center gap-3">
            <PlayButton isPlaying={playingMain} onClick={toggleMain} />
            <span className="text-xs text-zinc-600">♩ = {q.bpm}・何度でも再生できます</span>
          </div>
        </div>

        {/* Choices, each drawn as a rhythm staff */}
        <div className="mt-6 grid gap-3">
          {q.choices.map((choice, i) => {
            const isCorrect = i === q.correctIndex;
            const isSelected = i === selected;
            let cls =
              "border-zinc-800 bg-zinc-900/40 text-zinc-200 hover:border-gold/40";
            if (answered) {
              if (isCorrect) cls = "border-gold bg-gold/10 text-gold";
              else if (isSelected) cls = "border-red-500/60 bg-red-500/10 text-red-300";
              else cls = "border-zinc-800 bg-zinc-900/20 text-zinc-500";
            }
            return (
              <button
                key={i}
                onClick={() => handleAnswer(i)}
                className={`flex items-center gap-3 rounded-xl border p-3 text-left transition active:scale-[0.99] ${cls}`}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-current text-sm font-bold">
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="min-w-0 flex-1">
                  <RhythmNotation events={choice.rhythm} beats={beats} />
                </span>
                {answered && (
                  <span className="shrink-0 text-base">
                    {isCorrect ? "🔊" : isSelected ? "✕" : "🔊"}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Explanation */}
        {answered && (
          <div className="animate-fade-in mt-5 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
            <p
              className={`text-lg font-bold ${
                selected === q.correctIndex ? "text-gold" : "text-red-400"
              }`}
            >
              {selected === q.correctIndex ? "正解！" : "不正解"}
            </p>
            {q.songName && (
              <p className="mt-2 text-sm font-bold text-zinc-200">🎵 {q.songName}</p>
            )}
            <p className="mt-2 text-sm leading-relaxed text-zinc-300">{q.explanation}</p>
            <p className="mt-2 text-xs text-zinc-600">
              ※ 各選択肢の 🔊 を押すと、そのリズムを聴き比べられます。
            </p>
            <button
              onClick={handleNext}
              className="mt-4 w-full rounded-xl bg-gold py-3 font-bold text-black transition hover:brightness-110"
            >
              {index + 1 >= questions.length ? "結果を見る" : "次の問題へ →"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
