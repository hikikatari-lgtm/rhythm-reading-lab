// Per-level progress persisted to localStorage.

export type ProgressStatus = "未着手" | "進行中" | "完了";

export interface LevelProgress {
  total: number;
  finished: boolean;
  bestScore: number;
}

const KEY_PREFIX = "rrl:progress:";

export function loadProgress(level: number, total: number): LevelProgress {
  if (typeof window === "undefined") {
    return { total, finished: false, bestScore: 0 };
  }
  try {
    const raw = window.localStorage.getItem(KEY_PREFIX + level);
    if (!raw) return { total, finished: false, bestScore: 0 };
    const parsed = JSON.parse(raw) as LevelProgress;
    return { ...parsed, total };
  } catch {
    return { total, finished: false, bestScore: 0 };
  }
}

export function saveProgress(level: number, progress: LevelProgress) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY_PREFIX + level, JSON.stringify(progress));
  } catch {
    // ignore quota / privacy-mode errors
  }
}

export function statusOf(p: LevelProgress): ProgressStatus {
  if (p.finished || p.bestScore >= p.total) return "完了";
  if (p.bestScore > 0) return "進行中";
  return "未着手";
}
