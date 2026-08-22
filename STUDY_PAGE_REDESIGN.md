# Study Page Assessment & Redesign Proposal

**Date:** 2026-08-20
**Scope:** Menen Student Assistant — Study page (`frontend/src/components/StudyPage.tsx`), helper content (Notes/Summary/Keywords/Solved Examples/Slides), completion tracking (`StuSectionProgress`).

---

## 1. Why this matters now — the data reality

For the first time, auxiliary content is near-complete. Verified against the `MERP_OSHS` database:

| Content | Sections covered | Coverage |
|---|---|---|
| Basic notes (Notes + Summary + Keywords + Solved Examples) | 1,478 | **78.2%** |
| Presentations (slides) | 1,209 | **64.0%** |
| Quizzes | 1,539 | **81.4%** |
| Total sections | 1,890 | — |
| Sections with **neither** notes nor slides | 408 | 21.6% (PDF-only) |

- Every one of the 1,492 note rows contains text; 1,489 have keywords; 1,488 have solved examples.
- 3,816 slides exist. Slides are the most textbook-like helper (they are section-ordered, full-topic walkthroughs), making them the strongest candidate for a primary study surface.
- So ~78% of the curriculum can already be studied fully without the PDF, and ~64% can be studied via slides alone.

**The problem:** the UI still treats helpers as a *secondary drawer* bolted onto a PDF-first page. The design no longer matches the data it now serves.

---

## 2. Current system — what it actually is today

Layout: three surfaces fight for attention at once.

1. **Left sidebar** — chapter/section tree, search, progress %, study timer.
2. **Center** — the PDF viewer (the only "real" study surface).
3. **Floating right drawer ("Study Helpers")** — five tabs: Notes, Summary, Keywords, Examples, Slides — opens on demand and overlays the PDF. Slides are rendered as a ~300px plain-text box inside this drawer.

Top bar: Notes (student notes), Helpers, TTS toggles + 3 separate read-aloud buttons, copy buttons, **Mark Complete**, fullscreen.

Overlapping behaviour that creates clutter:

- **Three TTS buttons** (read my notes / read study notes / read page aloud) plus a global toggle.
- **Slides buried as a tab**, displayed at a fraction of the width of the PDF they were meant to replace.
- **Helpers panel vs student notes panel are two separate overlapping drawers** with different open/close states.
- **Mark Complete** is a small button competing with copy + fullscreen at the top-right, away from where reading actually ends (bottom of content).
- The student sees *everything at once*: page + drawer + sidebar. There is no "flow", only stacked surfaces.

### Correctness issues discovered (affect the redesign, fix first)

1. **Completion is not hydrated from the server.** `completedSections` is seeded only from `localStorage` (`StudyPage.tsx:775`). The `study/chapters` endpoint used by the sidebar does **not** return `isCompleted` (only `textbooks.py:27` does, and StudyPage never calls it). Result: progress is device-local, desyncs, and the green checkmarks/sidebar % are unreliable.
2. **`QuizGateway` completion indicator is always empty** — it loads sections from `study/sections/{stb}/{ch}` which returns only `{id,title}` (no `isCompleted`), yet renders `s.isCompleted`.
3. **`studentId` is read from `localStorage.getItem('studentId')`** and can be unset for token-based logins → backend upserts a NULL `StudentID` (non-nullable) → `IntegrityError` → HTTP 500 → the frontend swallows it and marks complete in "demo mode". The DB write is silently lost.
4. **API base inconsistency**: `StudyPage`/`QuizPage` build absolute `http://localhost:8000` URLs via env, while other components use relative `/api/...` through the Vite proxy; `vite.config.ts` (5000) and `vite.config.js` (8000) disagree.
5. **Study time** is computed from a timer that only increments every 60s, then sent as "seconds since one Date.now() call" — inaccurate by up to a minute per section.

---

## 3. Design principles

1. **One surface at a time.** The student reads in a single, full-width surface. Everything else is navigation or a confirmation.
2. **Three equivalent paths to completion.** Any section may be studied via **PDF**, **Slides**, or **Quick Notes** — and any of the three, worked through to the end, marks the section complete. The main textbook is no longer the *only* way to earn completion.
3. **Presentations are promoted to a first-class reading mode**, not a tab.
4. **Content chooses the experience.** The default surface for a section should be the richest available resource: slides → notes → PDF, with an explicit one-tap fallback when a resource is absent.
5. **Clutter is removed, not hidden.** Consolidate toggles, remove redundant TTS controls, and fold student notes into the study surface.

---

## 4. Proposed structure — "Study Modes" concept

At the top of the study page, a **mode switcher** replaces the current five helper tabs + PDF-only center:

```
┌─────────────────────────────────────────────────────────┐
│  Chapter 3 · Section 3.2  The Continental Drift Theory  │
│                                                         │
│   [ 📖 Textbook ]  [ 📽️ Slides ]  [ 📝 Quick Notes ]  [What should I study?]  │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │                                                   │  │
│  │          < THE ACTIVE READING SURFACE >           │  │
│  │    (PDF viewer  /  Slides player  /  Notes page)  │  │
│  │                                                   │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│   [Mark this section complete] — always visible below   │
└─────────────────────────────────────────────────────────┘
```

- **📖 Textbook** = today's PDF viewer (unchanged behaviour). Hidden/disabled when no PDF loads.
- **📽️ Slides** = new full-screen slides player in the center column (prev/next, counter, optional auto-advance, jump-to-slide). This is the promoted Presentations surface.
- **📝 Quick Notes** = Notes + Summary + Keywords + Solved Examples rendered as one continuous, scrollable "study sheet" (no tabs). Use it for revision or when neither PDF nor slides exist.
- **Auto mode** (recommended default): when a section opens, the app picks the richest available surface (slides → notes → PDF) and shows the switcher above so the student can change at any time. No modal, no drawer, no overlap.

### Where the current tabs go

| Today (drawer tabs) | Proposed |
|---|---|
| Notes / Summary | Merged into the **Quick Notes** surface (continuous scroll, no tab switching) |
| Keywords | Rendered inline in Quick Notes as term cards (already has that UI) |
| Solved Examples | Section within Quick Notes |
| Slides | Promoted to its own **Slides** mode |
| *Student notes panel* | A collapsible strip at the base of whichever surface is active (bottom sheet), not a separate fixed drawer |

### TTS cleanup

Replace the three read-aloud buttons with **one** "Read Aloud" control that reads whatever surface is active (PDF page, current slide, or the notes sheet). The rate dropdown stays; the point is one toggle, not three.

---

## 5. Completion — "studied, therefore complete"

Goal: *in the absence of the textbook, the student studies from helpers alone and thereby marks the section complete.*

Model: **applying the surface completes the section.** Each mode has a defined natural end:

| Mode | Natural end | Completion behaviour |
|---|---|---|
| 📖 Textbook | any time after PDF loads | same as today (or auto on reaching section's end page) |
| 📽️ Slides | reaching the **last slide** | show a "Finished this presentation — Mark complete" prompt; allow marking complete any time, but the on-finish prompt is the frictionless path |
| 📝 Quick Notes | scrolled to the bottom of the notes sheet | show the same "Mark complete" confirmation; allow anytime |

- Detect each end with existing signals: PDF page reach (already have `getCurrentPage`/end page from `startPage/endPage`), last slide in `presentation.slides.length`, scroll-to-bottom on notes.
- **One Mark Complete button, always in the same place**: pinned at the bottom of the reading surface (not competing with copy/fullscreen in the top bar).
- **Record completion source** — add a column to `StuSectionProgress` (e.g. `StudyMode` = `PDF`/`SLIDES`/`NOTES`). Cheap, and gives you analytics later ("42% complete via slides"), but optional for launch.
- **Hydrate from the server first.** Change the study chapters endpoint (or StudyPage's fetch) to include per-section `isCompleted`, and seed `completedSections` from the server response, with localStorage only as offline cache.

---

## 6. Priority fixes and implementation order

Suggested phasing so value lands early and risks stay small:

**Phase 0 — correctness (1–2 days, do first).**
1. Return `isCompleted` from `GET /api/study/chapters/{stbId}` and seed StudyPage from server + localStorage fallback.
2. Fix `studentId` resolution (use the authenticated student from `/api/study/student-grade` → token, not bare localStorage).
3. Fix the timer math; send real elapsed seconds.
4. Align the two Vite configs / API base URL.

**Phase 1 — promote Slides (2–3 days).**
5. Build the center-column slides player (`presentation.slides` data already exists via `GET /api/study/presentation`).
6. Add the mode switcher; default mode = richest available (`SLIDES` → `NOTES` → `PDF`), with the switcher always visible.
7. Keep the old drawer as-is behind a fallback flag during rollout.

**Phase 2 — Quick Notes surface + declutter (2–3 days).**
8. Merge Notes/Summary/Keywords/Examples into one scrollable Quick Notes surface; delete the drawer tabs.
9. One TTS control; student notes as a bottom sheet.

**Phase 3 — completion path (1–2 days).**
10. End-of-surface "Mark complete" prompts (last slide, notes end, PDF end-page).
11. Record `StudyMode` on completion; paint checkmarks from server data (fixes QuizGateway too by having it read the same endpoint).

---

## 7. Recommended default — concrete example

A student opens *GR9-Geography, Chapter 3, Section 3.2*:

1. App auto-opens **📽️ Slides** (the richest resource present).
2. They page through slides; the counter advances; on the last slide a soft prompt appears: *"You've finished this section's presentation. Mark complete?"* → **Confirm**.
3. `POST /api/study/progress/complete` fires once with `studyMode: "SLIDES"`; sidebar shows a green check and 100% chapter progress.
4. If they'd rather read the PDF, one tap on **📖 Textbook** keeps the PDF viewer identical to today — no mode punishes them.
5. If a section has only notes (or nothing), the switcher simply shows the available surface(s) and disables the missing ones; `Mark complete` still works from any surface.

This directly satisfies all three goals: (1) clutter collapses to one surface + one switcher + one button; (2) helpers alone complete a section — PDF is optional, not mandatory; (3) Presentations get a full-screen, primary position.

---

*Verified against live DB counts (section/note/slide/quiz coverage and `StuSectionProgress`) and the current implementation in `StudyPage.tsx`.*