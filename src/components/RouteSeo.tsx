import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";

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

const FALLBACK: Meta = { title: "SWING RIGHTS", description: "พื้นที่ปลอดภัยสำหรับแจ้งเหตุ รู้สิทธิ และติดตามความช่วยเหลือจาก SWING", noindex: true };

export function RouteSeo() {
  const { pathname } = useLocation();
  const meta = PAGES[pathname] ?? FALLBACK;
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
      {meta.noindex && <meta name="robots" content="noindex" />}
    </Helmet>
  );
}
