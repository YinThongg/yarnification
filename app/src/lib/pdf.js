// Thin wrapper over pdf.js for the ingestion flow. The worker is bundled (via
// Vite's ?url import), not fetched from a CDN, so ingestion works offline and
// within the app's strict CSP.

import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

// Load a PDF from raw bytes. Pass a Uint8Array — pdf.js may detach the buffer,
// so callers should hand over a copy they don't need afterwards.
export async function loadPdf(bytes) {
  return pdfjsLib.getDocument({ data: bytes }).promise;
}

// Render one page (1-based) into a canvas at `scale`. Returns the pixel size so
// callers can map crop rectangles back to page coordinates.
export async function renderPage(doc, pageNumber, canvas, scale = 1.4) {
  const page = await doc.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext('2d');
  await page.render({ canvasContext: ctx, viewport }).promise;
  return { width: canvas.width, height: canvas.height };
}

// Reconstruct visual lines from pdf.js text items. Items carry a transform whose
// [4],[5] are the x,y baseline; we bucket by y into rows, order each row by x,
// then order rows top-to-bottom (PDF y grows upward). Works for mixed CJK/Latin.
function linesFromItems(items) {
  const rows = [];
  for (const it of items) {
    if (!it.str) continue;
    const x = it.transform[4];
    const y = it.transform[5];
    const h = it.height || 10;
    // same line if baselines are within ~half a line height
    const row = rows.find((r) => Math.abs(r.y - y) <= Math.max(2, h * 0.5));
    if (row) {
      row.parts.push({ x, str: it.str, space: it.hasEOL });
    } else {
      rows.push({ y, parts: [{ x, str: it.str }] });
    }
  }
  rows.sort((a, b) => b.y - a.y);
  return rows
    .map((r) => {
      r.parts.sort((a, b) => a.x - b.x);
      return r.parts.map((p) => p.str).join('').replace(/[ \t]+/g, ' ').trim();
    })
    .filter(Boolean);
}

// Per-page reconstructed text. `text` is newline-joined lines; `lines` is the
// array. This is a *draft* for the export bundle — Claude does the real parsing.
export async function extractText(doc) {
  const pages = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const content = await page.getTextContent();
    const lines = linesFromItems(content.items);
    pages.push({ page: n, lines, text: lines.join('\n') });
  }
  return pages;
}
