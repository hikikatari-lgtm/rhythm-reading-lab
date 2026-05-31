"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LEVELS } from "@/lib/types";
import { questionsByLevel } from "@/lib/questions";
import { loadProgress, statusOf, type ProgressStatus } from "@/lib/progress";

const BADGE_STYLE: Record<ProgressStatus, string> = {
  未着手: "border-zinc-700 text-zinc-400",
  進行中: "border-blue-400/50 text-blue-300",
  完了: "border-gold/60 text-gold",
};

interface CardState {
  status: ProgressStatus;
  best: number;
  total: number;
}

export default function Home() {
  const [states, setStates] = useState<Record<number, CardState>>({});

  useEffect(() => {
    const next: Record<number, CardState> = {};
    for (const lv of LEVELS) {
      const total = questionsByLevel(lv.level).length;
      const p = loadProgress(lv.level, total);
      next[lv.level] = { status: statusOf(p), best: p.bestScore, total };
    }
    setStates(next);
  }, []);

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <header className="text-center">
        <h1 className="text-3xl font-bold text-gold sm:text-4xl">Rhythm Reading Lab</h1>
        <p className="mt-3 text-zinc-400">リズム譜を読んで、リズム力を鍛える</p>
        <p className="mt-1 text-xs text-zinc-600">
          全6レベル・各10問（合計60問）— 聴いたリズムを3つのリズム譜から選ぶ
        </p>
      </header>

      <section className="mt-10 grid gap-4 sm:grid-cols-2">
        {LEVELS.map((lv) => {
          const s = states[lv.level] ?? {
            status: "未着手" as ProgressStatus,
            best: 0,
            total: questionsByLevel(lv.level).length,
          };
          return (
            <Link
              key={lv.level}
              href={`/level/${lv.level}`}
              className="group flex items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 transition hover:border-gold/50 hover:bg-zinc-900/70"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-zinc-700 text-2xl text-gold">
                {lv.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold transition group-hover:text-gold">
                    {lv.title}
                  </h2>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                      BADGE_STYLE[s.status]
                    }`}
                  >
                    {s.status}
                  </span>
                </div>
                <p className="mt-1 truncate text-sm text-zinc-400">{lv.subtitle}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  全{s.total}問
                  {s.best > 0 && ` ・ ベスト ${s.best}/${s.total}`}
                </p>
              </div>
              <div className="text-zinc-600 transition group-hover:text-gold">→</div>
            </Link>
          );
        })}
      </section>

      <footer className="mt-12 text-center text-xs text-zinc-600">
        Directline Studio — Sensation Before Theory
      </footer>
    </main>
  );
}
