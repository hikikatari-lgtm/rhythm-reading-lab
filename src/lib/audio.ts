// Tone.js rhythm playback engine. Client-side only; synths are created
// lazily after the first user gesture to satisfy browser autoplay policies.
//
// One bar of 4/4 is scheduled on the shared Transport so the metronome and the
// rhythm hits stay in sync, and a red cursor can be animated by reading the
// Transport's elapsed seconds (see RhythmStaff / useTransportCursor).
import * as Tone from "tone";
import type { RhythmEvent } from "./types";

let started = false;

async function ensureStarted() {
  if (!started) {
    await Tone.start();
    started = true;
  }
}

// ---- Synths ----------------------------------------------------------------

let noteSynth: Tone.MembraneSynth | null = null;
let metroSynth: Tone.Synth | null = null;
let downNoise: Tone.NoiseSynth | null = null;
let upNoise: Tone.NoiseSynth | null = null;
let upFilter: Tone.Filter | null = null;
let downFilter: Tone.Filter | null = null;

function getSynths() {
  if (!noteSynth) {
    // Percussive "タン/タ" hit for Levels 1–2 (and as a fallback).
    noteSynth = new Tone.MembraneSynth({
      pitchDecay: 0.01,
      octaves: 4,
      envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 },
    }).toDestination();
    noteSynth.volume.value = -6;

    // Soft metronome click on each beat.
    metroSynth = new Tone.Synth({
      oscillator: { type: "triangle" },
      envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 },
    }).toDestination();
    metroSynth.volume.value = -20;

    // Guitar-strum-ish bursts for Level 3+: down = darker/louder, up = brighter/softer.
    downFilter = new Tone.Filter(2600, "lowpass").toDestination();
    downNoise = new Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: { attack: 0.001, decay: 0.12, sustain: 0, release: 0.05 },
    }).connect(downFilter);
    downNoise.volume.value = -4;

    upFilter = new Tone.Filter(1800, "highpass").toDestination();
    upNoise = new Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.04 },
    }).connect(upFilter);
    upNoise.volume.value = -11;
  }
  return { noteSynth: noteSynth!, metroSynth: metroSynth!, downNoise: downNoise!, upNoise: upNoise! };
}

// ---- Playback --------------------------------------------------------------

export interface PlayHandle {
  /** Absolute AudioContext time (seconds) at which playback starts. */
  startTime: number;
  /** Total length of the bar in seconds. */
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
  /** Called (best-effort, via Tone.Draw) when the bar finishes. */
  onEnd?: () => void;
}

/**
 * Schedule and play one bar of the given rhythm. Returns a handle whose
 * startTime / totalSeconds let the UI animate a position cursor.
 */
export async function playRhythm(
  events: RhythmEvent[],
  bpm: number,
  timeSignature: [number, number],
  opts: PlayOptions = {}
): Promise<PlayHandle> {
  await ensureStarted();
  const { noteSynth, metroSynth, downNoise, upNoise } = getSynths();

  const transport = Tone.getTransport();
  transport.stop();
  transport.cancel();
  transport.position = 0;
  transport.bpm.value = bpm;

  const spb = 60 / bpm; // seconds per quarter-note beat
  const beatsPerBar = timeSignature[0];
  const totalSeconds = beatsPerBar * spb;

  // Metronome on every beat (downbeat accented).
  if (opts.metronome) {
    for (let b = 0; b < beatsPerBar; b++) {
      transport.schedule((time) => {
        metroSynth.triggerAttackRelease(b === 0 ? "C6" : "G5", "32n", time);
      }, b * spb);
    }
  }

  // Rhythm hits. A note tied into from the previous event is held, not re-struck.
  events.forEach((ev, i) => {
    if (ev.rest) return;
    if (i > 0 && events[i - 1].tie) return;
    const at = ev.beat * spb;
    transport.schedule((time) => {
      if (ev.stroke === "down") {
        downNoise.triggerAttackRelease("8n", time);
        noteSynth.triggerAttackRelease("C2", "16n", time);
      } else if (ev.stroke === "up") {
        upNoise.triggerAttackRelease("16n", time);
      } else {
        // Higher pitch for shorter notes gives a "タン/タ/タカ" feel.
        const pitch = ev.duration >= 2 ? "C2" : ev.duration >= 1 ? "E2" : "A2";
        noteSynth.triggerAttackRelease(pitch, "16n", time);
      }
    }, at);
  });

  // End marker.
  transport.schedule((time) => {
    Tone.getDraw().schedule(() => opts.onEnd?.(), time);
    transport.stop(time);
  }, totalSeconds + 0.05);

  const startTime = Tone.now() + 0.12;
  transport.start(startTime);

  return {
    startTime,
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
