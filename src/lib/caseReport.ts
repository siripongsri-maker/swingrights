import { supabase } from '@/integrations/supabase/client';
import { STATUS_LABEL, SEV_LABEL, type CaseStatus } from '@/lib/screening';
import { q9Level } from '@/lib/screeningTools';
import { toast } from 'sonner';
import lockupImg from '@/assets/brand/swing-rights-lockup.png';

const esc = (v: unknown) =>
  String(v ?? '-').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

export const AI_DISCLAIMER =
  'ผลวิเคราะห์จาก AI เป็น "ความเห็นเบื้องต้นที่เจ้าหน้าที่ทบทวนแล้ว" ไม่ใช่คำวินิจฉัยทางการแพทย์หรือข้อสรุปทางกฎหมาย การตัดสินใจส่งต่อและดำเนินคดีอยู่บนดุลพินิจของเจ้าหน้าที่ผู้รับผิดชอบเคส';

export async function logExport(params: { case_id?: string | null; case_code?: string | null; format: string }) {
  const { error } = await supabase.from('case_exports').insert({
    case_id: params.case_id ?? null,
    case_code: params.case_code ?? null,
    format: params.format,
  } as never);
  if (error) console.error('export log failed', error);
}

const BASE_CSS = `
@page { size: A4; margin: 15mm; }
* { box-sizing: border-box; }
body { font-family:'IBM Plex Sans Thai','Noto Sans Thai',system-ui,sans-serif; color:#161615; margin:0; padding:24px; line-height:1.55; }
.brand { display:block; width:128px; max-height:110px; object-fit:contain; margin:0 0 10px; }
h1 { margin:0 0 2px; font-family:'Bai Jamjuree','Noto Sans Thai',sans-serif; font-size:20px; color:#2a2a2e; }
.sub { color:#5b6168; font-size:11px; margin-bottom:14px; }
.section { margin-bottom:14px; break-inside:avoid; }
.section h2 { font-family:'Bai Jamjuree','Noto Sans Thai',sans-serif; font-size:12px; color:#fff; background:#2a2a2e; margin:0 0 8px; padding:5px 8px; border-radius:4px; }
table { width:100%; border-collapse:collapse; font-size:11px; }
th, td { border:1px solid #d0e2e2; padding:5px 7px; text-align:left; vertical-align:top; }
th { background:#e3f1f1; color:#2a2a2e; font-weight:600; width:26%; }
.qa { border:1px solid #d0e2e2; border-radius:6px; padding:8px; margin-bottom:6px; font-size:11px; break-inside:avoid; }
.qa .q { color:#5b6168; }
.qa .a { margin-top:3px; }
.note { font-size:10px; color:#7a5c00; background:#fff8e1; border:1px solid #ffe08a; border-radius:6px; padding:8px; }
.sig { display:flex; gap:24px; margin-top:8px; }
.sig div { flex:1; text-align:center; font-size:10px; color:#5b6168; }
.sig img { max-height:60px; display:block; margin:0 auto 4px; }
.footer { margin-top:20px; font-size:9.5px; color:#5b6168; text-align:center; border-top:1px solid #d0e2e2; padding-top:8px; }
@media print { body { padding:0; } }
`;

export interface CaseReportData {
  id: string;
  case_code: string;
  status: CaseStatus;
  severity: string | null;
  created_at: string;
  reporter: any;
  victim: any;
  profile: any;
  answers: any;
  staff_observations: any;
  ai_result: any;
  ai_reviewed?: boolean;
  screening?: any;
  suicide_risk?: boolean;
  has_violation: boolean | null;
  violation_details: any;
  extra_facts: string | null;
  referrals: any;
  referral_note: string | null;
  signature_staff: string | null;
  signature_staff_name: string | null;
  signature_client?: string | null;
  assignee_name?: string | null;
  document_drafts?: Record<string, unknown>;
}

/** เอกสารส่งต่อรายเคส (OSCC / ตำรวจ / ทนาย) — พิมพ์เป็น PDF ผ่านเบราว์เซอร์ */
export function printCaseReport(c: CaseReportData) {
  const p = c.profile || {};
  const s = c.screening || {};
  const q9 = typeof s.q9Total === 'number' ? `${s.q9Total} (${q9Level(s.q9Total).label})` : '-';

  const answers = (c.answers || []).map((a: any, i: number) => `
    <div class="qa">
      <div class="q"><strong>${i + 1}. ${esc(a.question)}</strong> · ${esc(a.cat)}</div>
      <div class="a">${esc(a.transcript || '(ไม่มีคำตอบ)')}</div>
      ${c.staff_observations?.[i] ? `<div class="q" style="margin-top:3px">บันทึกเจ้าหน้าที่: ${esc(c.staff_observations[i])}</div>` : ''}
    </div>`).join('');

  const html = `<!doctype html><html lang="th"><head><meta charset="utf-8" />
  <title>SWING Case Report ${esc(c.case_code)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Bai+Jamjuree:wght@600;700&family=IBM+Plex+Sans+Thai:wght@400;600&display=swap" rel="stylesheet">
  <style>${BASE_CSS}</style></head><body>
  <img class="brand" src="${lockupImg}" alt="SWING RIGHTS" />
  <h1>มูลนิธิเพื่อนพนักงานบริการ (SWING Foundation) — รายงานเคส (เอกสารส่งต่อ)</h1>
  <div class="sub">รหัสเคส <strong>${esc(c.case_code)}</strong> · รับเรื่อง ${new Date(c.created_at).toLocaleString('th-TH')} · ออกเอกสาร ${new Date().toLocaleString('th-TH')}</div>

  <div class="section"><h2>ข้อมูลเคส</h2><table>
    <tr><th>สถานะ</th><td>${esc(STATUS_LABEL[c.status])}</td></tr>
    <tr><th>ระดับความรุนแรง</th><td>${esc(c.severity ? SEV_LABEL[c.severity as keyof typeof SEV_LABEL] : '-')}</td></tr>
    <tr><th>ผู้รับผิดชอบเคส</th><td>${esc(c.assignee_name || 'ยังไม่มอบหมาย')}</td></tr>
    <tr><th>พื้นที่บริการ</th><td>${esc(p.branch)}</td></tr>
    <tr><th>พื้นที่เกิดเหตุ</th><td>${esc(p.incidentPlace)}</td></tr>
  </table></div>

  <div class="section"><h2>ผู้แจ้ง / ผู้รับบริการ</h2><table>
    <tr><th>ผู้แจ้ง</th><td>${esc(c.reporter?.name)} · ${esc(c.reporter?.phone)} ${c.reporter?.type === 'other' ? '(แจ้งแทน)' : ''}</td></tr>
    <tr><th>ผู้รับบริการ</th><td>${esc(c.victim?.name)} · ${esc(c.victim?.contact)}</td></tr>
    <tr><th>กลุ่มประชากร / เพศ</th><td>${esc(p.kp)} · ${esc(p.gender)}</td></tr>
    <tr><th>อายุ / สัญชาติ</th><td>${esc(p.age)} ปี · ${esc(p.nationality)}</td></tr>
  </table></div>

  <div class="section"><h2>ผลการประเมินของเจ้าหน้าที่</h2><table>
    <tr><th>พบการละเมิด</th><td>${c.has_violation ? 'ใช่' : c.has_violation === false ? 'ไม่พบ' : '-'}</td></tr>
    <tr><th>รายละเอียดการละเมิด</th><td>${esc((c.violation_details || []).join(' · '))}</td></tr>
    <tr><th>ข้อเท็จจริงเพิ่มเติม</th><td>${esc(c.extra_facts)}</td></tr>
  </table></div>

  <div class="section"><h2>แบบคัดกรองมาตรฐาน</h2><table>
    <tr><th>2Q (ซึมเศร้า)</th><td>${s.q2Positive === undefined ? '-' : s.q2Positive ? 'ผิดปกติ' : 'ปกติ'}</td></tr>
    <tr><th>9Q คะแนนรวม</th><td>${esc(q9)}</td></tr>
    <tr><th>ความเสี่ยงทำร้ายตนเอง (9Q ข้อ 9)</th><td>${c.suicide_risk ? 'พบ — ดำเนินการ safety planning + สายด่วน 1323' : 'ไม่พบ'}</td></tr>
    <tr><th>NRM (ค้ามนุษย์)</th><td>${s.nrmPositive === undefined ? '-' : s.nrmPositive ? 'เข้าข่าย — ส่งต่อทีมสหวิชาชีพ' : 'ยังไม่เข้าเกณฑ์'}${s.nrmUnder18 ? ' · ผู้เยาว์ต่ำกว่า 18 ปี' : ''}</td></tr>
  </table></div>

  ${c.ai_result ? `<div class="section"><h2>ความเห็นเบื้องต้นจากระบบ AI (เจ้าหน้าที่ทบทวนแล้ว${c.ai_reviewed ? '' : ' — ยังไม่ทบทวน'})</h2>
    <table>
      <tr><th>คะแนนความเสี่ยง</th><td>${esc(c.ai_result.riskScore)} / 100 (${esc(c.ai_result.riskLevel)})</td></tr>
      <tr><th>สรุปสถานการณ์</th><td>${esc(c.ai_result.summary)}</td></tr>
      <tr><th>ประเภทการละเมิด</th><td>${esc((c.ai_result.violationTags || []).map((t: any) => t.label).join(' · '))}</td></tr>
      <tr><th>ข้อเสนอแนะ</th><td>${(c.ai_result.recommendations || []).map((r: string) => `• ${esc(r)}`).join('<br/>')}</td></tr>
    </table>
    <p class="note" style="margin-top:8px">${AI_DISCLAIMER}</p></div>` : ''}

  <div class="section"><h2>บันทึกการสัมภาษณ์</h2>${answers || '<p style="font-size:11px;color:#888">ไม่มีข้อมูล</p>'}</div>

  <div class="section"><h2>การส่งต่อ</h2><table>
    <tr><th>หน่วยงาน</th><td>${esc((c.referrals || []).join(' · ')) || '-'}</td></tr>
    <tr><th>หมายเหตุ</th><td>${esc(c.referral_note)}</td></tr>
  </table></div>

  <div class="section"><h2>ลายเซ็น</h2><div class="sig">
    <div>${c.signature_staff ? `<img src="${c.signature_staff}" alt="" />` : '<div style="height:60px"></div>'}<div>เจ้าหน้าที่ ${esc(c.signature_staff_name)}</div></div>
    <div>${c.signature_client ? `<img src="${c.signature_client}" alt="" />` : '<div style="height:60px"></div>'}<div>ผู้รับบริการ / ผู้แจ้ง</div></div>
  </div></div>

  <div class="footer">มูลนิธิเพื่อนพนักงานบริการ (SWING Foundation) · เอกสารลับ สำหรับการส่งต่อหน่วยงานที่เกี่ยวข้องเท่านั้น · การเปิดเผยต่อบุคคลภายนอกต้องได้รับความยินยอมตาม PDPA</div>
  <script>window.onload = () => setTimeout(() => window.print(), 400);</script>
  </body></html>`;

  const w = window.open('', '_blank');
  if (!w) { toast.error('กรุณาอนุญาต popup เพื่อพิมพ์เอกสาร'); return false; }
  w.document.write(html);
  w.document.close();
  void logExport({ case_id: c.id, case_code: c.case_code, format: 'case_pdf' });
  return true;
}
