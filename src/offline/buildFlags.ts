/**
 * Build-time flags for the offline APK bundles.
 *
 * The Grade 9/10/11 APKs ship no ESLCE content at all (it is a Grade-12-only
 * national qualification), so every ESLCE entry point has to disappear from
 * those builds. These flags are inlined by Vite, so the check costs nothing at
 * runtime and dead UI is tree-shaken out of the bundle.
 *
 * build-grade.js sets:
 *   VITE_OFFLINE_BUILD = 'true'
 *   VITE_OFFLINE_GRADE = 'MID9A' | 'HIG10A' | 'HIG11A' | 'HIG12A'
 *   VITE_INCLUDE_ESLCE = 'true' | 'false'
 */

export const IS_OFFLINE_BUILD = import.meta.env.VITE_OFFLINE_BUILD === 'true';

/** Grade this APK was built for; '' for the online/web build. */
export const BUILD_GRADE_ID: string = import.meta.env.VITE_OFFLINE_GRADE || '';

/** ESLCE is compiled in for the online app and the Grade-12 APK only. */
export const BUILD_HAS_ESLCE: boolean = !IS_OFFLINE_BUILD
  || import.meta.env.VITE_INCLUDE_ESLCE !== 'false';

/**
 * ESLCE is offered online to every grade (the online backend serves the bank
 * and gates it by account), but in an offline APK only Grade 12 carries it.
 */
export function eslceAvailable(gradeCode?: string | null): boolean {
  if (!BUILD_HAS_ESLCE) return false;
  if (!IS_OFFLINE_BUILD) return true;
  const grade = gradeCode || BUILD_GRADE_ID.replace(/^(MID|HIG)/, '').replace(/A$/, '');
  return grade === '12';
}