# ThesisIT — Redesign, Analytics & Admin Plan

> Status: **Done.** Redesign, Supabase backend + RLS, auth, /analytics, /admin,
> and API instrumentation are all built and verified end-to-end against the live
> project (not just type-checked) — see the session's task log for what was
> tested and what bugs were found and fixed along the way.
> Decisions locked with the user: refined-editorial design direction, real Next.js
> routes, Recharts + TanStack Table (React Bits skipped where it would have hurt
> consistency, per the user's own constraint), drop HeroUI, Supabase (not
> file-SQLite), workspace stays open (no login wall) with usage tracked only for
> signed-in users.
> Deferred, not done: the §9 auth-hardening backlog (explicitly requested as a
> plan, not an implementation), and a couple of small follow-ups noted in the
> final chat summary (leaked-password-protection toggle, unrelated pre-existing
> npm audit findings).

---

## 9. Auth/session hardening — research plan (not implemented yet)

Requested 2026-08-12: a forward plan for session/cookie/JWT hardening and further
security research, to implement in a later pass — not blocking the current build.

**What's already in place** (via `@supabase/ssr`, out of the box):
- Session cookies are httpOnly, `SameSite=Lax`, scoped to the app's own domain —
  never readable by client-side JS, closing the most common XSS-to-session-theft
  path.
- Refresh tokens rotate on use; Supabase invalidates the old one automatically.
- Access tokens (JWT) are short-lived (~1h default) and refreshed silently by
  `proxy.ts` on every request via `updateSession()`.

**Follow-up items, roughly in priority order:**

| Item | What it does | Effort |
|---|---|---|
| **Enable leaked-password protection** | Supabase Dashboard → Authentication → Policies → Password Security. Already flagged by `get_advisors` as a live WARN — checks new passwords against HaveIBeenPwned. Not toggleable via the SQL/migration tools available in this session; needs a manual dashboard visit. | Minutes |
| **CAPTCHA on signup** | hCaptcha/Turnstile via Supabase Auth settings — blocks scripted account creation. Relevant once the app has real signup traffic. | Config only |
| **Rate-limit auth endpoints** | Supabase Auth has built-in per-IP rate limits on sign-in/sign-up; review the defaults are appropriate before this ships publicly. | Review |
| **MFA (TOTP) for admin accounts** | Supabase Auth supports TOTP MFA natively. Worth requiring specifically for `ADMIN` role, not the whole user base — the payoff (protecting the account that can see cross-user usage data) is much higher than the friction cost there. | Medium — needs an MFA enrollment UI + an `aal2`-required check in `getSessionProfile`/`proxy.ts` for `/admin/**` |
| **"Sign out everywhere"** | `supabase.auth.signOut({ scope: 'global' })` invalidates every session for a user, not just the current one — useful after a suspected compromise. Add as an account-settings action. | Small |
| **Session revocation on password change** | Confirm Supabase's default behavior (it does revoke other sessions on password change) rather than assuming — verify, don't just trust. | Verification |
| **Audit log for admin actions** | Right now `events` logs *usage*, not *admin actions* (role changes, data exports). A separate `admin_audit_log` table, insert-only, would close that gap if the admin surface grows beyond read-only dashboards. | Medium — new table + RLS, only needed once admin gets write actions |
| **CSP tightening** | `next.config.ts` already sets `X-Frame-Options`, `X-Content-Type-Options`, etc. A real `Content-Security-Policy` header (script-src/connect-src scoped to Supabase's domain + the LLM proxy routes) is the next step up. | Medium |

**Explicit non-goal, confirmed 2026-08-12:** analytics and admin never store thesis
manuscript text, LLM prompt bodies, or LLM response bodies server-side. The
`defense_sessions` and `events` schema (§6.1) only has columns for counts, labels,
scores, and small structured `meta` JSON — there is no column that *could* hold a
manuscript even by accident. The thesis text itself stays exactly where it is
today: client-side `sessionStorage`, tab-scoped, erased on tab close. This is a
hard constraint on `logEvent()` (task 14), not just a design preference — never
pass thesis text, prompt content, or LLM output into `meta`.

---

## 0. Hard guardrails (frozen — will not be modified)

These are treated as immutable behavior. Their *containers* may be restyled; their
internals, contracts, and tuning constants are not touched.

| Guardrail | Files | What is frozen |
|---|---|---|
| **VoiceOrb** | `src/components/VoiceOrb.tsx` | 52 latitude rings, `DOT_DENSITY 8.5`, `STAGGER 0.31`, inline 4-D simplex noise, dual-light `L1`/`L2` shading, depth-sorted painter's draw, FFT band mapping (bass→radius pulse, mid→morph, treble→speed), `IDLE_NOISE_AMP 0.055` never-still idle, `VoiceOrbHandle.setAmplitude` |
| **Voice pipeline** | `src/hooks/useSpeech.ts`, `src/hooks/useTTS.ts`, `app/api/tts/route.ts` | Web Speech STT, MediaRecorder blob, AnalyserNode FFT, TTS waterfall ElevenLabs → Google → browser, `synth.spokenText` karaoke feed |
| **Voice stage layout** | `mockDefense/MockDefenseVoiceView.tsx` | `ResizeObserver` orb sizing, `LAYOUT_RESERVED_PX 190`, `VOICE_ORB_SIZE_MIN/MAX`, `.lyric-word` per-word subtitle animation |
| **Mock defense state machine** | `mockDefense/useMockDefense.ts`, `answerGate.ts`, `constants.ts` | Full return shape, `localOnly` pushback messages excluded from `panelQCount`, `isSessionComplete` rule, 5-criterion weighted rubric (C1 30 / C2 25 / C3 20 / C4 15 / C5 10), evaluate / reset / save / replay |
| **AI chat transport** | `src/lib/llm.ts`, `app/api/chat/stream/route.ts` | SSE contract, `requestAnimationFrame`-throttled stream updates, abort-on-new-message, provider fallback + cooldown + cache, `<think>` stripping |
| **Retrieval** | `src/lib/chunkRetrieval.ts`, `extractSections.ts` | BM25 `retrieveTopChunks`, multi-query chapter coverage |

Restyling touches only: `ChatBubble` / `ChatInput` / `ChatMessages` shells,
`MockDefenseSessionHeader`, `MockDefenseSetup` chrome, `MockDefenseVoiceInput`
buttons, cards, tokens, page chrome.

---

## 1. SQLite: the direct answer

**Not for this project as deployed.** `vercel.json` is committed, so the target is
Vercel serverless. Vercel functions have an **ephemeral, read-only-in-practice
filesystem** — a `.sqlite` file written by one invocation does not exist for the
next, and nothing survives a redeploy. An admin usage dashboard backed by
file-SQLite on Vercel would show near-empty data at random.

SQLite is a genuinely good database. The problem is only the runtime.

**Recommendation — keep SQLite's ergonomics, drop the local file:**

| Option | Verdict |
|---|---|
| **Prisma + SQLite locally, Postgres in prod** | ✅ **Recommended.** One `schema.prisma`, `provider = "sqlite"` for dev, `"postgresql"` for prod. You develop against a local file, deploy against Neon/Supabase/Vercel Postgres. One-line datasource swap. Costs nothing extra now. |
| **Turso (libSQL)** | ✅ Also fine. Literally SQLite, hosted, works on serverless over HTTP. Generous free tier. Pick this if you specifically want SQLite semantics in prod. |
| **Plain file SQLite (`better-sqlite3`)** | ❌ Only if you abandon Vercel and self-host on a VPS with a persistent disk. |

The plan below assumes **Prisma + SQLite (dev) → Postgres (prod)**. Nothing in the
schema or query layer changes if you later switch to Turso.

---

## 2. Design system — refined editorial

### 2.1 What gets removed

- `.glass` and `.glass-card` utilities in `app/globals.css`
- All decorative blurred blobs (`Dashboard.tsx:99-100`, `UploadScreen.tsx:68-69`)
- The `slate-*` vs `neutral-*` split — one scale only
- Ad-hoc shadows (`shadow-emerald-200`, `shadow-slate-200/40`, `hover:shadow-2xl`)
- Emerald as *chrome* (backgrounds, borders, scrollbars) — it becomes accent only
- `@heroui/react` from `package.json` (zero imports found anywhere in `src/`)
- `src/components/Orb.tsx` — dead WebGL code, nothing imports it

### 2.2 Token layer — `app/globals.css` `@theme`

```
Surfaces      page      #f9f9f7      card     #fcfcfb     sunken  #f2f1ee
Ink           primary   #0b0b0b      secondary #52514e    muted   #898781
Lines         hairline  #e1e0d9      strong    #c3c2b7
Accent        emerald-600 #059669  — links, active tab, primary button, focus ring
Status        good #0ca30c · warning #fab219 · serious #ec835a · critical #d03b3b
Radii         sm 6 · md 10 · lg 14 · xl 20      (replaces mixed 2xl/3xl/full)
Elevation     ONE shadow token, overlays only (dropdown, dialog, toast)
Type          Inter everywhere; Outfit reserved for page h1 and the hero figure
```

Every component reads semantic tokens (`--surface-card`, `--ink-secondary`), never
raw Tailwind color classes. That is what fixes the consistency problem permanently.

### 2.3 Chart palette — validated, not eyeballed

Ran `dataviz/scripts/validate_palette.js` against the editorial card surface
`#fcfcfb`. Emerald leads so charts stay on-brand.

**Categorical order (locked):**

| Slot | Hue | Hex |
|---|---|---|
| 1 | aqua/emerald | `#1baf7a` |
| 2 | blue | `#2a78d6` |
| 3 | orange | `#eb6834` |
| 4 | violet | `#4a3aa7` |
| 5 | red | `#e34948` |
| 6 | yellow | `#eda100` |
| 7 | green | `#008300` |
| 8 | magenta | `#e87ba4` |

**Validator results (light, surface `#fcfcfb`):**

- Adjacent pairlist (bars, lines, stacks), all 8 slots — **ALL CHECKS PASS.**
  Worst adjacent CVD ΔE **15.3** (deutan), worst normal-vision ΔE **20.8**.
- All-pairs (donuts, scatter), first 4 slots — **ALL CHECKS PASS.**
  Worst all-pairs CVD ΔE **9.2**, normal-vision ΔE **16.3**.
- One standing WARN: `#1baf7a` (2.74:1), `#eda100` (2.11:1), `#e87ba4` (2.62:1)
  sit below 3:1 on the light surface. **Relief rule applies and is non-negotiable:**
  every chart using those slots ships visible direct labels *or* a table view.

**Rules that fall out of this:**
- Donuts/pies are capped at **4 slices**. A 5th folds into "Other".
- Slot order is fixed and never cycled. Color follows the entity, never its rank —
  a filter that drops series must not repaint the survivors.
- Score bars use a **sequential blue ramp**, not the categorical palette — they
  encode magnitude, not identity. This replaces the current
  `scoreBarColor()` in `parseReport.ts`, which switches hue by threshold
  (green/blue/amber/red) and reads as four unrelated categories.

Re-run before shipping any new palette:
```bash
node scripts/validate_palette.js "#1baf7a,#2a78d6,#eb6834,#4a3aa7,#e34948,#eda100,#008300,#e87ba4" --mode light --surface "#fcfcfb"
```

---

## 3. Routing & state lifting

```
app/
  layout.tsx                  ThesisProvider + AppShell (top nav)
  page.tsx                    upload → dashboard (current experience)
  analytics/page.tsx          performance analytics
  admin/
    layout.tsx                own chrome, no student nav
    page.tsx                  usage overview
    users/page.tsx            user table
    events/page.tsx           event log
  api/
    events/route.ts           POST — ingest usage events
    admin/usage/route.ts      GET  — aggregated metrics (admin-gated)
middleware.ts                 protects /admin/**
```

**State lifting is the prerequisite.** `src/App.tsx` currently owns `thesisText`,
`fileName`, `activeTab` via `useLocalStorage`. Extract to
`src/context/ThesisProvider.tsx` exposing the same values through
`useThesis()`. `App.tsx` becomes a thin consumer. Storage semantics stay
`sessionStorage` — unchanged.

Also rename `useLocalStorage` → `useSessionStorage`. The current name is actively
misleading (the file itself documents that it uses `sessionStorage` for OWASP
reasons). Pure rename, no behavior change.

---

## 4. Libraries

| Library | Decision | Use |
|---|---|---|
| **Recharts** | Keep — already installed & wired | Extend `ui/chart.tsx` with `DonutChart`, `RadarChart`, `AreaTrend`, `StackedBar`, `Sparkline` |
| **React Bits** | Copy-in via `jsrepo`, zero deps | `CountUp` (KPI figures), `SpotlightCard` (analytics tiles), `AnimatedList` (admin event feed), `ShinyText` (hero) |
| **TanStack Table** | Add (`@tanstack/react-table`) | Admin users + events tables: sort, filter, paginate |
| **HeroUI** | **Remove** | Zero imports in `src/` |
| **Radix / shadcn primitives** | Keep | Already the base layer |

**Your consistency constraint, applied concretely.** React Bits components are
decorative and ship their own visual opinions — that is exactly where inconsistency
creeps in. The rule for this build: every React Bits component gets its colors,
radii, and type from the token layer in §2.2 before it lands, and any one that
can't be tokenized cleanly is dropped rather than kept. Specifically at risk —
`SpotlightCard` (hardcoded glow, must read `--accent`) and `ShinyText` (gradient
sweep; if it fights the editorial direction it goes, and the hero figure is plain
`CountUp` instead). `AnimatedList` and `CountUp` are structurally neutral and safe.

---

## 5. Analytics page — `/analytics`

Charts chosen by the data's *job*, not by what looks impressive.

| # | Question answered | Form | Why this form |
|---|---|---|---|
| 1 | How am I doing overall? | **Hero figure** + grade badge + delta vs last session | A single headline number is a hero figure, never a one-bar chart |
| 2 | Readiness at a glance | **KPI row** — 4 stat tiles: sessions run, avg score, questions answered, weakest criterion | Handful of headline numbers = stat tiles |
| 3 | Which rubric criteria are weak? | **Horizontal bar, sequential blue ramp**, direct-labeled | Magnitude comparison across 5 named criteria; long labels ⇒ horizontal |
| 4 | Criterion shape across sessions | **Radar**, 5 axes, 2 series max (first vs latest) | The one legitimate radar case: fixed small axis set, shape comparison |
| 5 | Am I improving? | **Line**, score over session index, per-criterion toggle | Trend over time |
| 6 | Per-question performance | **Column chart**, sequential ramp, hover → question text + strength/gap | Magnitude across an ordered set |
| 7 | What kind of findings dominate? | **Donut, ≤4 slices** — strengths / weaknesses / questions / recommendations | True part-to-whole, within the 4-slice cap |
| 8 | Chat vs voice split | **Donut, 2 slices** *(see note)* | — |
| 9 | Time spent per session | **Area, single series** | Single-series trend |
| 10 | Everything, exactly | **Table view** toggle on every chart | Mandatory relief for the sub-3:1 palette slots |

> **Note on #8 and pies generally.** You asked for pies, so donuts are in the plan
> where they genuinely fit (#7, #8). But a 2-slice donut for the chat/voice split is
> the weakest chart on this page — the visualization method rates a 2-slice pie as
> strictly worse than a **meter** (a single ratio against a whole). I'll build #8 as
> a meter with the ratio printed, unless you'd rather have the donut. Everything
> else that could have been a pie (criterion scores, per-question scores) is a bar,
> because those are magnitude comparisons and a pie destroys the comparison.

**Interaction, applied to all of the above:** crosshair + tooltip on line/area,
per-mark hover tooltip on bar/donut, filters in a single row above the grid
(date range, session, difficulty), legend whenever ≥2 series, direct labels at ≤4.

### 5.1 The data problem this page must solve first

`parseEvalReport()` scrapes `C1 8/10` and `Score: 7` out of free prose with regex.
If the model phrases it differently, charts render empty and silently.

**Fix before building charts:** change `MOCK_DEFENSE_EVALUATION_PROMPT` and
`STRENGTHS_WEAKNESSES_PROMPT` in `src/lib/prompts.ts` to append a fenced
```json block with a strict shape:

```json
{
  "overall": { "score": 82, "grade": "B" },
  "criteria": [{ "id": "C1", "score": 8.5 }, ...],
  "questions": [{ "id": "Q1", "score": 7, "strength": "...", "gap": "..." }, ...]
}
```

`parseReport.ts` parses the JSON block first, falls back to the existing regex.
The prose stays for the "Full Report" view. This is the difference between
analytics that are real and analytics that are decorative.

---

## 6. Admin page — `/admin`

### 6.1 Data model (`prisma/schema.prisma`)

```
User        id, email, name, role(STUDENT|ADMIN), createdAt, lastSeenAt
Session     id, userId, startedAt, endedAt, mode, difficulty, questionLimit,
            questionsAnswered, overallScore, grade
Event       id, userId?, sessionId?, type, meta(Json), createdAt, ip(hashed), ua
UsageDaily  date, userId, sessions, messages, tokensIn, tokensOut,
            ttsChars, pdfPages, llmCostCents          -- rollup
```

`Event.type` enum: `pdf_upload`, `session_start`, `session_end`, `question_asked`,
`answer_submitted`, `evaluation_run`, `chat_message`, `tts_request`,
`report_generated`, `provider_fallback`, `rate_limited`, `error`.

### 6.2 Instrumentation

A single `logEvent()` helper called from the existing server routes — no changes
to client behavior, no new round trips:

- `app/api/chat/stream/route.ts` — emit on each request: task label, provider that
  won, model, token counts, cache hit/miss, fallback chain, rate-limit pause
- `app/api/tts/route.ts` — provider used, character count
- `app/api/pdf/extract/route.ts` — page count, byte size, duration

The existing `console.info('[AI] "${task}" → ...')` lines already carry most of
this. `logEvent()` writes the same facts to the DB.

### 6.3 Admin views

**Overview** — KPI row (DAU/WAU/MAU, sessions today, avg session length, LLM spend
MTD) · area chart of daily active users · **stacked bar of requests by provider**
(OpenRouter / OpenAI / Groq / NVIDIA — categorical, ≤4 series, within cap) ·
**donut of session mode split** · cache hit-rate meter · error-rate meter.

**Users** — TanStack Table: email, role, sessions, last seen, total tokens, est.
cost, avg score. Sortable, filterable, paginated. Row → per-user drilldown.

**Events** — live-ish event log via React Bits `AnimatedList`, filterable by type
and user, with the raw `meta` JSON expandable.

**Cost** — tokens and estimated spend per provider over time; the single most
useful admin chart given the fallback chain.

### 6.4 Auth & protection

Minimum viable, in order of preference:

1. **NextAuth (Auth.js)** with a credentials or email provider; `role` claim on the
   session; `middleware.ts` rejects non-`ADMIN` on `/admin/**`.
2. If you want zero auth infrastructure for now: a server-side `ADMIN_TOKEN` env
   var checked in middleware, entered once and stored in an httpOnly cookie.
   Acceptable for a thesis demo, not for production.

**Privacy note.** Once real users exist, thesis manuscripts stop being
tab-scoped. The current `sessionStorage` design is a deliberate minimal-retention
choice documented in `useLocalStorage.ts`. Adding accounts should **not** start
persisting manuscript text server-side — log *events and counts*, never thesis
content or LLM prompt/response bodies. Hash IPs.

---

## 7. Execution order

| Phase | Work | Ships |
|---|---|---|
| **0** | Token layer, remove glass/blobs/HeroUI/`Orb.tsx`, unify slate→neutral | Consistent existing UI, zero new features |
| **1** | `ThesisProvider`, `useLocalStorage`→`useSessionStorage`, App Router pages + `AppShell` nav | Routing works, `/analytics` and `/admin` reachable |
| **2** | Restyle chat + mock-defense chrome to tokens. **Guardrails untouched — verify voice mode end-to-end after** | Redesign visually complete |
| **3** | Structured JSON in eval prompts + `parseReport.ts` JSON-first parsing | Reliable chart data |
| **4** | Extend `ui/chart.tsx` (Donut, Radar, AreaTrend, StackedBar, Sparkline, StatTile) against the validated palette | Chart kit |
| **5** | `/analytics` page, charts #1–#10 + table views | Analytics done |
| **6** | Prisma schema, `logEvent()`, instrument the 3 API routes | Usage data accumulating |
| **7** | Auth + middleware, `/admin` overview / users / events / cost | Admin done |
| **8** | Re-run palette validator, a11y pass, screenshot every chart, verify voice mode + orb once more | Ship |

Phases 0–2 are the redesign. 3–5 are analytics. 6–8 are admin. Each phase is
independently shippable; you can stop after any of them.

---

## 8. Risks

| Risk | Mitigation |
|---|---|
| Restyle regresses voice mode | Guardrail files are edit-locked; manual voice run after phase 2 and phase 8 |
| React Bits components fight the editorial direction | Tokenize on entry; drop any that can't be (`ShinyText`, `SpotlightCard` flagged) |
| Charts empty because the model changed phrasing | Phase 3 JSON contract, regex retained as fallback |
| SQLite chosen and deployed to Vercel | §1 — Prisma with a swappable datasource |
| Adding accounts erodes the current privacy posture | Log events and counts only; never manuscript text or prompt bodies; hash IPs |
| `parseReport.ts` regex and prompts drift apart | Colocate the JSON schema with the prompt; add a parser unit test |
