// Core data model for rhythm questions.

/** A single notated event on a one-line rhythm staff. */
export interface RhythmEvent {
  /** Beat position in quarter-note units (0, 0.5, 1, 1.5, 2, ...). */
  beat: number;
  /** Base note value: 4=whole, 2=half, 1=quarter, 0.5=eighth, 0.25=sixteenth. */
  duration: number;
  /** True if this is a rest rather than a sounding note. */
  rest?: boolean;
  /** True if this note is tied into the following note. */
  tie?: boolean;
  /** True if dotted (effective length = duration * 1.5). */
  dot?: boolean;
  /** Strum direction, used from Level 3 on. */
  stroke?: "down" | "up";
}

export interface RhythmChoice {
  rhythm: RhythmEvent[];
}

export interface RhythmQuestion {
  id: string;
  level: number;
  question: string;
  /** The correct rhythm (mirror of choices[correctIndex].rhythm). */
  rhythm: RhythmEvent[];
  bpm: number;
  timeSignature: [number, number];
  choices: RhythmChoice[];
  correctIndex: number;
  explanation: string;
  /** Shown after answering on Level 6 (real-song patterns). */
  songName?: string;
}

export interface LevelMeta {
  level: number;
  title: string;
  subtitle: string;
  icon: string;
}

export const LEVELS: LevelMeta[] = [
  { level: 1, title: "Level 1", subtitle: "全音符・2分音符（基本の拍感）", icon: "𝅝" },
  { level: 2, title: "Level 2", subtitle: "4分音符と休符", icon: "♩" },
  { level: 3, title: "Level 3", subtitle: "8分音符とダウン↓アップ↑", icon: "♫" },
  { level: 4, title: "Level 4", subtitle: "16分音符パターン", icon: "♬" },
  { level: 5, title: "Level 5", subtitle: "シンコペーション・タイ・付点", icon: "♩." },
  { level: 6, title: "Level 6", subtitle: "実際の曲のストロークパターン", icon: "🎸" },
];
