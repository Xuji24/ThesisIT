# ThesisIT — Voice Feature Build Context

> A complete reference for replicating the **Mock Defense Voice Mode** in ThesisIT.
> Covers the exact UI structure, element positions, animations, voice pipeline, the VoiceOrb,
> and every tool that makes the feature work smoothly in real browsers.

---

## 1. What the feature is

The **Mock Defense Voice Mode** turns a thesis oral-defense simulator into a hands-free,
spoken conversation. Instead of typing:

1. The AI panelist **speaks** its question aloud through the browser (Text-to-Speech).
2. An animated glowing orb pulses in real time, reacting to the audio waveform.
3. The student taps the orb (or a button) and **answers by voice** (Speech-to-Text).
4. A **karaoke subtitle** box shows the AI's spoken words or the student's live transcript.
5. The student can **play back** their own recording, **re-record**, or **send** the transcribed answer.

The feature is a **progressive enhancement layer** on top of the existing text chat session — the
same LLM conversation loop drives both modes. Voice mode adds STT input, TTS output, and a
visual orb stage.

---

## 2. Tools used

| Concern | Tool / API | Notes |
|---|---|---|
| Framework | **Next.js 14 (App Router)** | `app/` for routes, `src/` for components/hooks |
| Language | **TypeScript** | Strict mode everywhere |
| Rendering | **React 18** — client components only | SSR disabled via `dynamic(..., { ssr: false })` for all voice components to avoid hydration mismatches with Web APIs |
| Speech-to-Text | **Web Speech API** — `SpeechRecognition` / `webkitSpeechRecognition` | Browser-native, zero cost, no SDK |
| Audio recording | **MediaRecorder API** + `getUserMedia` | Records a playable audio blob alongside STT |
| Audio analysis (waveform) | **Web Audio API** — `AudioContext` + `AnalyserNode` + FFT | Drives real-time orb animation |
| Text-to-Speech (primary) | **ElevenLabs API** — `eleven_turbo_v2` | Activated by `ELEVENLABS_API_KEY` env var |
| Text-to-Speech (secondary) | **Google Cloud TTS** — `en-US-Neural2-F`, SSML | Activated by `GOOGLE_TTS_API_KEY` env var |
| Text-to-Speech (fallback) | **Browser `speechSynthesis`** | Always available, zero setup required |
| TTS proxy route | **Next.js API Route** (`app/api/tts/route.ts`) | Keeps API keys server-side; returns base64 audio |
| Orb rendering | **Canvas 2D API** + inline **4-D simplex noise** | No external graphics library |
| Styling | **Tailwind CSS v4** + custom `@keyframes` | `app/globals.css` |
| Icons | **`lucide-react`** | `Mic`, `MicOff`, `VolumeX`, `Play`, `Pause`, `RotateCcw`, `Download`, `BarChart2`, `MessageSquare` |
| Fonts | **Inter** (body) + **Outfit** (headings) via `next/font` | Defined in `@theme` |
| Persistence | **`localStorage`** via a custom `useLocalStorage` hook | Session messages, mode, difficulty survive page refresh |
| State machine | **`useMockDefense`** custom hook | Owns entire session lifecycle |

---

## 3. Where the voice feature lives in the UI (full hierarchy)

The voice orb and controls are **nested 5 levels deep** inside the overall app shell.
Understanding each layer is critical to replicating the layout correctly.

```
┌──────────────────────────────────────────────────────────────────────┐
│ <body>  bg-slate-50  — app background                                │
│                                                                      │
│  Decorative blobs (absolute, pointer-events-none):                   │
│   • top-right  emerald-200/30 blur-3xl rounded-full                  │
│   • bottom-left teal-200/30 blur-3xl rounded-full                    │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ <header>  sticky top-0 z-20  — glassmorphism navbar           │  │
│  │   .glass (bg-white/70 backdrop-blur-xl border border-white/20) │  │
│  │   Row 1: ThesisIT logo | filename pill | New PDF button        │  │
│  │   Row 2: Tab bar (Mock Defense / Strengths / Chat / Panelist)  │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ <main>  flex-1 flex flex-col  p-6 lg:p-8  max-w-7xl mx-auto   │  │
│  │                                                                │  │
│  │  ┌──────────────────────────────────────────────────────────┐  │  │
│  │  │ .glass-card  (bg-white/80 backdrop-blur-xl rounded-3xl   │  │  │
│  │  │  shadow-xl .tab-enter hover:shadow-emerald-200/40)       │  │  │
│  │  │                                                          │  │  │
│  │  │  ← this is the white rounded card that holds all tabs →  │  │  │
│  │  │                                                          │  │  │
│  │  │  [When "Mock Defense" tab is active]                     │  │  │
│  │  │  ┌────────────────────────────────────────────────────┐  │  │  │
│  │  │  │ <MockDefense>  flex-1 flex flex-col w-full         │  │  │  │
│  │  │  │                                                    │  │  │  │
│  │  │  │  ── PHASE 1: Setup (before session starts) ──      │  │  │  │
│  │  │  │  <MockDefenseSetup>  — mode/difficulty picker      │  │  │  │
│  │  │  │                                                    │  │  │  │
│  │  │  │  ── PHASE 2: Active session ──                     │  │  │  │
│  │  │  │  <MockDefenseSessionHeader>  shrink-0 border-b     │  │  │  │
│  │  │  │  <MockDefenseVoiceView>   ← THE ORB LIVES HERE     │  │  │  │
│  │  │  │  <MockDefenseVoiceInput>  shrink-0 border-t        │  │  │  │
│  │  │  │                                                    │  │  │  │
│  │  │  └────────────────────────────────────────────────────┘  │  │  │
│  │  └──────────────────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  <MockDefenseCriteriaRail>  (React Portal → fixed to <body>)         │
│   • Tab button: fixed right-0 top-1/2 -translate-y-1/2              │
│   • Panel: fixed z-70 top-20 bottom-20 right-14 w-[min(20rem,...)]  │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 4. Setup screen UI — `MockDefenseSetup.tsx`

Rendered when the session has not yet started. It fills the glass card and has two zones:

### Scrollable body (center-aligned, padded)
```
h2: "Mock Defense Session"   — text-2xl font-semibold text-neutral-900
p:  subtitle description      — text-sm text-neutral-500 max-w-sm

[Select Difficulty]   — 3-column grid
  ┌──────────┐  ┌──────────┐  ┌───────────────┐
  │ Standard │  │Technical │  │ Terror Panel  │   ← rounded-xl buttons
  └──────────┘  └──────────┘  └───────────────┘
  Active = bg-emerald-600 text-white shadow-md shadow-emerald-200
  Inactive = outline, hover:border-emerald-300 hover:text-emerald-600
  Desc text below: text-xs text-neutral-400

[Question Limit]   — 5-column grid
  ┌───┐ ┌────┐ ┌────┐ ┌────┐ ┌───┐
  │ 5 │ │ 10 │ │ 15 │ │ 20 │ │ ∞ │   ← same style as difficulty
  └───┘ └────┘ └────┘ └────┘ └───┘

[Session Mode]   — 2-column card picker
  ┌──────────────────────────┐  ┌──────────────────────────┐
  │  💬 [MessageSquare icon] │  │  🎤 [Mic icon]            │
  │  Chat                    │  │  Voice                   │
  │  "Type your answers"     │  │  "Speak your answers"    │
  └──────────────────────────┘  └──────────────────────────┘
  Active card: border-2 border-emerald-500 bg-emerald-50 shadow-md
  Hover: border-emerald-300 bg-emerald-50/40
```

### Pinned footer (shrink-0, border-t, bg-white/90 backdrop-blur-sm)
```
┌───────────────────────────────────────────────┐
│      Start Voice Session  (or Chat Session)   │   ← full-width, rounded-xl
│      bg-emerald-600 hover:bg-emerald-700       │
└───────────────────────────────────────────────┘
```
When loading: spinner icon + "Starting session…" text inline.

---

## 5. Session header UI — `MockDefenseSessionHeader.tsx`

A thin `shrink-0` strip directly above the main content area.
`px-6 lg:px-8 py-3 border-b border-neutral-100 flex items-center gap-3 flex-wrap`

Left side (inline metadata):
```
Difficulty: Standard  │  Q: 3/10  │  [🎤 Voice] pill  │  [ElevenLabs] pill
```
- Difficulty + Q counter: `text-xs text-neutral-500`, count goes `text-amber-600` when complete.
- Mode badge: `bg-neutral-100 text-neutral-500 rounded-full px-2.5 py-0.5 text-xs`
- TTS provider pill (voice mode only, only while `synth.provider` is set):
  `bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px]`
  Shows `ElevenLabs`, `Google TTS`, or `Browser TTS` — tells the user which engine is speaking.

Voice-mode-only controls:
```
[▶ Replay]   [≡ Transcript]
```
- `Replay` button: replays the last AI question through TTS. Hidden while loading.
- `Transcript` toggle: switches `VoiceView` from orb to text chat history.
  Active state: `bg-emerald-50 text-emerald-700 border-emerald-200`.

Right side:
```
[Transcript | Evaluation]  ← tab toggle, visible after eval report exists
                 [End & Evaluate]   [New Session]   [⬇ Save]
```
- `End & Evaluate`: `variant="outline" size="sm" rounded-full`. Shows spinner while evaluating.
- `New Session`: `variant="ghost" text-neutral-400 underline underline-offset-2`. Resets everything.
- `Save`: icon + "Save" text, `text-xs text-neutral-500`.

---

## 6. Voice stage UI — `MockDefenseVoiceView.tsx`

This is the **main body** of the voice session. It fills all available vertical space between the
header and the input bar (`flex-1 min-h-0 overflow-y-auto`).

### Layout (column, centered, max-w-lg mx-auto)
```
┌──────────────────────────────────────────────┐
│                                              │
│              [ V O I C E  O R B ]            │  ← canvas, centered
│             (200–380 px, responsive)         │
│                                              │
│   "Tap orb or Start below to speak"          │  ← status line (conditional)
│   or  ● Processing…  (while loading)         │
│                                              │
│  ┌──────────────────────────────────────┐    │
│  │  transcript / subtitle box           │    │  ← min-h-[88px] max-h-[112px]
│  │  rounded-xl border-emerald-100/80    │    │
│  │  bg-emerald-50/40                    │    │
│  └──────────────────────────────────────┘    │
│                                              │
└──────────────────────────────────────────────┘
```

**Orb sizing** is managed by a `ResizeObserver` on the container div. Each frame it reads
`clientHeight` and `clientWidth`, subtracts `LAYOUT_RESERVED_PX = 190` (for the subtitle box,
status line, gaps, and padding), and clamps the result between `VOICE_ORB_SIZE_MIN = 200` and
`VOICE_ORB_SIZE_MAX = 380`. The canvas is rendered as a CSS `size × size` block.

**The orb is a tap target.** When it is the user's turn (`!loading && !aiIsSpeaking &&
!hasRecording`), the wrapping div gets `role="button"`, `tabIndex={0}`, and an `onClick` +
`onKeyDown` handler for `Enter`/`Space`. Cursor is `cursor-pointer`; during AI turn it is
`cursor-default`; during loading it is `cursor-wait`.

**Subtitle/transcript box** shows one of five states in priority order:
1. **Loading** → `.thinking-dots` animation (three `<span>` dots, `text-sm text-neutral-400`).
2. **AI speaking** (`synth.spokenText`) → AI words in `text-neutral-700`, animated karaoke.
3. **User transcript** (`speech.transcript`) → user words in `text-emerald-700`, animated karaoke.
4. **Mic active but no words yet** → `"Listening…"` in `text-[11px] uppercase text-emerald-600 animate-pulse`.
5. **Idle** → `"Transcript will appear here"` in `text-[11px] text-neutral-300 select-none`.

---

## 7. Voice input bar — `MockDefenseVoiceInput.tsx`

A `shrink-0 border-t px-5 py-4 bg-white border-neutral-100` strip pinned to the bottom of the card.
It is a **phase-driven button bar** — exactly one state is shown at a time:

```
Phase 0 — browser not supported
  "Voice input is not supported in this browser. Switch to Chat mode."
  text-xs text-neutral-400 text-center

Phase 1 — AI is speaking
  ┌──────────────────────────────┐
  │  [VolumeX icon]  Skip        │  ← rounded-full border-emerald-200 text-emerald-700
  └──────────────────────────────┘

Phase 2 — mic is active (isListening)
  ┌───────────────────────────────────┐
  │  [MicOff icon]  Stop Recording   │  ← bg-emerald-600 text-white rounded-full shadow-md
  └───────────────────────────────────┘

Phase 3 — recording finished (hasRecording)
  ┌──────────────┐  ┌─────────────┐  ┌──────────────────────┐
  │ ▶ Play Back  │  │ ↺ Re-record │  │  Send Answer  →      │
  └──────────────┘  └─────────────┘  └──────────────────────┘
  Play Back: outline, turns bg-neutral-900 text-white when playing
  Re-record: border-emerald-200 text-emerald-700 hover:bg-emerald-50
  Send Answer: bg-emerald-600 text-white rounded-full shadow-emerald-200/50
               disabled when loading OR transcript is empty

Phase 4 — idle (waiting for user to start)
  ┌─────────────────────────────────┐
  │  [Mic icon]  Start Speaking     │  ← bg-emerald-600 text-white rounded-full
  └─────────────────────────────────┘
  "Or tap the orb above"   ← text-[11px] text-emerald-600/70
```

A hidden `<audio>` element (keyed on `recorder.audioURL`) handles playback of the user's own
recording. It fires `onEnded` to flip the `isPlayingBack` state back to false.

---

## 8. The VoiceOrb — `src/components/VoiceOrb.tsx`

A `<canvas>` component. Background is transparent — the glass-card white shows through.

### Geometry algorithm
- **52 latitude rings** (φ from north to south pole).
- Each ring has `max(1, round(DOT_DENSITY × 2π × sin φ))` dots — proportional to ring circumference,
  so equatorial rings are dense and polar rings taper naturally.
- Each ring is **staggered** by `ring_index × 0.31 rad`, preventing dots from lining up
  vertically across rings → the interlocked "halftone mesh" look.
- Dots are placed on a unit sphere, then **displaced radially** by 4-D simplex noise.

### Simplex noise
A fully inline Gustavson 4-D simplex noise implementation — no npm package. The 4th dimension
is `time × 0.4`, which prevents purely translational scrolling and creates organic morphing.
```
radius_displacement = max(0.88, 1 + smoothAmp × noise4(nx×1.8 + t, ny×1.8, nz×1.8, t×0.4))
```
The `max(0.88, ...)` clamp ensures the sphere never fully collapses.

### Idle vs active animation
```
IDLE_NOISE_AMP   = 0.055   → orb ALWAYS breathes, never fully still
ACTIVE_NOISE_AMP = 0.32    → max morph amplitude while speaking
IDLE_SPEED       = 0.006   → noise time advance per frame (idle)
ACTIVE_SPEED     = 0.022   → faster shimmer while speaking
```

### Shading (dual light source)
```
L1 = norm([-0.45,  0.75, 0.55])   — primary: top-left → diagonal bright crease
L2 = norm([ 0.72,  0.12, 0.38])   — secondary: right → fills shadow side
brightness = min(1, AMBIENT(0.12) + dot(N, L1)×0.72 + dot(N, L2)×0.26)
```
Dot color is `#22C55E` (Tailwind `emerald-500`). Shadow color = 10% of the lit color. Dot size and
alpha both scale with `depth = (nz + 1) / 2`. Dots are **depth-sorted** back-to-front (painter's
algorithm) each frame for correct overlap.

### Audio reactivity via FFT
When an `AnalyserNode` is passed (from TTS playback or from the mic recorder):
```
fftSize = 512  →  frequencyBinCount = 256  (~86 Hz/bin at 44100 Hz sample rate)

rawBass   = bins  2–10  (low voice fundamentals)
rawMid    = bins 11–40  (main speech range)
rawTreble = bins 41–100 (consonants, sibilance)
```
Each band uses **asymmetric smoothing** (fast attack, slow release) for a punchy, responsive feel:
```
smoothBand += (raw - smooth) × (raw > smooth ? fastFactor : slowFactor)
```
Band energies drive three orb properties simultaneously:
- **mid** → morph amplitude (the main shape-shifting).
- **bass** → sphere-wide radius pulse (`radiusScale = 1 + smoothBass × 0.10`).
- **treble** → noise advancement speed (shimmer).

When `isLoading`, a slow gentle sinusoidal pulse plays: `IDLE_NOISE_AMP + 0.025 × |sin(t × 1.2)|`.

The `analyserNode` prop switches dynamically so the orb reacts to whichever audio source is active:
```tsx
analyserNode={aiIsSpeaking
  ? (synth.analyserNode ?? recorder.analyserNode)
  : recorder.analyserNode}
```

### Imperative handle
`VoiceOrb` exposes `setAmplitude(v: number)` via `useImperativeHandle` for external amplitude
injection (e.g. from a waveform source that bypasses the FFT path).

---

## 9. Animations catalogue

All CSS animations are defined in `app/globals.css`.

### `lyric-word` — karaoke subtitle
```css
@keyframes lyric-word {
  from { opacity: 0; transform: translateY(5px); }
  to   { opacity: 1; transform: translateY(0);   }
}
.lyric-word {
  display: inline-block;
  opacity: 0;
  animation: lyric-word 0.35s ease forwards;
}
```
Applied to each `<span>` word in the subtitle box. Words are split on whitespace; each gets an
`animationDelay` of `index × 0.05s` (AI text) or `index × 0.04s` (user transcript), creating the
rolling word-by-word fade-up effect. The `key={synth.spokenText}` on the wrapping `<p>` forces
React to remount the element on each new sentence, restarting the animation.

### `thinking-dots` — AI processing indicator
```css
@keyframes pulse-soft {
  0%, 100% { opacity: 0.5; }
  50%       { opacity: 1; transform: scale(1.05); }
}
.thinking-dots span { animation: pulse-soft 1.4s ease-in-out infinite; }
.thinking-dots span:nth-child(2) { animation-delay: 0.2s; }
.thinking-dots span:nth-child(3) { animation-delay: 0.4s; }
```
Three `<span>` dots staggered by 0.2 s each. Shows in the subtitle box and in the chat transcript
while the LLM is streaming.

### `tab-enter` — glass card entrance
```css
@keyframes fadeSlide {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0);    }
}
.tab-enter { animation: fadeSlide 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
```
Fires every time the active tab changes. Makes the whole glass card slide up from slightly below.

### `shimmer` — skeleton loading state
```css
@keyframes shimmer {
  from { background-position: -800px 0; }
  to   { background-position:  800px 0; }
}
.skeleton {
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 800px 100%;
  animation: shimmer 2s infinite linear;
}
```
Used for the `TabFallback` placeholder while a tab's dynamic import is loading.

### `progress-bar` — indeterminate progress sweep
```css
@keyframes progress-sweep {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(300%); }
}
.progress-bar { animation: progress-sweep 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
```

### Canvas orb animation
Runs in a `requestAnimationFrame` loop started in a `useEffect`. The loop:
1. Reads the latest FFT data from the `AnalyserNode` (if present).
2. Smooths the band energies.
3. Advances `timeRef.current` by `smoothSpd`.
4. Rebuilds and depth-sorts the full dot list each frame (~1600–1800 dots at 52 rings).
5. Draws all dots via `ctx.arc` + `ctx.fill`.
6. No `clearRect` batching tricks — the full clear + redraw each frame is intentional for the
   transparent background to show through correctly.

The loop is cancelled on unmount via the `useEffect` cleanup return.

### Inline "listening" pulse
```tsx
<p className="... animate-pulse">Listening…</p>
```
Uses Tailwind's built-in `animate-pulse` (opacity 1 → 0.5 → 1 at 2 s).

### Pinging dot (processing indicator in header)
```tsx
<span className="animate-ping absolute ...bg-emerald-400 opacity-75" />
<span className="relative ...bg-emerald-500" />
```
Concentric circle ping — a solid dot with an expanding transparent ring behind it. Tailwind
`animate-ping` scales the outer ring from 1 to 2 while fading out.

---

## 10. Glass-card UI system

The overall app shell uses a glassmorphism design system. These utilities are defined in
`globals.css` and applied across the feature:

```css
/* Sticky navbar */
.glass {
  @apply bg-white/70 backdrop-blur-xl border border-white/20 shadow-sm;
}

/* The main content card (wraps all tabs) */
.glass-card {
  @apply bg-white/80 backdrop-blur-xl border border-white/50
         shadow-xl shadow-slate-200/50 rounded-2xl;
}
```

The glass-card also gets:
- `hover:shadow-2xl hover:shadow-emerald-200/40 hover:border-emerald-100` — subtle emerald glow on hover.
- `transition-all duration-500` — smooth shadow/border transitions.
- `tab-enter` animation class — slides in on tab switch.

Background decorative blobs (from `Dashboard.tsx`, positioned behind everything):
```
• top-right:    w-[50%] h-[50%] bg-emerald-200/30 blur-3xl rounded-full
• bottom-left:  w-[40%] h-[40%] bg-teal-200/30   blur-3xl rounded-full
```

The brand scrollbar (`.scrollbar-brand`) used on the voice view and criteria rail:
- 6 px wide, `thin` scrollbar-width.
- Thumb: `linear-gradient(emerald-300/70 → emerald-500/85)`, pill shape.
- Track: `emerald-50/65`.
- Applied to `MockDefenseVoiceView`, `MockDefenseCriteriaRail`, and `MockDefenseSetup`.

---

## 11. TTS provider waterfall — full detail

### Server route: `app/api/tts/route.ts`

`export const maxDuration = 30` (Vercel function timeout).

**Pre-processing — `stripMarkdown(text)`**
Removes all Markdown before sending to any TTS engine so the engine doesn't speak out
`"asterisk asterisk"` or `"hash heading"`:
```
**bold** → bold   *italic* → italic   __under__ → under
# Heading → Heading   - bullet → bullet   [link](url) → link   `code` → (removed)
```

**Provider 1 — ElevenLabs** (if `ELEVENLABS_API_KEY` is set)
```
POST https://api.elevenlabs.io/v1/text-to-speech/{voiceId}
model_id: "eleven_turbo_v2"
voice_settings: { stability: 0.55, similarity_boost: 0.75, style: 0.20, use_speaker_boost: true }
Default voice: 21m00Tcm4TlvDq8ikWAM  (Rachel — warm professional female)
Override via: ELEVENLABS_VOICE_ID env var
```
Returns `{ audioBase64, mimeType: "audio/mpeg", provider: "elevenlabs" }`.

**Provider 2 — Google Cloud TTS** (if `GOOGLE_TTS_API_KEY` is set)

Text is wrapped in SSML via `toSSML(text)` for natural pacing:
```
. ! ?  → <break time="450ms"/>
, ; :  → <break time="200ms"/>
\n     → <break time="600ms"/>
```
```
POST https://texttospeech.googleapis.com/v1/text:synthesize
voice: { languageCode: "en-US", name: "en-US-Neural2-F" }  (override via GOOGLE_TTS_VOICE)
audioConfig: { audioEncoding: "MP3", speakingRate: 0.92, pitch: 0.0 }
```
Returns `{ audioBase64, mimeType: "audio/mpeg", provider: "google" }`.

**Provider 3 — Browser fallback**
No API call needed. Returns `{ fallback: true, provider: "browser", cleanText }` to tell the
client to use `window.speechSynthesis` with the Markdown-stripped text.

### Client hook: `src/hooks/useTTS.ts`

**`speak(text)`** flow:
1. Guard via `speakLockRef` — ignores duplicate calls while audio is playing.
2. Cancels any in-progress audio and waits **80 ms** for it to settle.
3. `fetch('/api/tts', { signal: AbortController(6000ms) })` — hard 6 s timeout so a slow/down
   API falls back to browser TTS immediately instead of blocking the conversation.
4. Routes the response:
   - `fallback: true` → `browserSpeak(cleanText)`.
   - `audioBase64` → `playAudioBase64()`.
5. On any network/fetch error → `browserSpeak(text)` (client catches and continues).

**`playAudioBase64(base64, mimeType, provider, fullText)`**:
```
atob(base64) → Uint8Array → ArrayBuffer
→ AudioContext.decodeAudioData()
→ BufferSource → AnalyserNode(fftSize=256, smoothing=0.8) → destination
→ source.start()
```
The `AnalyserNode` is exposed as `analyserNode` so the orb reacts to the actual cloud TTS audio
waveform in real time. On `source.onended`, state is cleaned up and the lock is released.

**`browserSpeak(text)` — Chrome chunking fix**:
Chrome silently truncates utterances longer than ~200 characters. The fix:
1. Split text on sentence-ending punctuation (`[.!?]\s+`) and newlines.
2. Merge fragments greedily up to 200-char chunks.
3. Chain chunks via `utterance.onend → speakNext()` — only one utterance plays at a time.

Browser voice priority list (best to worst):
```
Microsoft Aria Online (Natural) - English (United States)  ← Windows/Edge cloud
Microsoft Jenny Online (Natural) - English (United States)
Microsoft Guy Online (Natural) - English (United States)
Google US English  ← Chrome cloud
Google UK English Female
Samantha  ← macOS default
Karen / Daniel (Enhanced) / Daniel  ← macOS/iOS
Microsoft Zira / David  ← Windows desktop
Alex  ← macOS generic fallback
```

---

## 12. Speech-to-Text — `useSpeechRecognition`

### Why it is complicated
Chrome's `SpeechRecognition` auto-fires `onend` every 2–3 words even in `continuous = true` mode,
dropping any in-flight "interim" (not-yet-final) text. The hook defeats this with a ref-based
accumulation strategy.

### Key refs
```ts
baseTranscriptRef  — all finalized text
lastInterimRef     — the most recent interim phrase (what Chrome would drop on onend)
transcriptRef      — live = base + interim (sync, NEVER stale — read this in event handlers)
shouldListenRef    — intent flag: true = keep listening, false = user stopped
```

### `spawnRec()` — creates a fresh recognition instance
```ts
rec.continuous     = true
rec.interimResults = true
rec.lang           = navigator.language || 'en-US'  // respects accented / Filipino English
```

`onresult`: final chunks → `baseTranscriptRef`, interim → `lastInterimRef`. Combined into
`transcriptRef` (sync) + `setTranscript` (React render) every result.

`onend` (auto-restart path): if `shouldListenRef` is still true, flush `lastInterimRef` into base
first, then `setTimeout(spawnRec, 80)`. The **80 ms gap** is deliberate — short enough that no
syllables fall into the silence window between instances, but long enough for Chrome to release
the mic handle before the new instance tries to acquire it.

`stopListening()`: sets `shouldListenRef = false`, flushes pending interim, calls `rec.stop()`.
This correctly captures the word the user was speaking at the exact moment they tapped Stop.

### Public API
```ts
{ isSupported, isListening, transcript, transcriptRef,
  startListening, stopListening, clearTranscript }
```

---

## 13. Audio recorder — `useAudioRecorder`

Provides a playable recording blob + live waveform data simultaneously.

### MIME negotiation
```ts
MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' :
MediaRecorder.isTypeSupported('audio/webm')             ? 'audio/webm'             :
MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')  ? 'audio/ogg;codecs=opus'  : ''
```
The final `Blob` is created with the *recorder's own* `mimeType` (not hardcoded), which is the
only reliable way to produce a playable blob across browsers.

### `recorder.start(100)` — 100 ms timeslice
Without a timeslice, `ondataavailable` only fires once on `stop()`. Very short recordings then
produce zero-length, unplayable blobs. The 100 ms interval ensures chunks accumulate continuously.

### Live waveform AnalyserNode
```ts
AudioContext → AnalyserNode(fftSize=512, smoothingTimeConstant=0.5)
  ← source from MediaStreamSource
```
7 frequency bins from the voice range (`[1, 2, 3, 5, 8, 12, 18]`) are sampled each RAF frame into
`audioLevels[7]` for any waveform bar animation, and the raw `analyserNode` is exposed for the orb.
AudioContext is resumed immediately if it starts `'suspended'` (some browsers require this even
inside a user-gesture handler).

### Public API
```ts
{ isRecording, audioURL, audioLevels, analyserNode,
  startRecording, stopRecording, cancelRecording, clearAudio }
```
`cancelRecording` sets `discardRef = true` before stopping — the `onstop` handler checks this and
skips creating an `audioURL`, discarding the clip (used by the Re-record flow).

---

## 14. Session orchestrator — `useMockDefense.ts`

All session state lives here. Voice-relevant pieces:

```ts
const speech   = useSpeechRecognition();   // STT
const synth    = useTTS();                  // TTS
const recorder = useAudioRecorder();        // mic blob + waveform

// Derived flags (recomputed each render, no extra state)
aiIsSpeaking  = mode === 'voice' && synth.isSpeaking
hasRecording  = !speech.isListening && !!(speech.transcriptRef.current || recorder.audioURL)
```

**`toggleMic()`** — the single tap target for both the orb and the Start button:
1. If AI is speaking → `synth.cancel()`.
2. If mic is on → `speech.stopListening()` + `recorder.stopRecording()`.
3. If mic is off → clear transcript + audio, `await recorder.startRecording()`, `speech.startListening()`.

**`sendToClaude(nextMessages)`** — the LLM turn:
- Streams via `callLLMStream` with RAF-throttled state updates (avoids 60 fps re-renders for each token).
- When streaming ends and `mode === 'voice'`, calls `synth.speak(finalText)` → starts the next
  spoken question → re-enters the audio-reactive orb loop.

**`sendVoiceReply()`** — sends the spoken answer:
- Reads `speech.transcriptRef.current` (the sync ref, not state).
- Tears down capture state (stop recorder, clear audio, clear transcript, pause `<audio>` element).
- Appends user message and calls `sendToClaude`.

**`handleRetry()`** — re-record without losing the turn:
- Cancels the current recording (discards the blob).
- Waits 120 ms then restarts both capture systems fresh.

**`replayLastQuestion()`** — for the Replay header button:
- Finds the last `assistant` message in the history.
- Calls `synth.cancel()` then `synth.speak(lastAI.content)`.

---

## 15. Criteria rail — `MockDefenseCriteriaRail.tsx`

A **React Portal** rendered directly into `document.body` (z-index 70–71), so it floats on top of
everything including the glass card.

- **Trigger tab:** `fixed right-0 top-1/2 -translate-y-1/2` — a vertical pill on the right edge
  of the screen. Active: `bg-emerald-600 text-white`. Inactive: `bg-white text-emerald-700 border-emerald-200`.
- **Panel:** `fixed top-20 bottom-20 right-14 w-[min(20rem,calc(100vw-4.5rem))]` — a floating card
  with a dimmed backdrop overlay on mobile (`bg-slate-900/15`) that dismisses it on click.
- **Contents:** 5 weighted criteria (C1 30% → C5 10%) with descriptions, plus an A–F grade scale
  at the bottom. Uses `.scrollbar-brand` for scrolling.

---

## 16. Complete file map

```
app/
  api/tts/route.ts           Server TTS proxy — ElevenLabs → Google → browser fallback
  globals.css                lyric-word, thinking-dots, tab-enter, shimmer, progress-bar,
                             glass / glass-card utilities, scrollbar-brand
  page.tsx                   SSR-disabled entry (dynamic import of App)

src/
  App.tsx                    Upload gate → Dashboard
  components/
    Dashboard.tsx            Sticky header + tab bar + glass-card shell + decorative blobs
    MockDefense.tsx          Top-level: setup gate, session header, voice/chat view switch,
                             criteria rail
    VoiceOrb.tsx             Canvas halftone sphere — 4-D noise, dual-light, FFT-reactive
    mockDefense/
      useMockDefense.ts      Full session state machine (STT + TTS + recorder + LLM loop)
      MockDefenseSetup.tsx   Pre-session: mode picker, difficulty, question limit, start button
      MockDefenseSessionHeader.tsx  Header strip: metadata, TTS pill, Replay, Transcript toggle,
                                   Evaluate, Save
      MockDefenseVoiceView.tsx     Orb stage: responsive canvas, status line, subtitle/transcript box
      MockDefenseVoiceInput.tsx    Phase-driven control bar: Skip / Stop / Playback / Send
      MockDefenseCriteriaRail.tsx  Portal-based floating criteria + grade scale panel
      constants.ts           DIFFICULTIES, LIMIT_OPTIONS, CRITERIA_RUBRIC, GRADE_SCALE,
                             VOICE_ORB_SIZE_MIN/MAX
      types.ts               SessionMode = 'chat' | 'voice', SessionView, ChatMessage
      utils.ts               buildThesisContext, buildEvaluationTranscript, downloadSessionTranscript
  hooks/
    useSpeech.ts             useSpeechRecognition + useAudioRecorder (+ legacy useSpeechSynthesis)
    useTTS.ts                Unified TTS hook — API + browser fallback + AnalyserNode exposure
    useLocalStorage.ts       Persistent session state (messages, mode, difficulty, etc.)
```

---

## 17. Environment configuration

The feature is **zero-config**: everything falls through to the browser automatically.
Add either key to unlock higher-quality neural voices:

```bash
# Option 1 — ElevenLabs (best, neural, low-latency)
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM   # Rachel (default). Any voice ID from elevenlabs.io

# Option 2 — Google Cloud TTS (free tier: 1M chars/month)
GOOGLE_TTS_API_KEY=...
GOOGLE_TTS_VOICE=en-US-Neural2-F            # optional override
```

The route auto-detects which keys are present and picks the highest available provider; it never
errors — it always falls through to the browser fallback at minimum.

---

## 18. Critical edge cases (must reproduce)

These are non-obvious fixes that make the feature reliably work in Chrome and other browsers:

| # | Problem | Fix |
|---|---|---|
| 1 | Chrome auto-fires `onend` every 2–3 words in `continuous` mode | `lastInterimRef` flush + auto-restart on `onend` |
| 2 | Last word dropped when user taps Stop | Flush `lastInterimRef` inside `stopListening()` before `rec.stop()` |
| 3 | React state lags one render behind on send | Always read `transcriptRef.current` (sync ref), never `transcript` (state) |
| 4 | Two `speak()` calls overlap → double-voice artifact | Synchronous `speakLockRef` guard in `useTTS.speak()` |
| 5 | Chrome silently truncates long utterances (>~200 chars) | `splitIntoChunks` + `onend` chaining |
| 6 | Slow / down cloud TTS hangs the whole turn | 6 s `AbortController` timeout → immediate browser fallback |
| 7 | Short recordings produce zero-length unplayable blobs | `MediaRecorder.start(100)` — 100 ms timeslice |
| 8 | Wrong MIME type → `<audio>.play()` silently fails | Build `Blob` with `recorder.mimeType`, not a hardcoded string |
| 9 | AudioContext starts `'suspended'` → all-zero FFT | `await ctx.resume()` immediately after construction |
| 10 | Mic stays on / memory leak after unmount | `useEffect` cleanup: stop tracks, cancel RAF, revoke object URLs, abort recognition |
| 11 | `speak()` called before previous `cancel()` settles | 80 ms `setTimeout` gap before starting new audio |
| 12 | Accented / Filipino English speech poorly recognized | `rec.lang = navigator.language` instead of hardcoded `'en-US'` |
