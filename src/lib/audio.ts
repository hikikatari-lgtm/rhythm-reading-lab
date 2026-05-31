// Tone.js rhythm playback engine. Client-side only; synths are created
// lazily after the first user gesture to satisfy browser autoplay policies.
//
// Playback layout: a 4-beat metronome count-in, then the one-bar pattern
// repeated REPEATS times (so the bar is heard twice). Everything is scheduled
// on the shared Transport; the red cursor is animated by reading the elapsed
// time and is parked at the start during the count-in (see RhythmQuiz).
import * as Tone from "tone";
import type { RhythmEvent } from "./types";

let started = false;

async function ensureStarted() {
  if (!started) {
    await Tone.start();
    started = true;
  }
}

const REPEATS = 2;

// ---- Synths ----------------------------------------------------------------

let cowbell: Tone.MetalSynth | null = null;
let metroSynth: Tone.Synth | null = null;

function getSynths() {
  if (!cowbell) {
    // Prominent cowbell-style hit for every rhythm note (down/up undistinguished).
    cowbell = new Tone.MetalSynth({
      envelope: { attack: 0.001, decay: 0.1, release: 0.05 },
      harmonicity: 0.1,
      modulationIndex: 8,
      resonance: 2000,
      octaves: 0.5,
    }).toDestination();
    cowbell.volume.value = -14;

    // Soft metronome / count-in click.
    metroSynth = new Tone.Synth({
      oscillator: { type: "triangle" },
      envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 },
    }).toDestination();
    metroSynth.volume.value = -16;
  }
  return { cowbell: cowbell!, metroSynth: metroSynth! };
}

// ---- Playback --------------------------------------------------------------

export interface PlayHandle {
  /** Absolute AudioContext time (seconds) at which the count-in starts. */
  startTime: number;
  /** Length of the count-in (seconds) before the pattern begins. */
  countInSeconds: number;
  /** Length of one bar (seconds). */
  barSeconds: number;
  /** How many times the pattern repeats. */
  repeats: number;
  /** Total length including count-in (seconds). */
  totalSeconds: number;
  /** Stop immediately and clear the transport. */
  stop: () => void;
}

/** Current AudioContext time — used to drive the cursor animation. */
export function audioNow(): number {
  return Tone.now();
}

export interface PlayOptions {
  metronome?: boolean;
  /** Called (best-effort, via Tone.Draw) when playback finishes. */
  onEnd?: () => void;
}

/**
 * Schedule and play: a 4-beat count-in, then the one-bar pattern twice.
 * Returns a handle whose timing fields let the UI animate the position cursor.
 */
export async function playRhythm(
  events: RhythmEvent[],
  bpm: number,
  timeSignature: [number, number],
  opts: PlayOptions = {}
): Promise<PlayHandle> {
  await ensureStarted();
  const { cowbell, metroSynth } = getSynths();

  const transport = Tone.getTransport();
  transport.stop();
  transport.cancel();
  transport.position = 0;
  transport.bpm.value = bpm;

  const spb = 60 / bpm; // seconds per quarter-note beat
  const beatsPerBar = timeSignature[0];
  const barSeconds = beatsPerBar * spb;
  const countInSeconds = beatsPerBar * spb;
  const totalSeconds = countInSeconds + REPEATS * barSeconds;
  const metronome = opts.metronome ?? true;

  const click = (offset: number, accent: boolean) => {
    transport.schedule((time) => {
      metroSynth.triggerAttackRelease(accent ? "C6" : "G5", "32n", time);
    }, offset);
  };

  // Count-in: 4 even clicks.
  for (let b = 0; b < beatsPerBar; b++) click(b * spb, b === 0);

  // Pattern, repeated.
  for (let r = 0; r < REPEATS; r++) {
    const barStart = countInSeconds + r * barSeconds;
    if (metronome) {
      for (let b = 0; b < beatsPerBar; b++) click(barStart + b * spb, b === 0);
    }
    events.forEach((ev, i) => {
      if (ev.rest) return;
      if (i > 0 && events[i - 1].tie) return; // tied-into note is held, not re-struck
      transport.schedule((time) => {
        cowbell.triggerAttackRelease("A5", "16n", time);
      }, barStart + ev.beat * spb);
    });
  }

  // End marker.
  transport.schedule((time) => {
    Tone.getDraw().schedule(() => opts.onEnd?.(), time);
    transport.stop(time);
  }, totalSeconds + 0.05);

  const startTime = Tone.now() + 0.12;
  transport.start(startTime);

  return {
    startTime,
    countInSeconds,
    barSeconds,
    repeats: REPEATS,
    totalSeconds,
    stop: () => {
      transport.stop();
      transport.cancel();
      transport.position = 0;
    },
  };
}

export function stopAll() {
  if (started) {
    const transport = Tone.getTransport();
    transport.stop();
    transport.cancel();
    transport.position = 0;
  }
}
