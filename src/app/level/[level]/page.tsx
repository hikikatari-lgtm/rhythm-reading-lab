"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { LEVELS } from "@/lib/types";
import { questionsByLevel } from "@/lib/questions";
import RhythmQuiz from "@/components/RhythmQuiz";

export default function LevelPage() {
  const params = useParams<{ level: string }>();
  const level = Number(params.level);
  const meta = LEVELS.find((l) => l.level === level);
  const questions = questionsByLevel(level);

  if (!meta || questions.length === 0) {
    return (
      <main className="mx-auto max-w-md px-4 py-20 text-center">
        <p className="text-zinc-400">このレベルは見つかりませんでした。</p>
        <Link href="/" className="mt-4 inline-block text-gold hover:underline">
          ← トップへ戻る
        </Link>
      </main>
    );
  }

  return (
    <RhythmQuiz
      level={level}
      title={meta.title}
      subtitle={meta.subtitle}
      questions={questions}
    />
  );
}
