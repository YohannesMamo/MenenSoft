/**
 * Build script for grade-specific offline APKs.
 *
 * Usage:
 *   node build-grade.js <GRADE_ID>
 *   node build-grade.js HIG12A
 *
 * What it does:
 *   1. Backs up original capacitor.config.ts
 *   2. Writes offline-mode config (no server URL, grade-specific appId)
 *   3. Runs Vite build (npm run build)
 *   4. Copies the grade's SQLite DB into android/app/src/main/assets/
 *   5. Runs npx cap sync android
 *   6. Builds the debug APK with Gradle
 *   7. Restores original capacitor.config.ts
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const GRADE_ID = process.argv[2] || 'HIG12A';
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const FRONTEND_DIR = path.join(PROJECT_ROOT, 'frontend');
const CONTENT_DIR = path.join(PROJECT_ROOT, 'offline-app', 'content', GRADE_ID);
const ANDROID_ASSETS = path.join(FRONTEND_DIR, 'android', 'app', 'src', 'main', 'assets');
const CAP_CONFIG = path.join(FRONTEND_DIR, 'capacitor.config.ts');
const JAVA_HOME = 'C:\\Users\\HP\\.jdks\\jdk-21\\jdk-21.0.2';

const GRADE_APP_IDS = {
  'HIG9A': 'com.menen.oshs.g9',
  'HIG10A': 'com.menen.oshs.g10',
  'HIG11A': 'com.menen.oshs.g11',
  'HIG12A': 'com.menen.oshs.g12',
};

const GRADE_NAMES = {
  'HIG9A': 'Menen Grade 9',
  'HIG10A': 'Menen Grade 10',
  'HIG11A': 'Menen Grade 11',
  'HIG12A': 'Menen Grade 12',
};

function log(msg) { console.log(`  ${msg}`); }
function fatal(msg) { console.error(`\n  ERROR: ${msg}\n`); process.exit(1); }

function main() {
  const appId = GRADE_APP_IDS[GRADE_ID] || `com.menen.oshs.${GRADE_ID.toLowerCase()}`;
  const appName = GRADE_NAMES[GRADE_ID] || 'Menen OSHS';

  console.log(`\n${'='.repeat(60)}`);
  console.log(`  BUILDING OFFLINE APK: ${GRADE_ID}`);
  console.log(`  App: ${appName} (${appId})`);
  console.log(`${'='.repeat(60)}\n`);

  // ── Step 1: Verify content DB exists ──
  const dbFile = path.join(CONTENT_DIR, `menen_offline_${GRADE_ID}.db`);
  if (!fs.existsSync(dbFile)) fatal(`Database not found: ${dbFile}\nRun export_content.py + import_to_sqlite.py first.`);
  const dbSize = fs.statSync(dbFile).size;
  log(`DB: ${dbFile} (${(dbSize / 1024 / 1024).toFixed(1)} MB)`);

  // ── Step 2: Backup original capacitor.config.ts ──
  const backupPath = CAP_CONFIG + '.online-backup';
  if (fs.existsSync(CAP_CONFIG) && !fs.existsSync(backupPath)) {
    fs.copyFileSync(CAP_CONFIG, backupPath);
    log('Backed up capacitor.config.ts');
  }

  // ── Step 3: Write offline capacitor.config.ts ──
  const offlineConfig = `import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: '${appId}',
  appName: '${appName}',
  webDir: 'dist',
  // No server.url = bundled mode (loads from local assets)
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 2000,
      backgroundColor: '#4F46E5',
      showSpinner: true,
      spinnerColor: '#FFFFFF'
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#4F46E5'
    }
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#F9FAFB'
  }
};

export default config;
`;
  fs.writeFileSync(CAP_CONFIG, offlineConfig);
  log(`Wrote offline capacitor.config.ts (${appId})`);

  try {
    // ── Step 4: Vite build (with VITE_OFFLINE_BUILD flag) ──
    log('Running Vite build...');
    execSync('npm run build', {
      cwd: FRONTEND_DIR,
      stdio: 'inherit',
      timeout: 300000,
      env: { ...process.env, VITE_OFFLINE_BUILD: 'true' },
    });
    log('Vite build done.');

    // ── Step 5: Copy SQLite DB to Android assets ──
    if (!fs.existsSync(ANDROID_ASSETS)) {
      fs.mkdirSync(ANDROID_ASSETS, { recursive: true });
    }
    const destDb = path.join(ANDROID_ASSETS, 'menen_offline.db');
    fs.copyFileSync(dbFile, destDb);
    log(`Copied SQLite DB to assets (${(fs.statSync(destDb).size / 1024 / 1024).toFixed(1)} MB)`);

    // Note: The JSON content files are intentionally NOT bundled into the APK.
    // The SQLite DB is the single source of content. Bundling the plaintext JSON
    // would expose duplicate, unencrypted copies of the same content (notes,
    // quizzes, exams, ESLCE) alongside the database. In the Android build the DB
    // is copied locally via copyFromAssets() on first launch, so the JSON fallback
    // is unnecessary and is excluded for security.

    // ── Step 6: Cap sync ──
    log('Running Capacitor sync...');
    execSync('npx cap sync android', { cwd: FRONTEND_DIR, stdio: 'inherit', timeout: 180000 });
    log('Capacitor sync done.');

    // ── Step 7: Gradle build ──
    log('Building APK with Gradle...');
    execSync('gradlew.bat assembleDebug', {
      cwd: path.join(FRONTEND_DIR, 'android'),
      stdio: 'inherit',
      timeout: 900000,
      env: { ...process.env, JAVA_HOME },
    });

    // ── Step 8: Report ──
    const apkPath = path.join(FRONTEND_DIR, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
    if (fs.existsSync(apkPath)) {
      const apkSize = fs.statSync(apkPath).size;
      console.log(`\n${'='.repeat(60)}`);
      console.log(`  BUILD SUCCESSFUL`);
      console.log(`  APK: ${apkPath}`);
      console.log(`  Size: ${(apkSize / 1024 / 1024).toFixed(1)} MB`);
      console.log(`  App: ${appName} (${appId})`);
      console.log(`${'='.repeat(60)}\n`);
    } else {
      log('WARNING: APK not found at expected path');
    }
  } catch (e) {
    console.error(`\n  BUILD FAILED: ${e.message}\n`);
    process.exit(1);
  } finally {
    // ── Step 9: Always restore original config ──
    if (fs.existsSync(backupPath)) {
      fs.copyFileSync(backupPath, CAP_CONFIG);
      fs.unlinkSync(backupPath);
      log('Restored original capacitor.config.ts');
    }
  }
}

main();
