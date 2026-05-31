# Rhythm Reading Lab

リズム譜を読む力を鍛える3択クイズアプリ。聴いたリズムを、3つのリズム譜（SVG描画）から選ぶ。6レベル × 各10問＝合計60問。Directline Studio エコシステムの一員（ダークテーマ＋ゴールド `#d4af37`）。

## 技術スタック

- **Next.js 16** (App Router) + **TypeScript**
- **Tailwind CSS v3**（`tailwind.config.ts` に `background:#0a0a0a` / `gold:#d4af37`）
- **Tone.js**（リズム再生・メトロノーム・ストローク音）
- リズム譜は素の **SVG**（外部ライブラリなし）で描画

## ディレクトリ構成

```
src/
  app/
    layout.tsx              # ルート（lang=ja, Inter, メタ）
    page.tsx                # トップ：6レベルカード＋進捗バッジ
    level/[level]/page.tsx  # レベル選択 → RhythmQuiz を描画（useParams）
    globals.css             # ダークテーマ＋fadeIn
  components/
    RhythmNotation.tsx      # ★SVGリズム譜レンダラ（音符/休符/連桁/付点/タイ/↓↑/カーソル）
    RhythmQuiz.tsx          # クイズ本体（出題・採点・再生・カーソル・結果）
    PlayButton.tsx          # 再生/停止トグル
  lib/
    types.ts                # RhythmEvent / RhythmQuestion / LEVELS
    questions.ts            # ★全60問。seq() ビルダーでトークン列→RhythmEvent[]
    audio.ts                # Tone.js 再生エンジン（Transport スケジューリング）
    progress.ts             # localStorage 進捗（キー `rrl:progress:<level>`）
```

## データモデル（`src/lib/types.ts`）

`RhythmEvent { beat, duration, rest?, tie?, dot?, stroke? }`
- `duration`: 音価＝ 4=全, 2=2分, 1=4分, 0.5=8分, 0.25=16分（**付点は別フラグ** `dot`。実長は ×1.5）
- `beat`: 4分音符単位の拍位置（0, 0.5, 1, …）
- `stroke`: `"down" | "up"`（Level 3・6 で使用、譜の下に↓↑矢印）

`RhythmQuestion` は `choices: { rhythm }[]` と `correctIndex` を持ち、`rhythm` は `choices[correctIndex].rhythm` のミラー。

## 問題の追加・編集（`src/lib/questions.ts`）

`seq(tokens)` がトークン列を左から並べて `beat` を自動計算する。トークンは数値（音価）か `{ d, rest?, dot?, tie?, stroke? }`。定数 `W/H/Q/E/S`、`RQ`(4分休符)、`DH/DQ`(付点)、レベル別セル（`C16`, `CEE`, `A`, `B`, `D`, `U`, `X` など）を使う。
問題は `q(level, num, question, choices, correctIndex, explanation, songName?)` で生成し、`LEVEL1`…`LEVEL6` 配列に追記 → `QUESTIONS` に集約。**各リズムの実長合計は4拍（1小節）に揃える。**

## レベル構成

1. 全音符・2分音符（基本の拍感）
2. 4分音符と4分休符
3. 8分音符＋ダウン↓アップ↑
4. 16分音符パターン（1拍セルの組み合わせ）
5. シンコペーション・タイ・付点
6. 実際の曲のストロークパターン（8分グリッド、`songName` を解答後に表示）

## 音再生（`src/lib/audio.ts`）

`playRhythm(events, bpm, [4,4], { metronome, onEnd })` が共有 `Tone.getTransport()` に各音と拍クリックをスケジュール。戻り値 `{ startTime, totalSeconds, stop }` を使い、UI 側（RhythmQuiz）が `audioNow()` との差分を rAF で読んで赤いカーソルを動かす。
- 通常音＝`MembraneSynth`（音価で音程を変えて「タン/タ/タカ」感）
- ダウン＝`NoiseSynth`(lowpass)＋低音、アップ＝`NoiseSynth`(highpass)・小音量
- メトロノーム＝`Synth`(triangle, -20dB)、頭拍だけ高め
- **タイ**：直前イベントが `tie` の音は打ち直さず保持（再発音しない）

SSR 対策：`import * as Tone` をトップで使うが、シンセは初回ユーザー操作後に遅延生成し `Tone.start()` を待つ（instrument-ear-training と同方式）。

## SVG リズム譜（`src/components/RhythmNotation.tsx`）

1線譜。`x = LEFT + beat*BEAT_W`。全音符は小節中央。塗り/中空で音価を表現し、8分・16分は**同一拍内で連桁**（`Math.floor(beat)` でグループ化、16分は2本目のビーム／孤立16分はスタブ）。付点・タイ・↓↑矢印・拍番号・小節線・赤カーソルを描画。インクは `currentColor` なので、選択肢の正誤色はラッパの文字色で着色する。`events={[]}` を渡すと空の拍ルーラー（カーソル用）になる。

## 開発・デプロイ

```bash
npm run dev      # 開発サーバ（このプロジェクトのポートは launch.json 参照）
npm run build    # 本番ビルド
npx vercel --prod --yes   # Vercel（directline-studio）へ本番デプロイ
```

GitHub: `hikikatari-lgtm/rhythm-reading-lab` / Vercel team: `directline-studio`。
**Next は 16 系を使う**（15.5.4 は CVE で Vercel がデプロイ拒否するため）。
