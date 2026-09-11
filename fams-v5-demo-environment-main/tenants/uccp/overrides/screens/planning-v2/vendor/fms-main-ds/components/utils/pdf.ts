/**
 * PDF export via the browser's native print pipeline — dependency-free.
 *
 * `exportNodeToPdf` clones a DOM node (a chart card, a raw-data table, …) into a
 * hidden iframe together with the page's stylesheets, then calls `print()` so the
 * user saves it as PDF. This avoids bundling a heavy canvas/PDF library and works
 * with inline SVG charts (recharts) which serialize cleanly. The chosen filename
 * is applied as the document title (browsers use it as the default PDF name).
 */

export interface ExportPdfOptions {
  /** Document title → default PDF filename. */
  title?: string;
  /** Extra CSS injected into the print document (e.g. page size). */
  pageCss?: string;
}

// Print-document base only (isolated iframe doc, not app chrome) — concrete
// fallbacks in case the cloned stylesheets fail to load in the print context.
const DEFAULT_PAGE_CSS = '@page{margin:14mm} body{margin:0;padding:16px;background:#fff;color:#101828}'; // coherence-allow — print-doc base colours

export function exportNodeToPdf(node: HTMLElement | null | undefined, opts: ExportPdfOptions = {}): void {
  if (!node || typeof document === 'undefined') return;

  // Clone the app's styles so the printed clone renders as it does on screen.
  const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map((el) => el.outerHTML)
    .join('\n');

  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) { iframe.remove(); return; }

  const title = opts.title ?? 'Export';
  doc.open();
  doc.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>${styles}` +
    `<style>${opts.pageCss ?? DEFAULT_PAGE_CSS}</style></head>` +
    `<body>${node.outerHTML}</body></html>`,
  );
  doc.close();

  const win = iframe.contentWindow;
  if (!win) { iframe.remove(); return; }

  const run = () => {
    // A short delay lets fonts/inline SVG lay out before printing.
    win.setTimeout(() => {
      win.focus();
      win.print();
      // Remove after the print dialog settles.
      win.setTimeout(() => iframe.remove(), 1000);
    }, 300);
  };

  if (doc.readyState === 'complete') run();
  else win.addEventListener('load', run, { once: true });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
}
