// เอกสารนำส่งดำเนินเคส — บันทึกแจ้งความ / บันทึกข้อความ / บันทึกส่งตัว / บันทึกให้การช่วยเหลือ
// พิมพ์เป็น PDF ผ่านหน้าต่างพิมพ์ของเบราว์เซอร์ และบันทึก log การ export ทุกครั้ง
import { SEV_LABEL } from '@/lib/screening';
import { q9Level, nrmPositive } from '@/lib/screeningTools';
import { AI_DISCLAIMER, logExport, type CaseReportData } from '@/lib/caseReport';
import type { IntakeState } from '@/store/intake';
import { toast } from 'sonner';

export interface DocInput {
  caseCode: string | null;
  createdAt: string;
  reporter: { type?: string; name?: string; address?: string; email?: string; phone?: string } | null;
  victim: { name?: string; contact?: string } | null;
  profile: any;
  answers: { question: string; cat?: string; transcript?: string }[];
  staffObs: string[];
  hasViolation: boolean | null;
  violationDetails: string[];
  severity: string | null;
  screening?: any;
  extraFacts?: string | null;
  aiResult?: any;
  referrals: string[];
  referralNote?: string | null;
  signatureStaff?: string | null;
  signatureStaffName?: string | null;
  signatureClient?: string | null;
  audioCount?: number;
  photosCount?: number;
  documentDraft?: ReviewedDocumentDraft;
}

export interface ReviewedDocumentDraft {
  overview: string;
  details: string;
  impact: string;
  actions: string;
  generated_at?: string;
  reviewed_at?: string;
  reviewed_by?: string;
}

export type DocKind = 'complaint' | 'statement' | 'referral' | 'assistance';

export const DOC_KINDS: { key: DocKind; label: string; desc: string }[] = [
  { key: 'complaint', label: 'บันทึกแจ้งความ', desc: 'แบบร่างคำร้องทุกข์สำหรับยื่นต่อพนักงานสอบสวน' },
  { key: 'statement', label: 'บันทึกข้อความ', desc: 'บันทึกการให้ข้อมูล/คำให้การของผู้รับบริการ' },
  { key: 'referral', label: 'บันทึกส่งตัว', desc: 'หนังสือส่งต่อหน่วยงานพันธมิตร / โรงพยาบาล / พมช.' },
  { key: 'assistance', label: 'บันทึกให้การช่วยเหลือ', desc: 'รายการความช่วยเหลือที่มูลนิธิดำเนินการแล้ว' },
];

const esc = (v: unknown) =>
  String(v ?? '-').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

const thaiDate = (iso?: string) => {
  const d = iso ? new Date(iso) : new Date();
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
};
const thaiDateTime = (iso?: string) => {
  const d = iso ? new Date(iso) : new Date();
  return d.toLocaleString('th-TH', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const DOC_CSS = `
@page { size: A4; margin: 18mm 15mm; }
* { box-sizing: border-box; }
body { font-family: 'Sarabun','Noto Sans Thai',-apple-system,system-ui,sans-serif; color:#1a1a1a; margin:0; padding:28px; line-height:1.65; font-size:13px; }
.org { text-align:center; margin-bottom:4px; }
.org .name { font-size:15px; font-weight:600; }
.org .en { font-size:10px; color:#777; letter-spacing:.06em; }
h1 { text-align:center; font-size:17px; margin:10px 0 2px; font-weight:600; }
.docno { text-align:center; font-size:11px; color:#666; margin-bottom:16px; }
.meta { font-size:12.5px; margin-bottom:10px; }
.meta p { margin:2px 0; }
.section { margin:14px 0; break-inside:avoid; }
.section h2 { font-size:13px; margin:0 0 6px; padding-bottom:3px; border-bottom:1.5px solid #1a1a1a; font-weight:600; }
table { width:100%; border-collapse:collapse; font-size:12px; }
th, td { border:0.5px solid #bbb; padding:5px 8px; text-align:left; vertical-align:top; }
th { background:#f2f2f2; font-weight:600; width:30%; }
.qa { border:0.5px solid #ccc; border-radius:4px; padding:8px 10px; margin-bottom:6px; break-inside:avoid; }
.qa .q { color:#555; font-size:11px; margin-bottom:2px; }
.qa .obs { margin-top:4px; font-size:11px; color:#7a5c00; background:#fff8e1; padding:4px 6px; border-radius:3px; }
.box { border:0.5px solid #bbb; border-radius:4px; padding:10px 12px; }
.note { font-size:10.5px; color:#7a5c00; background:#fff8e1; border:0.5px solid #ffe08a; border-radius:4px; padding:8px 10px; }
.warn { font-size:10.5px; color:#8a1f1f; background:#fdecec; border:0.5px solid #f5b5b5; border-radius:4px; padding:8px 10px; }
.sig { display:flex; gap:18px; margin-top:26px; }
.sig > div { flex:1; text-align:center; font-size:11px; color:#333; }
.sig .line { border-bottom:0.5px dotted #888; height:52px; margin:0 12px 6px; display:flex; align-items:flex-end; justify-content:center; }
.sig img { max-height:48px; margin:0 auto; display:block; }
.checks { list-style:none; padding:0; margin:6px 0; }
.checks li { margin:3px 0; padding-left:22px; position:relative; }
.checks li::before { content:'✓'; position:absolute; left:2px; color:#2e7d32; font-weight:700; }
.checks li.no::before { content:'—'; color:#999; }
.footer { margin-top:26px; font-size:9.5px; color:#888; text-align:center; border-top:0.5px solid #ddd; padding-top:8px; }
ul.flat { margin:4px 0; padding-left:18px; }
ul.flat li { margin:2px 0; }
@media print { body { padding:0; } }
`;

function openDoc(title: string, bodyHtml: string, d: DocInput, format: string) {
  const html = `<!doctype html><html lang="th"><head><meta charset="utf-8" />
  <title>${esc(title)} ${esc(d.caseCode || '')}</title>
  <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600&display=swap" rel="stylesheet">
  <style>${DOC_CSS}</style></head><body>
  <div class="org"><div class="name">มูลนิธิสวิง (SWING Foundation)</div>
  <div class="en">SERVICE WORKERS IN GROUP FOUNDATION — เอกสารลับ สำหรับหน่วยงานที่เกี่ยวข้องเท่านั้น</div></div>
  ${bodyHtml}
  <div class="footer">รหัสเคส ${esc(d.caseCode || '—')} · ออกเอกสารเมื่อ ${thaiDateTime()} · เอกสารลับตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 — ห้ามเปิดเผยโดยไม่ได้รับความยินยอม</div>
  <script>window.onload = () => setTimeout(() => window.print(), 400);</script>
  </body></html>`;
  const w = window.open('', '_blank');
  if (!w) { toast.error('กรุณาอนุญาต popup เพื่อพิมพ์เอกสาร'); return false; }
  w.document.write(html);
  w.document.close();
  void logExport({ case_code: d.caseCode, format });
  return true;
}

const sigBlock = (d: DocInput, left: string, right: string) => `
  <div class="sig">
    <div>
      <div class="line">${d.signatureClient ? `<img src="${d.signatureClient}" alt="ลายเซ็น${esc(left)}" />` : ''}</div>
      <div>(${esc(d.victim?.name || '............................................')})</div>
      <div>${left}</div>
    </div>
    <div>
      <div class="line">${d.signatureStaff ? `<img src="${d.signatureStaff}" alt="ลายเซ็น${esc(right)}" />` : ''}</div>
      <div>(${esc(d.signatureStaffName || '............................................')})</div>
      <div>${right}</div>
    </div>
  </div>`;

const blankSig = (left: string, right: string) => `
  <div class="sig">
    <div><div class="line"></div><div>(............................................)</div><div>${left}</div></div>
    <div><div class="line"></div><div>(............................................)</div><div>${right}</div></div>
  </div>`;

const personTable = (d: DocInput) => {
  const p = d.profile || {};
  return `<table>
    <tr><th>ชื่อ-นามสกุล</th><td>${esc(d.victim?.name)}</td></tr>
    <tr><th>กลุ่มประชากร / เพศสภาพ</th><td>${esc(p.kp)} · ${esc(p.gender)}</td></tr>
    <tr><th>อายุ / สัญชาติ</th><td>${esc(p.age || '-')} · ${esc(p.nationality)}</td></tr>
    <tr><th>ที่อยู่ / ช่องทางติดต่อ</th><td>${esc(d.victim?.contact)}</td></tr>
    <tr><th>พื้นที่</th><td>ต.${esc(p.subdistrict)} อ.${esc(p.district)} จ.${esc(p.province || p.branch)}${p.incidentPlace ? ` · จุดเกิดเหตุ: ${esc(p.incidentPlace)}` : ''}</td></tr>
  </table>`;
};

const screeningTable = (d: DocInput) => {
  const s = d.screening || {};
  const q9 = typeof s.q9Total === 'number' ? `${s.q9Total} คะแนน (${q9Level(s.q9Total).label})` : '-';
  return `<table>
    <tr><th>2Q ซึมเศร้า</th><td>${s.q2Positive === undefined ? '-' : s.q2Positive ? 'ผิดปกติ — ประเมิน 9Q ต่อ' : 'ปกติ'}</td></tr>
    <tr><th>9Q คะแนนรวม</th><td>${esc(q9)}</td></tr>
    <tr><th>ความเสี่ยงทำร้ายตนเอง (ข้อ 9)</th><td>${(s.suicidalItem ?? 0) > 0 ? 'พบ — ทำ safety planning และประสานสายด่วน 1323 แล้ว' : 'ไม่พบ'}</td></tr>
    <tr><th>NRM ค้ามนุษย์</th><td>${s.nrmPositive === undefined ? '-' : s.nrmPositive ? 'เข้าข่ายผู้เสียหาย — ส่งต่อทีมสหวิชาชีพ/OSCC' : 'ยังไม่เข้าเกณฑ์'}${s.nrmUnder18 ? ' · ผู้เยาว์อายุต่ำกว่า 18 ปี' : ''}</td></tr>
  </table>`;
};

const violationsLine = (d: DocInput) =>
  esc((d.violationDetails?.length ? d.violationDetails : d.profile?.initialViolationTypes || []).join(' · '));

/* ---------------- 1. บันทึกแจ้งความ ---------------- */
function complaintHtml(d: DocInput) {
  const p = d.profile || {};
  const draft = d.documentDraft;
  return `
  <h1>แบบร่างบันทึกการแจ้งความร้องทุกข์</h1>
  <div class="docno">(เพื่อประกอบการยื่นต่อพนักงานสอบสวน — โปรดตรวจสอบรายละเอียด ณ สถานีตำรวจอีกครั้ง)</div>

  <div class="meta">
    <p><strong>เขียนที่:</strong> ${esc(p.province || p.branch)} &nbsp;&nbsp; <strong>วันที่:</strong> ${thaiDate()}</p>
  </div>

  <div class="section"><h2>ผู้แจ้งความ</h2><table>
    <tr><th>ชื่อ-นามสกุล</th><td>${esc(d.reporter?.name || d.victim?.name)}${d.reporter?.type === 'other' ? ' (แจ้งแทนผู้เสียหาย)' : ''}</td></tr>
    <tr><th>ที่อยู่ที่ติดต่อได้</th><td>${esc(d.reporter?.address)}</td></tr>
    <tr><th>โทรศัพท์ / อีเมล</th><td>${esc(d.reporter?.phone)} · ${esc(d.reporter?.email)}</td></tr>
  </table></div>

  ${d.reporter?.type === 'other' ? `<div class="section"><h2>ผู้ถูกกระทำ</h2>${personTable(d)}</div>` : ''}

  <div class="section"><h2>ข้อเท็จจริงโดยสังเขป</h2>
    <div class="box">
      <p><strong>ลำดับเหตุการณ์:</strong> ${esc(draft?.overview)}</p>
      <p><strong>ข้อเท็จจริงสำคัญ:</strong> ${esc(draft?.details)}</p>
    </div>
  </div>

  <div class="section"><h2>ลักษณะความเสียหายที่พบ</h2>
    <p>${violationsLine(d)}</p>
    <p><strong>ระดับความรุนแรงที่ประเมิน:</strong> ${esc(d.severity ? SEV_LABEL[d.severity as keyof typeof SEV_LABEL] : '-')}</p>
    <p><strong>ความเสียหายหรือผลกระทบ:</strong> ${esc(draft?.impact)}</p>
  </div>

  <div class="section"><h2>พยานหลักฐานประกอบ</h2>
    <ul class="flat">
      <li>บันทึกเสียงการสัมภาษณ์ ${d.audioCount ?? 0} ไฟล์ (เก็บที่มูลนิธิสวิง)</li>
      <li>ภาพถ่ายประกอบ ${d.photosCount ?? 0} ภาพ</li>
      <li>บันทึกการให้ข้อมูลของผู้รับบริการ (แนบท้าย)</li>
    </ul>
  </div>

  <div class="section"><h2>ความประสงค์</h2>
    <p>${esc(draft?.actions)}</p>
  </div>

  <p class="warn"><strong>หมายเหตุ:</strong> เอกสารนี้เป็น "แบบร่าง" ที่จัดทำจากบันทึกการสัมภาษณ์ของมูลนิธิฯ เท่านั้น ไม่ใช่บันทึกการแจ้งความอย่างเป็นทางการ — ผู้แจ้งต้องลงลายมือชื่อต่อหน้าพนักงานสอบสวน ณ สถานีตำรวจที่มีเขตอำนาจ</p>

  ${blankSig('ผู้แจ้งความ', 'พนักงานสอบสวนผู้รับแจ้ง')}`;
}

/* ---------------- 2. บันทึกข้อความ ---------------- */
function statementHtml(d: DocInput) {
  const p = d.profile || {};
  const draft = d.documentDraft;

  return `
  <h1>บันทึกการให้ข้อมูลของผู้รับบริการ</h1>
  <div class="docno">Statement Record — จัดทำโดยเจ้าหน้าที่มูลนิธิสวิง</div>

  <div class="meta">
    <p><strong>วัน-เวลาที่บันทึก:</strong> ${thaiDateTime(d.createdAt)} &nbsp;&nbsp; <strong>สถานที่:</strong> พื้นที่บริการ ${esc(p.province || p.branch)}</p>
    <p><strong>ผู้บันทึก:</strong> ${esc(d.signatureStaffName || 'เจ้าหน้าที่มูลนิธิสวิง')}</p>
  </div>

  <div class="section"><h2>ข้อมูลผู้ให้ข้อมูล</h2>${personTable(d)}</div>

  <div class="section"><h2>ภูมิหลังและบริบท</h2><div class="box">${esc(draft?.overview)}</div></div>
  <div class="section"><h2>คำให้ข้อมูลที่เรียบเรียงแล้ว</h2><div class="box">${esc(draft?.details)}</div></div>
  <div class="section"><h2>ผลกระทบ</h2><div class="box">${esc(draft?.impact)}</div></div>
  <div class="section"><h2>ความต้องการหรือการสนับสนุน</h2><div class="box">${esc(draft?.actions)}</div></div>

  <p class="note">ผู้ให้ข้อมูลยินยอมให้บันทึกเสียงและข้อความเพื่อการช่วยเหลือตามความยินยอมที่ลงนามไว้ และสามารถขอแก้ไขข้อมูลได้ตามสิทธิ PDPA</p>

  ${sigBlock(d, 'ผู้ให้ข้อมูล / ผู้รับบริการ', 'ผู้บันทึก (เจ้าหน้าที่)')}`;
}

/* ---------------- 3. บันทึกส่งตัว ---------------- */
function referralHtml(d: DocInput) {
  const draft = d.documentDraft;
  return `
  <h1>บันทึกส่งตัวเพื่อรับการช่วยเหลือ</h1>
  <div class="docno">Referral Record — ส่งต่อระหว่างหน่วยงาน</div>

  <div class="meta">
    <p><strong>วันที่ส่งต่อ:</strong> ${thaiDate()} &nbsp;&nbsp; <strong>จาก:</strong> มูลนิธิสวิง (เจ้าหน้าที่: ${esc(d.signatureStaffName || '-')})</p>
    <p><strong>ส่งต่อไปยัง:</strong> ${esc(d.referrals.join(' · ') || '—')}</p>
  </div>

  <div class="section"><h2>ข้อมูลผู้รับบริการ</h2>${personTable(d)}</div>

  <div class="section"><h2>ผลการคัดกรองมาตรฐาน</h2>${screeningTable(d)}</div>

  <div class="section"><h2>ประเด็นที่ต้องช่วยเหลือ</h2>
    <p>${violationsLine(d)}</p>
    <p><strong>ระดับความรุนแรง:</strong> ${esc(d.severity ? SEV_LABEL[d.severity as keyof typeof SEV_LABEL] : '-')}</p>
    <p><strong>สรุปสถานการณ์:</strong> ${esc(draft?.overview)}</p>
    <p><strong>เหตุผลในการส่งต่อ:</strong> ${esc(draft?.details)}</p>
    <p><strong>ความต้องการและผลคัดกรอง:</strong> ${esc(draft?.impact)}</p>
    <p><strong>ข้อควรระวังและสิ่งที่ขอให้ดำเนินการ:</strong> ${esc(draft?.actions)}</p>
    ${d.referralNote ? `<p><strong>หมายเหตุการส่งต่อ:</strong> ${esc(d.referralNote)}</p>` : ''}
  </div>

  ${d.aiResult ? `<p class="note">${AI_DISCLAIMER}</p>` : ''}

  <div class="section"><h2>การติดต่อกลับ</h2>
    <p>หากต้องการข้อมูลเพิ่มเติม กรุณาติดต่อมูลนิธิสวิง พร้อมแจ้งรหัสเคส <strong>${esc(d.caseCode || '—')}</strong> (ข้อมูลระบุตัวตนจะเปิดเผยเฉพาะเมื่อได้รับความยินยอมจากผู้รับบริการ)</p>
  </div>

  ${sigBlock(d, 'ผู้รับบริการ (ยินยอมให้ส่งต่อ)', 'ผู้ส่งต่อ (เจ้าหน้าที่)')}
  ${blankSig('ผู้รับต่อ (หน่วยงานปลายทาง)', 'พยาน')}`;
}

/* ---------------- 4. บันทึกให้การช่วยเหลือ ---------------- */
function assistanceHtml(d: DocInput) {
  const s = d.screening || {};
  const draft = d.documentDraft;
  const suicidal = (s.suicidalItem ?? 0) > 0;
  const did = (cond: boolean, label: string, detail?: string) =>
    `<li class="${cond ? '' : 'no'}">${label}${cond && detail ? ` — ${esc(detail)}` : ''}</li>`;

  return `
  <h1>บันทึกการให้ความช่วยเหลือผู้รับบริการ</h1>
  <div class="docno">Assistance Record — มูลนิธิสวิง</div>

  <div class="meta">
    <p><strong>วันที่ให้ความช่วยเหลือ:</strong> ${thaiDate(d.createdAt)} &nbsp;&nbsp; <strong>พื้นที่:</strong> ${esc(d.profile?.province || d.profile?.branch)}</p>
    <p><strong>เจ้าหน้าที่ผู้ให้ความช่วยเหลือ:</strong> ${esc(d.signatureStaffName || '-')}</p>
  </div>

  <div class="section"><h2>ข้อมูลผู้รับบริการ</h2>${personTable(d)}</div>

  <div class="section"><h2>กิจกรรมความช่วยเหลือที่ดำเนินการ</h2>
    <ul class="checks">
      ${did(true, 'รับฟังปัญหาและสัมภาษณ์เชิงลึกด้วยเครื่องมือ voice screening', `${d.answers.length} คำถาม`)}
      ${did(!!d.screening, 'คัดกรองสุขภาพจิต 2Q/9Q', typeof s.q9Total === 'number' ? `9Q = ${s.q9Total} คะแนน` : undefined)}
      ${did(!!d.screening, 'คัดแยกผู้เสียหายจากการค้ามนุษย์ (NRM)')}
      ${did(!!d.severity, 'ประเมินระดับความรุนแรง', d.severity ? SEV_LABEL[d.severity as keyof typeof SEV_LABEL] : undefined)}
      ${did(suicidal, 'ทำ safety planning และให้ข้อมูลสายด่วน 1323')}
      ${did(d.referrals.length > 0, 'ส่งต่อหน่วยงานพันธมิตร', d.referrals.join(' · '))}
      ${did((d.audioCount ?? 0) > 0, 'บันทึกหลักฐานเสียงอย่างปลอดภัย', `${d.audioCount} ไฟล์`)}
      ${did((d.photosCount ?? 0) > 0, 'จัดเก็บภาพถ่ายหลักฐาน (ลบ EXIF แล้ว)', `${d.photosCount} ภาพ`)}
      ${did(!!d.aiResult, 'วิเคราะห์ความเสี่ยงด้วยระบบ AI ประกอบการพิจารณา')}
    </ul>
  </div>

  ${draft ? `<div class="section"><h2>ผลการประเมินโดยสรุป</h2>
    <p><strong>สถานการณ์:</strong> ${esc(draft.overview)}</p>
    <p><strong>ผลการประเมิน:</strong> ${esc(draft.details)}</p>
    <p><strong>การช่วยเหลือที่ดำเนินการแล้ว:</strong> ${esc(draft.impact)}</p>
    <p><strong>แผนติดตาม:</strong> ${esc(draft.actions)}</p>
    <p class="note">${AI_DISCLAIMER}</p>
  </div>` : ''}

  <div class="section"><h2>การบันทึกความยินยอม (PDPA)</h2>
    <p>ผู้รับบริการได้รับแจ้งวัตถุประสงค์การเก็บข้อมูล สิทธิในการถอนความยินยอม และยินยอมให้บันทึกเสียง/ข้อความเพื่อการช่วยเหลือแล้ว เมื่อ ${thaiDateTime(d.createdAt)}</p>
  </div>

  ${sigBlock(d, 'ผู้รับบริการ', 'เจ้าหน้าที่ผู้ให้ความช่วยเหลือ')}`;
}

/** พิมพ์เอกสารตามประเภท — คืน true เมื่อเปิดหน้าต่างพิมพ์สำเร็จ */
export function printCaseDocument(kind: DocKind, d: DocInput) {
  if (!d.documentDraft?.reviewed_at) {
    return false;
  }
  switch (kind) {
    case 'complaint': return openDoc('แบบร่างบันทึกการแจ้งความร้องทุกข์', complaintHtml(d), d, 'doc_complaint');
    case 'statement': return openDoc('บันทึกการให้ข้อมูลของผู้รับบริการ', statementHtml(d), d, 'doc_statement');
    case 'referral': return openDoc('บันทึกส่งตัว', referralHtml(d), d, 'doc_referral');
    case 'assistance': return openDoc('บันทึกการให้ความช่วยเหลือ', assistanceHtml(d), d, 'doc_assistance');
  }
}

/* ---------------- mappers ---------------- */
export function docInputFromIntake(s: IntakeState): DocInput {
  const sc = s.screening;
  const q9Total = sc.q9.reduce((a, b) => a + b, 0);
  return {
    caseCode: s.caseCode,
    createdAt: new Date().toISOString(),
    reporter: s.reporter,
    victim: s.victim,
    profile: s.profile,
    answers: s.answers,
    staffObs: s.staffObs,
    hasViolation: s.hasViolation,
    violationDetails: s.violationDetails,
    severity: s.severity,
    screening: {
      q2Positive: sc.q2.some((v) => v === 1),
      q9Total,
      suicidalItem: sc.q9[8] ?? 0,
      nrmPositive: nrmPositive(sc.nrm, sc.nrmUnder18),
      nrmUnder18: sc.nrmUnder18,
    },
    extraFacts: s.extraFacts,
    aiResult: s.aiResult,
    referrals: s.referrals,
    referralNote: s.referralNote,
    signatureStaff: s.signatureStaff,
    signatureStaffName: s.signatureStaffName,
    signatureClient: s.signatureClient || null,
    audioCount: s.audioBlobs.filter(Boolean).length,
    photosCount: s.photos.length,
    documentDraft: undefined,
  };
}

export function docInputFromReport(c: CaseReportData): DocInput {
  const s = c.screening || {};
  return {
    caseCode: c.case_code,
    createdAt: c.created_at,
    reporter: c.reporter,
    victim: c.victim,
    profile: c.profile,
    answers: c.answers || [],
    staffObs: c.staff_observations || [],
    hasViolation: c.has_violation,
    violationDetails: c.violation_details || [],
    severity: c.severity,
    screening: s,
    extraFacts: c.extra_facts,
    aiResult: c.ai_result,
    referrals: c.referrals || [],
    referralNote: c.referral_note,
    signatureStaff: c.signature_staff,
    signatureStaffName: c.signature_staff_name,
    signatureClient: c.signature_client || null,
    documentDraft: undefined,
  };
}
