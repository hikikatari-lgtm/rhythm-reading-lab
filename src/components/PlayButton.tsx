"use client";

interface PlayButtonProps {
  isPlaying: boolean;
  onClick: () => void;
  label?: string;
}

export default function PlayButton({ isPlaying, onClick, label }: PlayButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-full px-7 py-3 text-lg font-bold transition active:scale-95 ${
        isPlaying
          ? "bg-zinc-700 text-zinc-100 hover:bg-zinc-600"
          : "bg-gold text-black hover:brightness-110"
      }`}
    >
      {isPlaying ? "⏹ 停止" : `🔊 ${label ?? "再生"}`}
    </button>
  );
}
