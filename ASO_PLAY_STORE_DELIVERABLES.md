# Menen Student Assistant — Play Store / App Store Optimization (ASO) Deliverables

Prepared for the Play Store listing of **Menen Student Assistant** (package `com.menen.oshs`, app name "Menen OSHS").

---

## 1. Listing Basics

| Field | Value |
|---|---|
| App name | **Menen Student Assistant** |
| Short name | Menen OSHS |
| Package ID | `com.menen.oshs` |
| Category | Education |
| App type | Free (freemium; premium add-on via in-app purchase) |
| Contact | Bole Road, Addis Ababa, Ethiopia |
| Default language | English (en-US) |

---

## 2. App Title (30 chars max)

### Recommended primary
```
Menen Student Assistant
```

### Why
- Keeps the exact brand name for direct-search and brand recall.
- Under 30 characters, fits the full title rule, unlikely to be truncated.
- "Student Assistant" is a high-intent search term for the target audience.

### Alternative (if optimizing for category terms)
```
Menen: Ethiopian Study & Exam Prep
```
> 32 chars — exceeds the 30 limit, so only use if Google relaxes the field; otherwise keep the primary.

**Keyword priority in the short/long description instead of the title.**

---

## 3. Short Description (80 chars max)

Chosen (79 chars):
```
Menen Student Assistant — Ethiopian high school notes, quizzes & ESLCE prep. Works offline!
```

Alternative (79 chars):
```
Study Ethiopian notes, quizzes & ESLCE past papers. Free + offline mode. Menen Student Assistant
```

---

## 4. Full Description

```
Menen is the all-in-one learning companion built for Ethiopian high school students (Grade 9–12). Study smarter, test yourself, and walk into your exams fully prepared.

WHAT YOU CAN DO
• Study full subject notes, chapter by chapter
• Practice section-level quizzes instantly
• Take advanced practice exams
• Solve full ESLCE national exam past papers & modules
• Track your progress and review your report card
• Works 100% OFFLINE — download the app + content once, then study anywhere, anytime, with no internet

THREE WAYS TO LEARN
1. Browser — open the web app on any device, no install needed
2. APK — install the native Android app for a faster experience
3. Offline — download your grade's content and study with zero connectivity

WHY STUDENTS LOVE MENEN
• Aligned to the Ethiopian curriculum
• Focused exam preparation (ESLCE / Grade 12 national exams)
• Progress tracking that syncs across devices
• Simple, distraction-free design

FREE vs PREMIUM
• Free: full subject notes, basic quizzes per section, progress tracking, core app engine, 100% offline support.
• Premium: advanced practice exams, full ESLCE past papers & modules, performance analytics & detailed reports, exam content delivered after purchase.

[IMPORTANT] ESLCE - Ethiopian School Leaving Certificate Examination
[IMPORTANT] Works offline for areas with limited internet
[IMPORTANT] Free to start — upgrade only when you're ready for full exam prep

Data security: your account uses secure sign-in. Offline study data stays on your device. Premium content is delivered separately after purchase.

Contact: Bole Road, Addis Ababa, Ethiopia — support via the About page in-app.
```

---

## 5. Store Keywords & Search Terms

High-value search terms to seed into title + short/long description (Google reads the description for ranking):

- Ethiopian high school
- ESLCE
- Grade 12
- national exam
- past papers
- study app Ethiopia
- quiz
- exam prep
- offline
- Addis Ababa
- Grade 9 / 10 / 11
- student assistant

Avoid keyword-stuffing; use natural phrasing as written above.

---

## 6. Visual Assets Checklist

| Asset | Spec | Status |
|---|---|---|
| App icon (Menen logo) | 512×512 PNG, corner radius per Play style | Ready (`frontend/public/icons/icon-512x512.png`) |
| Feature graphic | 1024×500 PNG | Todo — design with BRAND `#2563eb`/indigo `#4F46E5`, tagline "Ethiopian Study & ESLCE Prep", 3-way access icons (Browser/APK/Offline) |
| Phone screenshots | min 2, recommend 6–8, 1080×1920 | Todo — capture: Landing, Study notes, Quiz, Exam/ESLCE, Report card, Offline mode home |
| Video (optional) | 30s, ≤2MB | Todo — hero screen record of notes → quiz → ESLCE flow |
| Promo text (80 chars preview on Store) | — | "Ethiopian high school notes, quizzes & ESLCE prep that works offline. Study anywhere!" |

---

## 7. Conversion Rate Optimization (CRO) Checklist

**First screen (screenshot 1 — the one that makes or breaks installs):**
- Show the study-notes screen with real Kenyan/Ethiopian textbook content, not the blank login.
- Overlay 2 short benefit chips: "Notes • Quizzes • ESLCE".

**Screenshot order (matches the buyer journey):**
1. Study notes (value in 2s)
2. Quiz instant-feedback
3. ESLCE past papers
4. Report card / progress
5. Offline mode (differentiator)
6. Premium upgrade (revenue)

**Landing-page conversion hooks to mirror in-store:**
- "Works 100% offline" — headline differentiator, repeat early.
- "Free to start" — reduces signup friction.
- "Grade 9–12" — clarifies audience instantly.

**Install-to-signup path (in-app):**
- Do NOT block with login. Show landing → free browse of notes sampling → prompt register only when starting a quiz/exam. (Verify current landing behavior.)
- After registration, land directly on `/dashboard`, not `/payment` (free users can use core features first).

---

## 8. In-App Review & Rating Checklist

### Google Play In-App Review API (`com.google.android.play:review`)
1. Add dependency to `frontend/android/variables.gradle` / app `build.gradle` (check current Capacitor version support).
2. Request review via the JS bridge — Capacitor doesn't ship a built-in review plugin; use `@capacitor-community/app-rate` or a small custom plugin calling `ReviewManager`.
3. **Trigger timing (the single biggest driver of 5-star ratings):**
   - After a student **completes an ESLCE practice exam with a score ≥ target**, or
   - After **5+ consecutive study days** (daily login counter),
   - Show the in-app prompt at most **once every 90 days** (`launchCount`/`minDays` guardrails).
4. Never trigger on app open, on error screens, or right after payment.

### Ratings recovery
- Add a "Rate Us" link in `SettingsPage` → Google Play store page URL.
- Add a gentle feedback path ("Something not right? Tell us instead of a low star") that opens the About/contact form.

### Play Console hygiene
- Set up **full store listing** (all screenshots + feature graphic + promo text) before launching controlled rollout.
- Enable **user-install metrics** and reply to reviews within 48h.
- Track **store listing visitors → installs** in Play Console; iterate on screenshot 1/2 every 2–4 weeks.

---

## 9. Rollout Recommendations

1. Submit with the primary title + the full description above.
2. Run a **closed/staged rollout (10–20%)** first, watch crash-free rate (Play Console) and 1-star reviews.
3. If first-day reviews average <4.0, review trigger timing and onboarding friction before full rollout.
4. After 2 weeks, add A/B-tested screenshot order (Play Console experiments) using the CRO order in §7.

---

## 10. Outstanding Implementation Items (owner: dev)

- [ ] Build Android feature graphic + screenshot set (design task).
- [ ] Add Play In-App Review plugin + trigger logic (`@capacitor-community/app-rate`).
- [ ] Add "Rate Us" link in Settings.
- [ ] Confirm landing isn't hard-blocked by login (free-browse before signup).