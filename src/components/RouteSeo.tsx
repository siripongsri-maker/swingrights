import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";
import { useI18n, type Lang } from "@/i18n";

const BASE = "https://swingrights.app";

type Meta = { title: string; description: string; noindex?: boolean };

const PAGES: Record<string, Meta> = {
  "/": { title: "SWING RIGHTS — แจ้งเหตุและติดตามความช่วยเหลือ", description: "พื้นที่ปลอดภัยสำหรับพนักงานบริการ แจ้งเหตุ รู้สิทธิ และติดตามความช่วยเหลือจากมูลนิธิเพื่อนพนักงานบริการ (SWING)" },
  "/report": { title: "แจ้งเรื่องด้วยตนเอง — SWING RIGHTS", description: "แจ้งเหตุละเมิดสิทธิได้ด้วยตนเอง พิมพ์หรือพูดได้หลายภาษา ไม่ต้องลงทะเบียน ข้อมูลเก็บเป็นความลับตาม PDPA" },
  "/track": { title: "ติดตามสถานะเรื่อง — SWING RIGHTS", description: "ใช้รหัสเคสเพื่อติดตามสถานะเรื่องที่แจ้งไว้กับ SWING และตอบคำถามจากเจ้าหน้าที่ได้อย่างปลอดภัย" },
  "/rights": { title: "รู้สิทธิของคุณ — SWING RIGHTS", description: "สิทธิพื้นฐานของพนักงานบริการ ถ้าถูกตำรวจจับ ถูกละเมิด หรือต้องการความช่วยเหลือ พร้อมเบอร์สายด่วน 24 ชั่วโมง" },
  "/privacy": { title: "นโยบายความเป็นส่วนตัว — SWING RIGHTS", description: "วิธีที่มูลนิธิเพื่อนพนักงานบริการเก็บ ใช้ และคุ้มครองข้อมูลส่วนบุคคลของคุณตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล" },
  "/signin": { title: "เข้าสู่ระบบ — SWING RIGHTS", description: "เข้าสู่ระบบหรือสมัครบัญชีผู้แจ้งเพื่อติดตามเคสของคุณและใช้ปุ่ม SOS ติดต่อเจ้าหน้าที่ SWING", noindex: true },
  "/intake": { title: "รับเรื่องโดยเจ้าหน้าที่ — SWING Foundation", description: "แบบฟอร์มรับเรื่องสำหรับเจ้าหน้าที่มูลนิธิเพื่อนพนักงานบริการ บันทึกเสียง ประเมิน และส่งต่อความช่วยเหลือ", noindex: true },
};

const REPORT_META: Record<Lang, Meta> = {
  th: PAGES["/report"],
  en: { title: "Report a rights violation — SWING RIGHTS", description: "Report a rights violation confidentially by typing or speaking. No account is required, and support is available from SWING Foundation." },
  my: { title: "အခွင့်အရေးချိုးဖောက်မှုကို တိုင်ကြားရန် — SWING RIGHTS", description: "မြန်မာဘာသာဖြင့် စာရိုက်၍ဖြစ်စေ အသံဖြင့်ဖြစ်စေ လျှို့ဝှက်စွာ တိုင်ကြားနိုင်ပါသည်။ အကောင့်ဖွင့်ရန် မလိုအပ်ပါ။" },
  km: { title: "រាយការណ៍ការរំលោភសិទ្ធិ — SWING RIGHTS", description: "រាយការណ៍ការរំលោភសិទ្ធិជាភាសាខ្មែរ ដោយវាយអត្ថបទ ឬនិយាយដោយសម្ងាត់។ មិនចាំបាច់ចុះឈ្មោះទេ។" },
  lo: { title: "ລາຍງານການລະເມີດສິດ — SWING RIGHTS", description: "ລາຍງານການລະເມີດສິດເປັນພາສາລາວ ດ້ວຍການພິມ ຫຼື ເວົ້າຢ່າງເປັນຄວາມລັບ ໂດຍບໍ່ຕ້ອງລົງທະບຽນ." },
};

const REPORT_PATH: Record<Lang, string> = { th: "/report", en: "/report/en", my: "/report/my", km: "/report/km", lo: "/report/lo" };

const FALLBACK: Meta = { title: "SWING RIGHTS", description: "พื้นที่ปลอดภัยสำหรับแจ้งเหตุ รู้สิทธิ และติดตามความช่วยเหลือจาก SWING", noindex: true };

export function RouteSeo() {
  const { pathname } = useLocation();
  const { lang } = useI18n();
  const isReport = /^\/report(?:\/(?:en|my|km|lo))?\/?$/.test(pathname);
  const routeLang = (pathname.match(/^\/report\/(en|my|km|lo)\/?$/)?.[1] as Lang | undefined) ?? (pathname === '/report' ? 'th' : lang);
  const meta = isReport ? REPORT_META[routeLang] : (PAGES[pathname] ?? FALLBACK);
  const url = `${BASE}${pathname}`;
  return (
    <Helmet>
      <title>{meta.title}</title>
      <meta name="description" content={meta.description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={meta.title} />
      <meta property="og:description" content={meta.description} />
      <meta property="og:url" content={url} />
      <meta name="twitter:title" content={meta.title} />
      <meta name="twitter:description" content={meta.description} />
      {isReport && (Object.entries(REPORT_PATH) as [Lang, string][]).map(([code, path]) => (
        <link key={code} rel="alternate" hrefLang={code} href={`${BASE}${path}`} />
      ))}
      {isReport && <link rel="alternate" hrefLang="x-default" href={`${BASE}/report`} />}
      {meta.noindex && <meta name="robots" content="noindex" />}
    </Helmet>
  );
}
