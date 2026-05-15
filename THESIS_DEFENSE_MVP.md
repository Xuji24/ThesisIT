# 🎓 ThesisIT — MVP Build Plan for Cursor

## Project Overview

Build a single-page React web app where students upload their thesis manuscript (PDF) and get AI-powered tools to prepare for their thesis defense.

**Stack:**
- React + Vite (no backend needed for MVP)
- Tailwind CSS for styling
- `pdfjs-dist` for PDF text extraction (client-side)
- Anthropic Claude API (`claude-sonnet-4-20250514`) for all AI features
- `react-markdown` for rendering AI responses

---

## App Structure

```
src/
├── App.jsx                      # Root component, manages global state
├── main.jsx
├── index.css
├── components/
│   ├── UploadScreen.jsx         # Landing/upload UI
│   ├── Dashboard.jsx            # Tab layout after upload
│   ├── MockDefense.jsx          # Feature 1: Mock oral defense chat
│   ├── StrengthsWeaknesses.jsx  # Feature 2: Manuscript analysis
│   ├── ChatWithDoc.jsx          # Feature 3: Q&A with uploaded thesis
│   └── PanelRecos.jsx           # Feature 4: Accept and apply panelist recommendations
├── lib/
│   ├── extractPdf.js            # PDF-to-text utility
│   ├── prompts.js               # All AI system prompts in one place
│   └── claude.js                # Claude API call utility
```

---

## Global State (App.jsx)

Manage these at the root level and pass down as props:

```
- thesisText: string        // Full extracted text from uploaded PDF
- fileName: string          // Name of uploaded file
- activeTab: string         // Current active feature tab
```

---

## Feature 1: Upload Screen (UploadScreen.jsx)

### UI Elements
- App title: "ThesisIT" and tagline: "Your AI-powered thesis defense coach"
- Drag-and-drop zone OR file input (accept `.pdf` only)
- Upload button
- Loading spinner while extracting text with message: "Reading your manuscript..."

### Logic
1. User drops or selects a PDF file
2. Use `pdfjs-dist` to extract all text from the PDF page by page
3. Join all page texts into one large string and store in `thesisText` state
4. Store the filename in `fileName` state
5. Transition to Dashboard once extraction is complete

### PDF Extraction Notes
- Install: `npm install pdfjs-dist`
- Load the PDF using `pdfjsLib.getDocument()`
- Loop through all pages using `page.getTextContent()`
- Join all text items per page, then join all pages
- Do NOT truncate — pass the full text to Claude (it handles long inputs well)

---

## Feature 2: Dashboard (Dashboard.jsx)

After upload, show a full-screen tabbed layout with 4 tabs:

| Tab | Icon (Lucide) | Component |
|---|---|---|
| Mock Defense | `Mic` | MockDefense.jsx |
| Strengths & Weaknesses | `BarChart3` | StrengthsWeaknesses.jsx |
| Chat with Thesis | `MessageCircle` | ChatWithDoc.jsx |
| Panelist Recommendations | `PenLine` | PanelRecos.jsx |

- Show the uploaded filename at the top of the dashboard
- Keep tab state in App.jsx so switching tabs doesn't reset sub-components
- Persist analysis results per tab using local component state (no re-fetching on tab switch)

---

## Feature 3: Mock Defense (MockDefense.jsx)

### Purpose
Simulate a real oral defense. The AI plays a strict panel member. It asks questions one at a time. The student answers. The AI follows up or challenges.

### UI Elements
- Difficulty selector at the top: `Standard` | `Technical` | `Terror Panel`
- "Start Defense Session" button
- Chat bubble interface (AI messages on left, student messages on right)
- Text input + Send button at the bottom
- Disable input while AI is responding (show "Panel is thinking...")

### System Prompt (in prompts.js)
```
You are a strict but fair thesis defense panelist evaluating a student's oral defense.

RULES:
- Introduce yourself as "The Panel" in your first message, then immediately ask your first question.
- Ask exactly ONE question per turn. Never stack multiple questions.
- After the student answers, critically evaluate their response. If weak or vague, press harder with follow-ups like "That does not fully address my concern about..." or "Can you be more specific about..."
- Vary your questions across: research objectives, methodology, sampling strategy, statistical treatment, literature gap, significance of the study, conclusions, and recommendations.
- Do not compliment superficially. Be rigorous but not hostile.
- Base ALL questions strictly on the uploaded manuscript. Do not invent content not found in the manuscript.
- Difficulty level: {{DIFFICULTY}}

MANUSCRIPT:
{{THESIS_TEXT}}
```

### Logic
- Replace `{{DIFFICULTY}}` with the selected difficulty before sending
- Replace `{{THESIS_TEXT}}` with the first ~8,000 words of the thesis (truncate for speed/cost)
- On "Start Defense Session", send system prompt + first user message: `"Begin the oral defense."`
- Store full conversation in a `messages` array: `[{ role: "user" | "assistant", content: string }]`
- Pass full messages array on every API call for multi-turn memory
- Each new student reply is appended to the messages array before calling the API

---

## Feature 4: Strengths & Weaknesses (StrengthsWeaknesses.jsx)

### Purpose
One-click automated evaluation. The AI reads the full manuscript and returns a structured written report.

### UI Elements
- "Analyze My Thesis" button (large, centered, shown before analysis)
- Loading state with message: "Evaluating your manuscript... This may take a moment."
- Rendered markdown output organized in clear sections once complete

### System Prompt (in prompts.js)
```
You are an expert thesis evaluator and experienced academic panelist.

Analyze the following thesis manuscript and return a detailed, structured evaluation report.

Use EXACTLY these markdown headers in your response:

## Strengths
List 4–6 genuine strengths of the manuscript. Be specific — cite chapters or sections.

## Weaknesses and Loopholes
List specific weaknesses, logical gaps, and inconsistencies. Cite the chapter or section where each issue appears. Be direct and academic.

## Chapter-by-Chapter Notes
For each chapter (Chapter 1 through Chapter 5), write 2–4 sentences of focused critique.

## Predicted Panel Questions
List 6–10 questions a defense panel is likely to ask, based specifically on the weaknesses you found.

## Recommendations Before the Defense
Give 4–6 actionable recommendations the student can act on immediately to strengthen their defense.

RULES:
- Be specific. Generic feedback is not acceptable.
- Do not fabricate content, data, or citations. Only reference what is in the manuscript.
- Maintain a rigorous but constructive academic tone.

MANUSCRIPT:
{{THESIS_TEXT}}
```

### Logic
- Single API call when the button is clicked
- Replace `{{THESIS_TEXT}}` with the full thesis text
- Render the response using `react-markdown` with `@tailwindcss/typography` prose styles
- Cache the result in component state — do not re-fetch if the user switches tabs and returns

---

## Feature 5: Chat with Thesis (ChatWithDoc.jsx)

### Purpose
Lets students ask any question about their thesis — like a chatbot grounded only in their manuscript.

### UI Elements
- Chat bubble interface (same pattern as Mock Defense)
- Suggestion chips shown before first message: `"Summarize Chapter 3"`, `"What is my research gap?"`, `"Explain my methodology"`, `"What are my study's limitations?"`
- Clicking a chip fills the input box with that question
- Text input + Send button

### System Prompt (in prompts.js)
```
You are a helpful academic assistant. A student has uploaded their thesis manuscript and you have been given its full content.

RULES:
- Answer ONLY based on the content of the manuscript provided below.
- If the answer cannot be found in the manuscript, respond with: "That information does not appear to be in your manuscript."
- Be clear, concise, and helpful.
- When asked to summarize a chapter, be thorough and specific.
- Do not invent citations, statistics, or claims that are not in the manuscript.
- Use formal but approachable academic language.

MANUSCRIPT:
{{THESIS_TEXT}}
```

### Logic
- Inject the system prompt once at the beginning of the session
- Multi-turn: pass full `messages` array on every API call
- Suggestion chips pre-fill the input and auto-submit on click

---

## Feature 6: Panelist Recommendations (PanelRecos.jsx)

### Purpose
The student pastes actual panelist feedback from their defense, and the AI rewrites the relevant section of the manuscript to address those comments.

### UI Elements
- Label: "Paste your panelist's comments or suggestions"
- Textarea for raw panelist feedback (free text, multi-line)
- Dropdown: "Which part of the thesis does this affect?" with options: `General / Introduction (Ch. 1)`, `Review of Related Literature (Ch. 2)`, `Methodology (Ch. 3)`, `Results and Discussion (Ch. 4)`, `Summary, Conclusions, Recommendations (Ch. 5)`
- "Revise This Section" button
- Output area showing:
  - Label: "Revised Section"
  - The AI-generated revised text in a readable card
  - Copy to clipboard button

### System Prompt (in prompts.js)
```
You are an expert academic writing editor helping a student revise their thesis manuscript.

The student received the following feedback from their defense panel:
{{PANELIST_COMMENTS}}

The section of the thesis this feedback applies to: {{SELECTED_CHAPTER}}

Using the original manuscript below as your source, rewrite the relevant section to fully address the panelist's feedback.

RULES:
- Preserve the student's original argument, structure, and voice as much as possible.
- Do not invent new data, statistics, or citations.
- Clearly and directly address every point raised in the panelist's feedback.
- Output only the revised section — not the entire manuscript.
- Use formal academic language appropriate for a thesis.
- Begin your response with a brief note explaining what changes you made and why.

ORIGINAL MANUSCRIPT:
{{THESIS_TEXT}}
```

### Logic
- Replace `{{PANELIST_COMMENTS}}` with the textarea value
- Replace `{{SELECTED_CHAPTER}}` with the selected dropdown option
- Replace `{{THESIS_TEXT}}` with the full thesis text
- Single API call on button click
- Show loading state: "Revising section based on panel feedback..."
- Render the output in a styled, copyable text box

---

## Claude API Utility (lib/claude.js)

Create a reusable async function with this signature:

```
callClaude({ systemPrompt, messages, maxTokens })
```

- POST to `https://api.anthropic.com/v1/messages`
- Model: `claude-sonnet-4-20250514`
- Pass `systemPrompt` as the top-level `system` field (NOT inside messages array)
- Pass `messages` as the `messages` array
- Default `maxTokens` to `2000`; increase to `4000` for Strengths & Weaknesses
- Extract the response text from `data.content[0].text`
- Wrap in try/catch and return a clear error string if the call fails
- API key: read from `import.meta.env.VITE_ANTHROPIC_API_KEY`

---

## All Prompts File (lib/prompts.js)

Keep all system prompts in one file as exported string constants:

```
export const MOCK_DEFENSE_PROMPT = `...`
export const STRENGTHS_WEAKNESSES_PROMPT = `...`
export const CHAT_WITH_DOC_PROMPT = `...`
export const PANEL_RECOS_PROMPT = `...`
```

Use `.replace("{{THESIS_TEXT}}", thesisText)` to inject dynamic values before calling the API.

---

## Environment Setup

Create a `.env` file at the project root:

```
VITE_ANTHROPIC_API_KEY=your_api_key_here
```

Add `.env` to `.gitignore` immediately.

---

## Thesis Text Handling

The full thesis may be 20,000–60,000 words. Claude Sonnet handles ~150k tokens so the full text is fine.

- **Strengths & Weaknesses**: Pass full text
- **Chat with Thesis**: Pass full text
- **Panelist Recommendations**: Pass full text
- **Mock Defense**: Truncate to first 8,000 words to reduce latency during live chat

To identify chapters, do a simple `indexOf("Chapter 3")` string search to find approximate positions if needed.

---

## npm Packages to Install

```
npm install pdfjs-dist react-markdown @tailwindcss/typography
```

Also initialize Tailwind CSS if not already set up.

---

## Design Direction

- **Dark academia / professional** — deep navy or charcoal background, warm gold or amber accents
- Serif or editorial display font for headings; clean sans-serif for body
- Chat bubbles: AI messages in a dark muted card on the left, student messages in an accent-colored bubble on the right
- Smooth tab switching animation
- Loading states on every AI call — spinner or animated "thinking..." indicator
- `react-markdown` output styled with Tailwind typography prose class
- Mobile-responsive but optimized for desktop

---

## Build Order for Hackathon (Fastest to Demo)

1. Scaffold Vite + React + Tailwind
2. `.env` file + `lib/claude.js` utility + test raw API call in console
3. `lib/extractPdf.js` + `UploadScreen.jsx` — test PDF extraction with a real thesis PDF
4. `Dashboard.jsx` with working tab navigation
5. `StrengthsWeaknesses.jsx` — easiest feature, single API call, static output
6. `ChatWithDoc.jsx` — multi-turn chat pattern, reuse for next feature
7. `MockDefense.jsx` — same chat pattern, different system prompt + difficulty selector
8. `PanelRecos.jsx` — textarea input + single API call + copy output
9. Final styling and polish pass

---

## MVP Constraints — Stick to These Only

✅ PDF upload and full text extraction
✅ Mock Defense multi-turn chat
✅ Strengths & Weaknesses one-click report
✅ Chat with Thesis multi-turn
✅ Panelist Recommendation revision

❌ No user accounts or authentication
❌ No backend server (everything runs client-side)
❌ No database or persistent storage
❌ No DOCX support (PDF only)
❌ No voice or speech features
❌ No export to PDF/DOCX
❌ No custom AI model training

---

## Testing Checklist Before Demo

- [ ] Upload a real thesis PDF — confirm text is extracted correctly (`console.log` first 500 chars)
- [ ] Strengths & Weaknesses generates a structured, specific report
- [ ] Mock Defense asks a relevant first question based on the actual thesis
- [ ] Chat answers accurately from the manuscript and refuses to fabricate
- [ ] Panelist Reco produces a revised section that addresses the pasted feedback
- [ ] Tab switching works without losing previous results
- [ ] No API key exposed in browser network tab (confirm it's read from `.env`)
