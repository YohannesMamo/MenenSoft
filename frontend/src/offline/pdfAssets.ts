import textbookPdfs from './textbookPdfs.json';

/**
 * Textbook PDF map for the grade currently being built.
 *
 * Single source of truth: src/offline/textbookPdfs.json, which is also read by
 * offline-app/scripts/build-grade.js when it copies the PDFs into
 * frontend/public/pdfs. Keeping one file means the APK can never bundle a PDF
 * the frontend does not know how to open, or vice versa.
 *
 * build-grade.js passes VITE_OFFLINE_GRADE (e.g. MID9A) to the Vite build.
 * Web/online builds leave it unset and fall back to the full per-grade lookup,
 * which lets the same code serve any grade in the browser.
 */

export type TextbookPdfGrade = {
  folder: string;
  pdfs: Record<string, string>;
};

const PDF_GRADES = textbookPdfs as unknown as Record<string, TextbookPdfGrade>;

/** Grade this bundle was built for; 'ALL' when no grade was baked in. */
export const BUILD_GRADE_ID: string = import.meta.env.VITE_OFFLINE_GRADE || 'ALL';

function mapsFor(gradeId: string): Record<string, string> {
  if (gradeId !== 'ALL' && PDF_GRADES[gradeId]) return PDF_GRADES[gradeId].pdfs;
  // Multi-grade (web) build: merge every grade's map. STB ids are grade-prefixed
  // (GR9-MAT vs GR10-MAT), so they cannot collide across grades.
  return Object.values(PDF_GRADES).reduce<Record<string, string>>(
    (acc, g) => ({ ...acc, ...g.pdfs }),
    {}
  );
}

export const STB_PDF: Record<string, string> = mapsFor(BUILD_GRADE_ID);

export function pdfFileNameFor(stbId: string): string | undefined {
  return STB_PDF[stbId];
}

export function pdfUrlFor(stbId: string): string | undefined {
  const file = pdfFileNameFor(stbId);
  return file ? `pdfs/${file}` : undefined;
}