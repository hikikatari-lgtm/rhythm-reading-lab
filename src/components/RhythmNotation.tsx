"use client";

import type { RhythmEvent } from "@/lib/types";

// SVG renderer for a single-line (percussion-clef-style) rhythm staff.
// Draws noteheads, stems, flags/beams, dots, rests, ties, down/up strum arrows,
// beat numbers, barlines, and an optional red position cursor.
//
// Coordinate system: x grows left→right by beat; one quarter-note beat = BEAT_W.
// All ink uses `currentColor`, so callers tint a choice by setting text color.

interface Props {
  events: RhythmEvent[];
  /** Beats per bar (default 4). */
  beats?: number;
  /** Cursor position 0..1 across the bar; null/undefined hides it. */
  cursor?: number | null;
  className?: string;
}

const BEAT_W = 64;
const LEFT = 30;
const RIGHT = 30;
const LINE_Y = 52;
const STEM_TOP = 16;
const HEAD_PAD = 9;

const RX = 7;
const RY = 5.2;
const WHOLE_RX = 9.5;
const WHOLE_RY = 6;

export default function RhythmNotation({ events, beats = 4, cursor, className }: Props) {
  const staffWidth = beats * BEAT_W;
  const W = LEFT + staffWidth + RIGHT;
  const hasStroke = events.some((e) => e.stroke);
  const arrowTop = 64;
  const arrowBottom = 86;
  const beatNumY = hasStroke ? 104 : 76;
  const H = hasStroke ? 116 : 88;

  // x of a note's head, given its beat. Whole notes are centered in the bar.
  const headX = (ev: RhythmEvent) => {
    const eff = ev.dot ? ev.duration * 1.5 : ev.duration;
    if (eff >= 4) return LEFT + staffWidth / 2;
    return LEFT + ev.beat * BEAT_W + HEAD_PAD;
  };
  const stemX = (cx: number) => cx + RX - 0.9;

  // --- Beam grouping: maximal runs of eighth/sixteenth notes within one beat.
  const beamable = events.map(
    (e) => !e.rest && (e.duration === 0.5 || e.duration === 0.25)
  );
  const groupOf = new Array<number>(events.length).fill(-1);
  let gid = -1;
  for (let i = 0; i < events.length; i++) {
    if (!beamable[i]) continue;
    const p = i - 1;
    const cont =
      p >= 0 &&
      beamable[p] &&
      groupOf[p] !== -1 &&
      Math.floor(events[p].beat) === Math.floor(events[i].beat);
    groupOf[i] = cont ? groupOf[p] : ++gid;
  }
  const groups = new Map<number, number[]>();
  groupOf.forEach((g, i) => {
    if (g === -1) return;
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(i);
  });

  const els: React.ReactNode[] = [];

  // ---- Barlines + staff line -------------------------------------------------
  els.push(
    <line key="staff" x1={LEFT} y1={LINE_Y} x2={LEFT + staffWidth} y2={LINE_Y}
      stroke="currentColor" strokeWidth={1.4} opacity={0.55} />
  );
  for (const bx of [LEFT, LEFT + staffWidth]) {
    els.push(
      <line key={`bar${bx}`} x1={bx} y1={LINE_Y - 16} x2={bx} y2={LINE_Y + 16}
        stroke="currentColor" strokeWidth={2} opacity={0.7} />
    );
  }

  // ---- Beat numbers ----------------------------------------------------------
  for (let b = 0; b < beats; b++) {
    els.push(
      <text key={`bn${b}`} x={LEFT + b * BEAT_W + HEAD_PAD} y={beatNumY}
        fontSize={11} fill="currentColor" opacity={0.45} textAnchor="middle"
        fontFamily="ui-monospace, monospace">
        {b + 1}
      </text>
    );
  }

  // ---- Notes / rests ---------------------------------------------------------
  events.forEach((ev, i) => {
    const cx = headX(ev);
    if (ev.rest) {
      els.push(<g key={`r${i}`}>{renderRest(ev.duration, cx)}</g>);
      if (ev.dot) els.push(dot(cx + 9, i));
      return;
    }

    const hollow = ev.duration >= 2; // whole + half are open noteheads
    const isWhole = ev.duration >= 4;
    const rx = isWhole ? WHOLE_RX : RX;
    const ry = isWhole ? WHOLE_RY : RY;

    els.push(
      <ellipse key={`h${i}`} cx={cx} cy={LINE_Y} rx={rx} ry={ry}
        transform={`rotate(-18 ${cx} ${LINE_Y})`}
        fill={hollow ? "none" : "currentColor"}
        stroke="currentColor" strokeWidth={hollow ? 2.4 : 1} />
    );

    // Stem (everything except the whole note).
    if (!isWhole) {
      const sx = stemX(cx);
      els.push(
        <line key={`s${i}`} x1={sx} y1={LINE_Y - 1} x2={sx} y2={STEM_TOP}
          stroke="currentColor" strokeWidth={1.8} />
      );
      // Lone eighth/sixteenth gets flags; beamed ones are handled below.
      if (beamable[i] && groups.get(groupOf[i])!.length === 1) {
        els.push(flag(sx, STEM_TOP, 1, `f1${i}`));
        if (ev.duration === 0.25) els.push(flag(sx, STEM_TOP + 8, 2, `f2${i}`));
      }
    }

    if (ev.dot) els.push(dot(cx + rx + 5, i));

    // Strum arrow.
    if (ev.stroke) {
      els.push(arrow(cx, ev.stroke, arrowTop, arrowBottom, `a${i}`));
    }
  });

  // ---- Beams (groups of 2+) --------------------------------------------------
  groups.forEach((members, g) => {
    if (members.length < 2) return;
    const xs = members.map((i) => stemX(headX(events[i])));
    // Primary beam across the whole group.
    els.push(
      <line key={`pb${g}`} x1={xs[0]} y1={STEM_TOP} x2={xs[xs.length - 1]} y2={STEM_TOP}
        stroke="currentColor" strokeWidth={4} strokeLinecap="butt" />
    );
    // Secondary beam for sixteenths.
    members.forEach((idx, k) => {
      if (events[idx].duration !== 0.25) return;
      const right16 = k < members.length - 1 && events[members[k + 1]].duration === 0.25;
      const left16 = k > 0 && events[members[k - 1]].duration === 0.25;
      if (right16) {
        els.push(
          <line key={`sb${g}-${k}`} x1={xs[k]} y1={STEM_TOP + 6} x2={xs[k + 1]} y2={STEM_TOP + 6}
            stroke="currentColor" strokeWidth={4} strokeLinecap="butt" />
        );
      } else if (!left16) {
        // Isolated sixteenth inside a beam → short stub.
        const dir = k > 0 ? -1 : 1;
        els.push(
          <line key={`stub${g}-${k}`} x1={xs[k]} y1={STEM_TOP + 6} x2={xs[k] + dir * 11} y2={STEM_TOP + 6}
            stroke="currentColor" strokeWidth={4} strokeLinecap="butt" />
        );
      }
    });
  });

  // ---- Ties ------------------------------------------------------------------
  events.forEach((ev, i) => {
    if (!ev.tie || i + 1 >= events.length) return;
    const x1 = headX(ev);
    const x2 = headX(events[i + 1]);
    const mid = (x1 + x2) / 2;
    els.push(
      <path key={`tie${i}`} d={`M ${x1} ${LINE_Y + 8} Q ${mid} ${LINE_Y + 20} ${x2} ${LINE_Y + 8}`}
        fill="none" stroke="currentColor" strokeWidth={1.6} />
    );
  });

  // ---- Cursor (drawn last, on top) ------------------------------------------
  if (cursor != null) {
    const cxp = LEFT + Math.max(0, Math.min(1, cursor)) * staffWidth;
    els.push(
      <line key="cursor" x1={cxp} y1={STEM_TOP - 6} x2={cxp} y2={beatNumY - 6}
        stroke="#ef4444" strokeWidth={2} opacity={0.9} />
    );
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="xMidYMid meet"
      className={className} role="img" aria-label="リズム譜">
      {els}
    </svg>
  );
}

// ---- glyph helpers ----------------------------------------------------------

function dot(x: number, key: number | string) {
  return <circle key={`dot${key}`} cx={x} cy={LINE_Y} r={2.3} fill="currentColor" />;
}

function flag(sx: number, topY: number, _n: number, key: string) {
  // A single eighth-style flag hanging off the stem top.
  const d = `M ${sx} ${topY}
    C ${sx + 11} ${topY + 5}, ${sx + 13} ${topY + 14}, ${sx + 5} ${topY + 21}
    C ${sx + 12} ${topY + 13}, ${sx + 10} ${topY + 6}, ${sx} ${topY + 8} Z`;
  return <path key={key} d={d} fill="currentColor" />;
}

function arrow(cx: number, dir: "down" | "up", top: number, bottom: number, key: string) {
  if (dir === "down") {
    return (
      <g key={key} stroke="currentColor" strokeWidth={1.8} fill="currentColor">
        <line x1={cx} y1={top} x2={cx} y2={bottom - 4} />
        <path d={`M ${cx - 4} ${bottom - 7} L ${cx} ${bottom} L ${cx + 4} ${bottom - 7} Z`} />
      </g>
    );
  }
  return (
    <g key={key} stroke="currentColor" strokeWidth={1.8} fill="currentColor" opacity={0.65}>
      <line x1={cx} y1={bottom} x2={cx} y2={top + 4} />
      <path d={`M ${cx - 4} ${top + 7} L ${cx} ${top} L ${cx + 4} ${top + 7} Z`} />
    </g>
  );
}

function renderRest(duration: number, cx: number) {
  const c = "currentColor";
  if (duration >= 4) {
    // Whole rest: block hanging below the line.
    return <rect x={cx - 9} y={LINE_Y + 1} width={18} height={6} fill={c} opacity={0.85} />;
  }
  if (duration >= 2) {
    // Half rest: block sitting on the line.
    return <rect x={cx - 9} y={LINE_Y - 7} width={18} height={6} fill={c} opacity={0.85} />;
  }
  if (duration >= 1) {
    // Quarter rest: stylized zig-zag.
    return (
      <path
        d={`M ${cx - 4} ${LINE_Y - 14}
            L ${cx + 4} ${LINE_Y - 6}
            L ${cx - 3} ${LINE_Y + 1}
            L ${cx + 5} ${LINE_Y + 9}
            Q ${cx - 2} ${LINE_Y + 4} ${cx - 2} ${LINE_Y + 12}`}
        fill="none" stroke={c} strokeWidth={2.4} strokeLinejoin="round" opacity={0.9}
      />
    );
  }
  // Eighth (one flag) / sixteenth (two flags) rest: slanted stroke + dot(s).
  const dots = duration <= 0.25 ? 2 : 1;
  return (
    <g stroke={c} fill={c} opacity={0.9}>
      <line x1={cx + 4} y1={LINE_Y - 9} x2={cx - 4} y2={LINE_Y + 11} strokeWidth={2.2} />
      {Array.from({ length: dots }).map((_, k) => (
        <circle key={k} cx={cx + 1} cy={LINE_Y - 8 + k * 7} r={2.3} stroke="none" />
      ))}
    </g>
  );
}
