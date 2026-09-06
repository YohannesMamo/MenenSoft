// scripts/prerender.mjs
// Pre-renders the public landing page into dist/index.html so search-engine
// crawlers see real content without executing JavaScript. The React SPA still
// mounts on top and takes over interactivity once the bundle loads.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dist = join(__dirname, '..', 'dist');
const appBase = 'https://menen-oshs-app.pxxl.click';

const landingContent = `
<div style="max-width:1200px;margin:0 auto;padding:2rem 1rem;font-family:system-ui,sans-serif;color:#1f2937;line-height:1.6">
  <h1>Menen Student Assistant</h1>
  <p>Ethiopian high school students' all-in-one learning platform. Study full subject notes,
     practice quizzes, and take ESLCE and national exam past papers — in the browser, as an
     Android app, or 100% offline.</p>

  <h2>How to access</h2>
  <ul>
    <li><strong>Browser</strong> — Instant access on any phone, tablet, or computer. No install needed. Always up to date.</li>
    <li><strong>APK</strong> — Native Android app. Log in and study on the go.</li>
    <li><strong>Offline</strong> — Download the app and your grade's content once (~300–500 MB), then study anywhere without internet.</li>
  </ul>

  <h2>Features</h2>
  <ul>
    <li>Full subject notes — fully accessible</li>
    <li>Basic quizzes per section</li>
    <li>Progress tracking</li>
    <li>Advanced practice exams, full ESLCE past papers &amp; performance reports (premium)</li>
    <li>Works 100% offline</li>
  </ul>

  <h2>Frequently asked questions</h2>
  <p><strong>How much storage does offline mode need?</strong> About 300–500 MB including the app and your grade's notes and basic quizzes. After that it works without internet using only that space.</p>
  <p><strong>Will I lose my progress if I study offline?</strong> No — your progress is stored locally and syncs with your account when back online.</p>
  <p><strong>How do I get updates?</strong> Browser and APK versions update automatically online. Offline content ships via periodic app updates.</p>
  <p><strong>Is my data secure?</strong> Yes — secure sign-in, and offline study data stays on your device. Premium content is delivered separately after purchase.</p>
  <p><strong>Can I switch between browser, APK, and offline?</strong> Yes — your progress stays in sync across all three modes.</p>

  <p><a href="${appBase}/login">Sign in</a> or <a href="${appBase}/register">create an account</a> to start studying.</p>
</div>
`;

const indexHtml = readFileSync(join(dist, 'index.html'), 'utf8');

const rendered = indexHtml.replace(
  '<div id="root"></div>',
  `<div id="root">${landingContent}</div>`
);

writeFileSync(join(dist, 'index.html'), rendered);

console.log('[prerender] Embedded landing content into dist/index.html');

// Generate a static about.html so /about can be served as real HTML where the
// host supports file routes (Render/static hosts). The SPA handles the route
// with its own About page when served via fallback.
const noScript = indexHtml
  .replace(
    '<title>Menen Student Assistant — Ethiopian High School Study, Quiz & ESLCE Exam Prep</title>',
    '<title>About — Menen Student Assistant</title>'
  )
  .replace(
    `<meta name="description" content="Menen is the Ethiopian high school learning platform. Study full subject notes, practice quizzes, take ESLCE &amp; national exam past papers, and track your progress—online or fully offline." />`,
    `<meta name="description" content="Learn about Menen Student Assistant — mission, vision, contact info, and how to reach us in Addis Ababa, Ethiopia." />`
  )
  .replace(
    '<div id="root"></div>',
    `<div id="root"></div>`
  );

mkdirSync(join(dist, 'about'), { recursive: true });
writeFileSync(join(dist, 'about', 'index.html'), noScript);
console.log('[prerender] Generated dist/about/index.html');