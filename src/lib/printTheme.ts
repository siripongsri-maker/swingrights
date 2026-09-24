/**
 * Shared print theme (SWING RIGHTS kit) for every printable document.
 * Appended after each document's own CSS so it wins the cascade.
 * - Running header + confidential footer with page numbers on EVERY page
 * - Magenta accent, charcoal text, aqua table headers, Bai Jamjuree subheads
 * - Page-break rules so sections/rows/signatures never split awkwardly
 */
export const PRINT_THEME_CSS = `
:root { --m:#CC0099; --ch:#2A2A2E; --aq:#F0F9F9; --aq2:#E3F1F1; --bd:#D0E2E2; --mu:#5B6168; }
@page {
  size: A4; margin: 20mm 15mm 18mm;
  @top-left { content: "SWING RIGHTS · มูลนิธิเพื่อนพนักงานบริการ"; font: 600 8pt 'Bai Jamjuree','Noto Sans Thai',sans-serif; color:#CC0099; }
  @top-right { content: string(caseCode); font: 8pt 'IBM Plex Mono',monospace; color:#5B6168; }
  @bottom-left { content: "เอกสารลับ · พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562"; font: 7.5pt 'IBM Plex Sans Thai Looped','Noto Sans Thai',sans-serif; color:#5B6168; }
  @bottom-right { content: "หน้า " counter(page) " / " counter(pages); font: 8pt 'IBM Plex Mono',monospace; color:#5B6168; }
}
@page :first { @top-left { content: none; } @top-right { content: none; } }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { color: var(--ch); font-family:'IBM Plex Sans Thai Looped','Noto Sans Thai',system-ui,sans-serif; orphans:3; widows:3; }
.case-code-run { string-set: caseCode content(); display:none; }
h1 { color: var(--ch); letter-spacing:0; }
h1::after { content:""; display:block; width:56px; height:3px; background:var(--m); border-radius:2px; margin:8px auto 0; }
.brand + h1::after { margin-left:0; }
.section h2, h2 { font-family:'Bai Jamjuree','Noto Sans Thai',sans-serif; color: var(--ch); background:none; font-weight:700;
  border:0; border-left:4px solid var(--m); padding:2px 0 2px 8px; border-radius:0; break-after:avoid; }
.section { break-inside:auto; }
.section > h2 + * { break-before:avoid; }
table { border-collapse:collapse; }
thead { display: table-header-group; }
tr, .qa, .sig, .note, .warn, .box { break-inside: avoid; }
th, td { border-color: var(--bd) !important; }
th { background: var(--aq2) !important; color: var(--ch); }
.qa { border-color: var(--bd); border-radius:8px; background:#fff; }
.box { border-color: var(--bd); border-radius:8px; background: var(--aq); }
.docno, .sub, .org .en { color: var(--mu); }
code, .mono { font-family:'IBM Plex Mono',monospace; }
.sig { break-before: avoid; }
.footer { border-top:1px solid var(--bd); color: var(--mu); }
@media screen {
  html { background: #e6eeee; }
  body { background:#fff; max-width: 210mm; min-height: 297mm; margin: 16px auto; padding: 18mm 15mm !important;
    box-shadow: 0 4px 24px rgba(42,42,46,.12); border-top: 6px solid var(--m); }
}
@media print { body { padding:0 !important; margin:0; box-shadow:none; border:0; } }
`;

export const PRINT_FONTS_LINK =
  '<link href="https://fonts.googleapis.com/css2?family=Bai+Jamjuree:wght@600;700&family=IBM+Plex+Sans+Thai+Looped:wght@400;600&family=IBM+Plex+Mono:wght@400;600&display=swap" rel="stylesheet">';
