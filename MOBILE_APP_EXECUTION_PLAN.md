# MERP Student Assistant - Mobile Development Execution Plan

## Current State (Baseline)
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS (responsive SPA)
- **Backend**: FastAPI + PostgreSQL + Socket.IO (deployed at menen-oshd-api.pxxl.click)
- **Content**: 44 textbook PDFs (G9-G12, 3-145 MB each), served as static files
- **Mobile/PWA**: None exists. No service worker, no manifest, no Capacitor.
- **Auth**: JWT-based (access + refresh tokens stored in localStorage)
- **Features**: Study, Quiz, Exam, ESLCE Prep, Chat, Payment Verification, Reports

---

## Phase Overview

| Phase | Description | User Model | Connectivity | Code Reuse |
|-------|-------------|------------|--------------|------------|
| **3** | Web app (keep as-is) | Multi-user | Online only | Baseline |
| **1** | Android frontend to web app | Multi-user | Online required | ~95% shared |
| **2** | Standalone offline mini-app | Single-user (device) | Fully offline | ~60% shared |

---

## Recommended Execution Order

### Phase 1 First (Android Frontend Wrapper)
**Why first:**
- Lowest risk, fastest delivery
- Reuses existing codebase almost entirely
- Validates mobile UX before building offline version
- Students can start using the app on phones immediately
- Revenue generating (same payment system works)

### Phase 2 Second (Standalone Offline App)
**Why second:**
- Benefits from Phase 1 UX lessons
- Requires significant architectural decisions (local DB, content bundling)
- Can be built incrementally (start with study, add quiz/exam later)
- Needs grade-specific APK builds (different content per build)

---

## PHASE 1: Android Frontend (Online Wrapper)

### Architecture Decision

**Recommended: Capacitor** (by Ionic)

| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| TWA (Trusted Web Activity) | Lightest, pure PWA in Play Store | No native API access, limited offline | Good enough if PWA only |
| **Capacitor** | Full native access, reuses React code, offline capable, push notifications | Slight learning curve | **Best fit** |
| React Native | Full native performance | Complete rewrite, 2 codebases | Overkill |
| WebView wrapper | Simple | Poor UX, no native features | Avoid |

### Technical Architecture
```
Android APK (Capacitor Shell)
├── Capacitor Core (bridge to native)
├── React App (existing, bundled)
├── capacitor.config.ts (app ID, server config)
├── Native Plugins:
│   ├── @capacitor/push-notifications (FCM)
│   ├── @capacitor/splash-screen
│   ├── @capacitor/status-bar
│   ├── @capacitor/keyboard
│   └── @capacitor/haptics (optional)
└── Points to: https://menen-oshd-app.pxxl.click (or bundles dist/)
```

### Execution Steps (in order)

#### Step 1: Add PWA Foundation (prerequisite for both phases)
**Time: 2-3 hours**

1. Install `vite-plugin-pwa` in frontend
2. Create `public/manifest.json` with app name, icons, theme colors
3. Create `public/sw.js` service worker (cache static assets, API responses)
4. Update `index.html` with manifest link and meta tags
5. Generate app icons (192x192, 512x512) from existing logo
6. Configure Vite PWA plugin in `vite.config.ts`
7. Test: app should show "Add to Home Screen" prompt on mobile browser

**Files to create/modify:**
- `frontend/public/manifest.json` (new)
- `frontend/public/icons/` (new, 4 sizes)
- `frontend/vite.config.ts` (add PWA plugin)
- `frontend/index.html` (add meta tags)

#### Step 2: Initialize Capacitor
**Time: 2-3 hours**

1. `npm install @capacitor/core @capacitor/cli`
2. `npx cap init "Menen OSHS" "com.menen.oshs"` 
3. `npm install @capacitor/android`
4. `npx cap add android`
5. Create `capacitor.config.ts`:
   ```ts
   import { CapacitorConfig } from '@capacitor/cli';
   const config: CapacitorConfig = {
     appId: 'com.menen.oshs',
     appName: 'Menen OSHS',
     webDir: 'dist',
     server: {
       url: 'https://menen-oshd-app.pxxl.click',
       cleartext: false
     },
     plugins: {
       PushNotifications: {
         presentationOptions: ['badge', 'sound', 'alert']
       }
     }
   };
   export default config;
   ```
6. Set `server.url` to production URL (online mode) or comment out for bundled mode
7. Test: `npx cap sync android` + open in Android Studio

#### Step 3: Add Native Plugins
**Time: 3-4 hours**

1. `npm install @capacitor/push-notifications`
2. `npm install @capacitor/splash-screen`
3. `npm install @capacitor/status-bar`
4. `npm install @capacitor/keyboard`
5. Configure in `capacitor.config.ts`
6. Add FCM setup in `android/app/google-services.json` (from Firebase console)
7. Implement push notification registration in `AuthContext.tsx` (after login)
8. Configure splash screen and status bar colors

**Files to modify:**
- `frontend/src/context/AuthContext.tsx` (add FCM token registration)
- `frontend/capacitor.config.ts` (plugin config)

#### Step 4: Android-Specific Adjustments
**Time: 4-6 hours**

1. Handle Android back button in React Router
2. Fix status bar overlap on Android (safe area insets)
3. Handle keyboard open/close (input focus scroll)
4. Test all pages on Android device/emulator
5. Fix any CSS issues (viewport, safe areas, touch targets)
6. Handle deep links (if needed for payment callback)

#### Step 5: Build and Publish
**Time: 2-3 hours**

1. Build frontend: `npm run build`
2. Sync: `npx cap sync android`
3. Open Android Studio, build APK/AAB
4. Sign with release keystore
5. Upload to Google Play Console (internal testing first)
6. Configure Play Store listing (screenshots, description, etc.)

### Phase 1 Total Estimated Time: 13-19 hours

---

## PHASE 2: Standalone Offline Mini-App

### Architecture Decision

**Recommended: Capacitor + SQLite + Bundled Content**

This reuses the existing React codebase with major modifications for offline-first operation.

### Technical Architecture
```
Android APK (Capacitor Shell)
├── React App (modified for offline-first)
├── Capacitor Core
├── SQLite Database (local)
│   ├── Users (single user, local auth)
│   ├── Study Content (chapters, sections, notes)
│   ├── Quiz Questions (pre-loaded per grade)
│   ├── Exam Questions (pre-loaded per grade)
│   ├── ESLCE Questions (pre-loaded)
│   ├── Progress/Results (local tracking)
│   ├── Highlights/Bookmarks
│   └── Chat messages (local only)
├── Textbook PDFs (bundled per grade, ~10-45 files)
├── Offline Quiz Engine (all logic local)
└── Offline Exam Engine (all logic local)
```

### Content Sizing (per grade APK)

| Grade | PDFs | Total Size (approx) |
|-------|------|---------------------|
| G9 | 12 textbooks | ~400-600 MB |
| G10 | 12 textbooks | ~400-600 MB |
| G11 | 10 textbooks | ~350-500 MB |
| G12 | 10 textbooks | ~350-500 MB |

**Note:** PDFs can be compressed. Consider converting to compressed HTML/text for study content (much smaller). PDFs only needed for "read textbook" feature.

### Execution Steps (in order)

#### Step 6: Design Offline Data Architecture
**Time: 6-8 hours**

1. Design SQLite schema (mirror backend models):
   - `users` (single user, local password hash)
   - `textbooks` (metadata: grade, subject, filename)
   - `chapters` (from backend API, pre-extracted)
   - `sections` (from backend API, pre-extracted)
   - `section_content` (text content, extracted from PDFs)
   - `questions` (quiz/exam questions, all types)
   - `quiz_sessions` (start, answers, results)
   - `exam_sessions` (start, answers, results)
   - `eslce_exams` + `eslce_questions`
   - `progress` (completed sections, scores)
   - `highlights` + `bookmarks`
   - `study_notes` (student notes, local)
   - `app_settings` (grade selection, theme, etc.)

2. Create data export scripts (Python) to extract from backend DB:
   - `export_grade_data.py` — exports all content for a specific grade
   - `export_questions.py` — exports question bank per grade
   - `export_eslce.py` — exports ESLCE exam data

3. Create SQLite schema migration files

**Files to create:**
- `offline-app/schema.sql` (new project)
- `offline-app/scripts/export_from_backend.py`
- `offline-app/scripts/import_to_sqlite.py`

#### Step 7: Extract and Prepare Content
**Time: 8-12 hours**

1. Create content extraction pipeline:
   - Run export scripts against backend DB
   - Extract text content from PDFs (for offline reading)
   - Compress images if needed
   - Generate per-grade content bundles

2. Content structure per grade:
   ```
   content/G9/
   ├── metadata.json (grade info, subject list)
   ├── textbooks/ (PDFs, ~400-600MB)
   ├── chapters.json (extracted chapter structure)
   ├── sections.json (extracted section text)
   ├── questions/ (quiz questions by chapter-section)
   ├── exams/ (exam questions)
   ├── eslce/ (ESLCE questions, shared across grades)
   └── icons/ (subject icons)
   ```

3. Create content compression pipeline:
   - Compress PDFs (reduce quality if needed, ~50% size reduction)
   - Use gzip for JSON data
   - Consider stripping images from PDFs for study text (separate full PDFs)

**Files to create:**
- `offline-app/content/` directory structure
- `offline-app/scripts/extract_pdf_text.py`
- `offline-app/scripts/compress_content.py`

#### Step 8: Build Offline App Shell
**Time: 10-14 hours**

1. Create new Capacitor project (or modify existing):
   ```
   offline-app/
   ├── src/ (modified React app)
   │   ├── context/
   │   │   ├── OfflineAuthProvider.tsx (local auth, no API)
   │   │   └── OfflineStudyContext.tsx (local data access)
   │   ├── services/
   │   │   ├── localDb.ts (SQLite wrapper)
   │   │   ├── contentLoader.ts (load from bundled content)
   │   │   └── quizEngine.ts (local quiz logic)
   │   ├── components/ (reuse most from web app)
   │   └── pages/ (modified for offline)
   ├── android/
   ├── capacitor.config.ts
   └── package.json
   ```

2. Implement local database layer:
   - `@capacitor-community/sqlite` for SQLite
   - CRUD operations mirroring backend API calls
   - Pre-populate DB on first launch from bundled content

3. Implement single-user auth:
   - Local username/password (hashed with bcrypt in WASM or simple hash)
   - No server communication
   - Profile stored locally

**Files to create:**
- `offline-app/src/services/localDb.ts`
- `offline-app/src/services/contentLoader.ts`
- `offline-app/src/context/OfflineAuthProvider.tsx`
- `offline-app/src/context/OfflineStudyContext.tsx`

#### Step 9: Adapt Frontend for Offline
**Time: 12-16 hours**

1. Replace all `apiFetch()` calls with local DB queries
2. Replace Socket.IO chat with local notes (no chat in offline)
3. Remove payment system (app is pre-licensed per grade)
4. Remove student status dashboard (no server data)
5. Modify study pages to load from local content
6. Modify quiz engine to use local question bank
7. Modify exam engine to use local questions
8. Modify ESLCE to use local questions
9. Add grade selection screen on first launch
10. Add content download progress indicator
11. Handle offline-specific UI (no "loading" spinners, instant responses)

**Key modifications:**
- `StudyPage.tsx` → load content from SQLite
- `QuizPage.tsx` → generate quizzes from local questions
- `QuizGateway.tsx` → local chapter-section selection
- `ExamPage.tsx` → local exam sessions
- `ExamSessionPage.tsx` → local question flow
- `PracticeExamPage.tsx` → local practice
- `FormalExamPage.tsx` → local formal exam
- `EslceExamSession.tsx` → local ESLCE
- `EslcePracticeMode.tsx` → local practice
- Remove: ChatHub, PaymentPage, StudentStatusDashboard, contact form

#### Step 10: Content Bundling and APK Build
**Time: 6-8 hours**

1. Create build pipeline for per-grade APKs:
   ```bash
   # Build grade-specific APK
   node scripts/build-grade.js G9
   # → Bundles content/G9/ into android/app/src/main/assets/
   # → Builds APK: MenenOSHS-G9.apk
   ```

2. Android asset optimization:
   - Use Android Asset Pack (AAB) for large content (>150MB)
   - Or split APKs by grade (one base APK + grade content packs)
   - Configure Gradle for large asset handling

3. Build 4 APK variants (G9, G10, G11, G12):
   - Each ~400-700MB (textbooks are large)
   - Consider offering download-all or per-subject options

4. Publish to Play Store (as separate listings or one listing with in-app grade selection)

**Files to create:**
- `offline-app/scripts/build-grade.js`
- `offline-app/android/app/build.gradle` (asset pack config)

#### Step 11: Testing and Polish
**Time: 8-10 hours**

1. Test on low-end Android devices (2GB RAM, Android 8+)
2. Test first-launch experience (content loading)
3. Test all study flows offline
4. Test quiz/exam scoring accuracy
5. Test progress tracking
6. Test highlights and notes
7. Performance optimization (lazy loading, memory management)
8. Battery usage optimization
9. Storage management (clear cache, etc.)

### Phase 2 Total Estimated Time: 50-78 hours

---

## Combined Execution Order

| # | Step | Phase | Est. Hours | Dependencies |
|---|------|-------|-----------|--------------|
| 1 | PWA Foundation | 1+2 | 2-3 | None |
| 2 | Capacitor Init | 1 | 2-3 | Step 1 |
| 3 | Native Plugins | 1 | 3-4 | Step 2 |
| 4 | Android Adjustments | 1 | 4-6 | Step 3 |
| 5 | Build & Publish Phase 1 | 1 | 2-3 | Step 4 |
| 6 | Data Architecture Design | 2 | 6-8 | None |
| 7 | Content Extraction | 2 | 8-12 | Step 6 |
| 8 | Offline App Shell | 2 | 10-14 | Step 7 |
| 9 | Frontend Offline Adaptation | 2 | 12-16 | Step 8 |
| 10 | Content Bundling & APK | 2 | 6-8 | Step 9 |
| 11 | Testing & Polish | 2 | 8-10 | Step 10 |
| **Total** | | | **63-87 hours** | |

---

## Risk Factors and Mitigations

### Phase 1 Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| Play Store rejection | Delays launch | Follow Play Store guidelines, use TWA if Capacitor fails |
| Push notification setup complexity | 1-2 day delay | Start Firebase setup early, test on real device |
| Android-specific CSS bugs | UX issues | Test on 3+ device sizes early |

### Phase 2 Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| APK size too large (>2GB) | Play Store limit | Use AAB with asset packs, compress PDFs, offer per-subject download |
| SQLite performance with large content | Slow UX | Index properly, lazy load content, compress text |
| PDF rendering offline | Memory issues | Use pdfjs-dist (already in project), render on-demand |
| Grade-specific builds maintenance | Ongoing effort | Automate build pipeline, single codebase with grade config |
| Low-end device compatibility | Crashes | Test on 2GB RAM devices, optimize memory usage |

---

## Decision Points (Need User Input)

1. **Phase 1 - Online vs Bundled:**
   - Option A: APK loads from `menen-oshd-app.pxxl.click` (requires internet)
   - Option B: APK bundles the React dist (works offline for UI, needs API for data)
   - **Recommendation:** Option A first (simpler), add offline caching later

2. **Phase 2 - APK Size Strategy:**
   - Option A: One APK per grade (~400-700MB each)
   - Option B: Base APK + downloadable content per grade (smaller initial download)
   - Option C: Base APK + content pack per subject (smallest download, most flexible)
   - **Recommendation:** Option B (base + grade download)

3. **Phase 2 - Chat Feature:**
   - Option A: Include local chat (messages stored locally, no sending)
   - Option B: Remove chat entirely from offline app
   - Option C: Include simple note-taking instead of chat
   - **Recommendation:** Option C (notes are more useful offline)

4. **Phase 2 - Content Updates:**
   - How to update content when new textbooks/questions are added?
   - Option A: New APK version
   - Option B: In-app content update (download from server when online)
   - **Recommendation:** Option B (when online, check for updates)

---

## Prerequisites

- [ ] Android Studio installed
- [ ] Google Play Developer account ($25 one-time)
- [ ] Firebase project created (for push notifications)
- [ ] Signing keystore generated for APK signing
- [ ] Backend API stable and tested
- [ ] All textbook PDFs finalized

---

*Document created: August 23, 2026*
*Project: MERP Student Assistant (Menen Soft)*
