# Grade 9 / 10 / 11 Offline Builds â€” Progress Checkpoint

> If the session dies (WiFi drop), read this file first and resume from `NEXT`.

## Goal
Build offline APKs for Grades 9, 10, 11 using the same logic as the working
Grade 12 build, **excluding all ESLCE content/feature** from those three
builds. Free ("common") vs Premium licensing logic stays identical.

## Grade codes

| Grade | code | appId | textbook folder | PDFs |
|---|---|---|---|---|
| 9  | MID9A  | com.menen.oshs.g9  | C:\Student Assist\Compact Textbook\Textbooks\G9  | 12 |
| 10 | HIG10A | com.menen.oshs.g10 | C:\Student Assist\Compact Textbook\Textbooks\G10 | 12 |
| 11 | HIG11A | com.menen.oshs.g11 | C:\Student Assist\Compact Textbook\Textbooks\G11 | 10 |
| 12 | HIG12A | com.menen.oshs.g12 | C:\Student Assist\Compact Textbook\Textbooks\G12 | 10 |

G9/G10 also have Amharic (AMH), Citizenship (CIT) and Health (HLT) subjects â€”
G11/G12 do not. G11/G12 have Agriculture (AGR); G9/G10 do not.

## Pipeline
```
export_content.py <GRADE>        Postgres MERP_OSHS -> offline-app/content/<GRADE>/*.json
import_to_sqlite.py <GRADE>      JSON -> offline-app/content/<GRADE>/menen_offline_<GRADE>.db
node scripts/build-grade.js <GRADE>   DB + PDFs -> frontend/android/.../app-debug.apk
```

## Source DB availability (verified)
Postgres on localhost:5432 db `MERP_OSHS` is up and has all four grades.

| grade | textbooks | chapters | sections | notes | slides | quizzes | exam Qs |
|---|---|---|---|---|---|---|---|
| MID9A  | 12 | 74 | 419 | 384 | 1069 | 2029 | 4243 |
| HIG10A | 12 | 71 | 391 | 345 |  715 | 2641 | 4695 |
| HIG11A | 10 | 65 | 600 | 368 |  810 | 1875 | 4833 |
| HIG12A | 10 | 69 | 480 | 395 | 1222 | 1605 | 4397 |

ESLCE bank = 6192 questions (G12 only; must NOT ship in G9/G10/G11).

## Status

| # | Step | Status |
|---|---|---|
| 1 | Checkpoint file created | DONE |
| 2 | Fix `GRADE_MAP`/`GRADE_LABELS` MID9A bug (db.ts) | DONE |
| 3 | `--no-eslce` opt-out in export_content.py + import_to_sqlite.py | DONE |
| 4 | build-grade.js per-grade PDF dir + STB_PDF map | DONE |
| 5 | pdfAssets.ts per-grade maps (textbookPdfs.json) | DONE |
| 6 | Export MID9A/HIG10A/HIG11A (no ESLCE) | DONE |
| 7 | Import 3 grades -> SQLite DBs | DONE |
| 8 | Gate ESLCE UI off for non-G12 builds | DONE |
| 9 | Typecheck + lint | DONE (tsc clean; 15 pre-existing lint errors, 0 new) |
| 10 | Build G9/G10/G11 APKs | DONE |
| 11 | Verify APK contents (package, label, DB, PDFs, ESLCE) | DONE |
| 12 | Rebuild G12 so it carries today's fixes | DONE |

NEXT = nothing pending.

## Artifacts
`apk-builds/`
- `MenenOSHS-offline-G9-debug.apk`     173.2 MB  com.menen.oshs.g9   "Menen Grade 9"
- `MenenOSHS-offline-G10-debug.apk`    112.4 MB  com.menen.oshs.g10  "Menen Grade 10"
- `MenenOSHS-offline-G11-debug.apk`    385.1 MB  com.menen.oshs.g11  "Menen Grade 11"
- `MenenOSHS-offline-G12-debug-v2.apk` 120.4 MB  com.menen.oshs.g12  "Menen Grade 12"  <-- today's build, has all fixes
- `MenenOSHS-offline-G12-debug.apk`    120.4 MB  (original, 2026-10-01, kept as-is)
- `MenenOSHS-online-debug.apk`          28.3 MB  com.menen.oshs  "Menen Online"

All five verified: correct package + label, correct grade_id in the SQLite DB,
only that grade's textbook PDFs present, ESLCE counts 0/0 for G9-G11 and 6192
questions for G12.

DBs: `offline-app/content/<GRADE>/menen_offline_<GRADE>.db`
Copies: `offline-app/dist/grade/`

**Careful:** `frontend/android/app/build/outputs/apk/debug/app-debug.apk` currently
holds the LAST built grade (G11). Install from `apk-builds/` to avoid picking
up the wrong grade.

## Notes / gotchas
- **PDF accumulation bug (FIXED this session):** `frontend/public/pdfs` was never
  cleared between grades, so Grade 12's textbooks rode along inside the Grade 9
  APK and every APK after the first grew by ~100-240 MB of foreign PDFs.
  `build-grade.js` now `rm -rf`s that directory before copying. Rebuilt all three.
- **Grade 9 id bug (FIXED this session):** `GRADE_MAP.G9` was `HIG09A` but the
  database uses `MID9A`, so a G9 build silently labelled itself "Grade 12" and
  ESLCE gating would have mis-fired. Fixed in `db.ts` + `schemaPatch.ts`.
- ESLCE was excluded at the *export* stage (`--no-eslce`), not just the UI, so
  the 6,192-question bank is not present in those APKs at all â€” the `eslce_*`
  tables exist but are empty. The tab, onboarding text, activation and settings
  copy all switch off too.
- `build-grade.js` overwrites `frontend/android/app/build.gradle` applicationId and
  `strings.xml` app_name, restoring both in a `finally` block. Do not run two
  grades concurrently.
- Only one real SQLite DB existed in the repo; `.db.bak` is a stale artifact.
- Service `postgresql-x64-18` reports Stopped but port 5432 answers â€” trust the port.
- ESLCE free/premium logic is unchanged: same `isPremium()`, same device-code
  activation, same 5-runs/day free tier. Only the wording differs per grade.
---

# Session 2 — Public APK Download Facility (DONE)

> Read this section if the session dies (WiFi drop) and say "continue".

## Goal
Give the site a public download facility for the 5 APKs. The landing page's
"Get APK" button used to route to the web login page — it now goes to a
dedicated Downloads page that requires no sign-in.

## MEGA source
`https://mega.nz/folder/JVMCARZI#bGLOV-MhLopW-EBZNVG41Q` (5 files, G11 uploaded OK)

| card | file in folder | link id | size |
|---|---|---|---|
| offline-g9  | MenenOSHS-offline-G9-debug.apk     | cJ9HgCaD | 173.2 MB |
| offline-g10 | MenenOSHS-offline-G10-debug.apk    | QZtzEQxL | 112.4 MB |
| offline-g11 | MenenOSHS-offline-G11-debug.apk    | lE0FyRBA | 385.1 MB |
| offline-g12 | MenenOSHS-offline-G12-debug-v2.apk | tFtBVJbR | 120.4 MB |
| online      | MenenOSHS-online-debug.apk         | sc813aDI | 28.3 MB |

Deep-link format (verified against real MEGA links):
`https://mega.nz/folder/{folderId}#{folderKey}/file/{fileId}`

## What was added
- `frontend/src/services/apkDownloads.ts` — catalog + cached megajs resolver.
  Matches files by substring (`offline-g12` etc) so a `-v2` suffix still matches.
  Unmatched file after a successful folder load => `status: 'missing'`
  (renders "Coming soon"). Folder lookup failure => `status: 'pending'`
  (every card falls back to the plain folder URL, so the page always works).
- `frontend/src/components/DownloadsPage.tsx` — public page, 4 offline cards
  (1x4 grid) + online card + install help + "Browse every file on MEGA".
- `frontend/src/App.tsx` — public route `/downloads` with its own `<Seo>`.
- `frontend/src/components/LandingPage.tsx` — APK + Offline cards now
  `action: 'downloads'`; new `downloads` branch in `handleAction`;
  "Downloads" link added to desktop and mobile nav.
- `frontend/scripts/prerender.mjs` — generates `dist/downloads/index.html`
  shell (same pattern as `/about`), so the route works on static hosts.

## Verified
- `npx tsc -b` EXIT=0
- `npx eslint src/components/DownloadsPage.tsx src/services/apkDownloads.ts` EXIT=0
- `npm run build` EXIT=0 (tsc + vite + prerender)
- `dist/downloads/index.html` has the correct `<title>` and `<description>`
- Node probe confirms all 5 cards resolve `status=ready` with real sizes

## NEXT = nothing pending.
Optional follow-ups (not started): `prerender.mjs` line 67 `/about` description
replace is broken (searches for `&amp;` but index.html has a raw `&`) — pre-existing.

---

# Session 3 - In-page download (no MEGA page for visitors) (DONE)

## Why
Owner's concern: visitors must not land on / browse the MEGA folder. A MEGA
folder link is read-only and folder-scoped (it never exposes the account,
email or other folders), but it DOES open mega.nz and show the folder listing.

## The hard constraint (verified)
MEGA is end-to-end encrypted, so the bytes on their CDN are ciphertext.
Probe: raw CDN bytes start 0e94fe07... (not a ZIP); the same bytes decrypted
client-side with the key start 504b0304 = "PK\x03\x04".
=> No URL can hand the browser a ready APK. Something holding the key must
   decrypt client-side: either mega.nz (old behaviour) or our own page.

## What changed
frontend/src/services/apkDownloads.ts
- resolveApkLinks() now also caches the megajs nodes in nodeCache.
- New downloadApk(match, onProgress): streams node.download(), reports
  progress, and saves. Uses the File System Access API when present
  (desktop Chromium); otherwise buffers to a Blob and clicks a download
  anchor, which on Android routes through the normal Downloads flow.

frontend/src/components/DownloadsPage.tsx
- Card button is now an in-page download with a % progress bar, a
  "downloaded" state, and an inline error line with retry.
- Removed the "Browse every file on MEGA" link and the MEGA install steps.
  The visitor is never sent to mega.nz.

## Verified
- npx tsc -b EXIT=0 (needed AsyncIterable<Uint8Array<ArrayBuffer>> for
  BlobPart assignability under TS 5.7 generic typed arrays)
- npx eslint on both files EXIT=0
- npm run build EXIT=0, dist/downloads/index.html still prerenders
- Full download+decrypt run of the online APK: 29,627,008 bytes received ==
  expected, starts "PK", ZIP EOCD present, 625 entries.

## Known trade-offs (accepted)
- The transfer runs in the browser tab: no resume/pause, tab must stay
  foreground, and the 385 MB G11 build decrypts in JS on the device.
- MEGA's anonymous per-IP transfer quota still applies (509 errors). Unchanged
  from before, since de/encryption was always client-side.
- The folder URL still exists inside the JS bundle, so a determined user could
  extract it. To remove that too, the APKs have to move off MEGA (GitHub
  Releases / R2 / B2) or be proxied through the backend.

## NEXT = nothing pending.
