# SEO / ASO Optimization — Deliverables Report

**Date:** September 2026
**App:** Menen Student Assistant (`com.menen.oshs`)
**Public URLs:** `https://menen-oshs-app.pxxl.click` (canonical) · `https://menenoshs.onrender.com` (fallback)

---

## Part A — Search Engine Optimization (Web)

### A.1 What was implemented (committed `f05082c`)

| # | Item | Detail | Where |
|---|---|---|---|
| 1 | Pre-rendered landing content | Standalone `scripts/prerender.mjs` runs after every `vite build`, embeds the full landing page (headline, access modes, features, FAQ) as static HTML inside `#root` so Google indexes real content without executing JS. React hydrates on top for interactivity. Also writes `dist/about/index.html`. | `scripts/prerender.mjs` + `package.json` build hook |
| 2 | Primary meta block | Optimized `<title>`, description, keywords, author, authoritative `robots` (`index, follow, max-image-preview:large`). | `index.html` |
| 3 | Open Graph + Twitter cards | `og:type/site_name/title/description/url/image/locale`, `twitter:card/title/description/image` — proper previews on Facebook, Telegram, X. | `index.html` |
| 4 | Canonical + geographic | `canonical` → Pxxl (primary), geo.region/placename/position (Addis Ababa/ET). | `index.html` |
| 5 | Structured data (JSON-LD) | `SoftwareApplication` (EducationalApplication, freemium offer), `Organization` (logo/address), `FAQPage` (5 landing FAQs — rich results eligible). All validated as parseable. | `index.html` |
| 6 | Per-route SEO component | `Seo.tsx` updates `document.title`, meta description, and canonical at runtime for `/` and `/about` (React navigation otherwise leaves the default head). | `src/components/Seo.tsx`, wired in `src/App.tsx` |
| 7 | `sitemap.xml` | 4 public URLs (`/`, `/about`, `/login`, `/register`), correct priorities. | `public/sitemap.xml` |
| 8 | `robots.txt` | Allow public pages; disallow auth/private dashboard, chat, payment, reports. Points to sitemap. | `public/robots.txt` |
| 9 | `llms.txt` | LLM-readable summary of what the app is, key pages, and FAQ. | `public/llms.txt` |
| 10 | Core Web Vitals | `preconnect` to both API hosts reduces connection latency; prerender gives crawlers instant parseable content (improves LCP perception for bots and above-the-fold users). | `index.html` |

All items validated by a clean `npm run build` (tsc + vite + prerender), lint-clean for new files, and JSON/XML parse checks.

### A.2 Verification results

- `tsc -b && vite build` → exit 0; PWA SW regenerated with 80 precache entries.
- `dist/index.html` contains the embedded English landing copy; `dist/about/index.html` present.
- 3 JSON-LD blocks (`SoftwareApplication`, `Organization`, `FAQPage`) parse as valid JSON.
- `sitemap.xml` valid XML; `robots.txt` + `llms.txt` deployed into `dist/`.
- No lint errors introduced by new/changed files (repo-wide lint has 280 pre-existing errors, out of scope).

### A.3 Remaining SEO recommendations (next release)

- Add `index.html` code-split of the 1.3 MB main entry (`build.rollupOptions.manualChunks`) to improve real-user CWV LCP/TBT. Vite already media-splits; the app/product chunk is the main unshipped item.
- Consider `output: 'static'` sitemap dates (lastmod) if content versioning is added.
- Submit `sitemap.xml` + ask for indexing of `/` and `/about` in Google Search Console once the fallback Render host is confirmed as the crawler-facing host (currently canonical points at Pxxl).

---

## Part B — App Store Optimization (Play Store)

Full copy and assets are in **`ASO_PLAY_STORE_DELIVERABLES.md`**. Summary:

- **Title (30):** "Menen Student Assistant" — brand + high-intent keyword, fits limit.
- **Short description (79):** Ethiopian notes, quizzes & ESLCE prep · Works offline.
- **Full description:** feature list, 3-way access (Browser/APK/Offline), Free vs Premium, key terms (ESLCE, Grade 12, national exam, offline), customer-first tone.
- **CRO checklist:** screenshot order, first-screen rule, install-to-signup de-friction, copy that mirrors the verified landing hooks ("Works 100% offline", "Free to start", "Grade 9–12").
- **In-app reviews:** Play In-App Review via `@capacitor-community/app-rate`; trigger after finishing an ESLCE practice exam or 5+ study days; max 1 per 90 days; Settings "Rate Us"; Play Console hygiene (160-char promo text, replies ≤48h, staged rollout).

---

## Part C — Resolved in this session

- Offline G12 APK rebuilt and delivered: `Desktop\Menen-Grade12-OFFLINE.apk` (37 MB; 17 MB G12 DB bundled; JAVA_HOME pinned to JDK 21 for Gradle).
- Online APK (`Menen-OSHS-ONLINE.apk`) verified earlier (bundled mode, failover marker present).
- Deploy sync: `dev` pushed; `frontend-deploy` re-split + pushed; branches verified matching (`git diff dev:frontend frontend-deploy` empty).