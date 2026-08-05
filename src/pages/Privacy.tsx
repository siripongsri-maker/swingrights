import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

const UPDATED = '5 สิงหาคม 2569';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-card border border-border rounded-xl p-5 shadow-card space-y-2">
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="text-sm text-muted-foreground space-y-2 leading-relaxed">{children}</div>
    </section>
  );
}

export default function Privacy() {
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-gradient-dark text-white">
        <div className="max-w-3xl mx-auto px-5 py-5 flex items-center gap-3">
          <Link to="/" className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> นโยบายความเป็นส่วนตัว (PDPA)
            </h1>
            <p className="text-xs text-white/70">มูลนิธิ SWING · ปรับปรุงล่าสุด {UPDATED}</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-5 py-6 space-y-4">
        <Section title="1. ผู้ควบคุมข้อมูลส่วนบุคคล">
          <p>
            มูลนิธิเพื่อนพนักงานบริการ (SWING) เป็นผู้ควบคุมข้อมูลส่วนบุคคลของระบบคัดกรองการละเมิดสิทธิด้วยเสียงนี้
            ติดต่อเจ้าหน้าที่คุ้มครองข้อมูล (DPO) ได้ที่อีเมล <span className="text-foreground">dpo@swingthailand.org</span>
          </p>
        </Section>

        <Section title="2. ข้อมูลที่เก็บรวบรวม">
          <ul className="list-disc pl-5 space-y-1">
            <li>ข้อมูลระบุตัวตน: ชื่อ-นามสกุล ที่อยู่ เบอร์โทร อีเมลของผู้แจ้งและผู้รับบริการ</li>
            <li>ข้อมูลอ่อนไหว: กลุ่มประชากร เพศสภาพ สถานะสุขภาพจิต (2Q/9Q) และรายละเอียดเหตุการณ์ละเมิด</li>
            <li>ไฟล์เสียงสัมภาษณ์ ข้อความถอดเสียง รูปภาพประกอบ และลายเซ็นอิเล็กทรอนิกส์</li>
            <li>ข้อมูลการใช้งานระบบเท่าที่จำเป็นเพื่อความปลอดภัย (เวลาเข้าดูเคส ผู้เข้าดู)</li>
          </ul>
        </Section>

        <Section title="3. ฐานทางกฎหมายและวัตถุประสงค์">
          <p>
            เก็บและใช้ข้อมูลบนฐาน <strong className="text-foreground">ความยินยอมโดยชัดแจ้ง</strong> (มาตรา 26 สำหรับข้อมูลอ่อนไหว)
            และฐานประโยชน์สำคัญต่อชีวิตในกรณีฉุกเฉินที่มีความเสี่ยงต่อชีวิต เพื่อวัตถุประสงค์:
            รับเรื่องและช่วยเหลือผู้ถูกละเมิดสิทธิ ส่งต่อหน่วยงานที่เกี่ยวข้อง และจัดทำสถิติแบบไม่ระบุตัวตน
          </p>
        </Section>

        <Section title="4. การเก็บข้อมูลแบบแยกส่วน (data minimisation)">
          <p>
            ข้อมูลระบุตัวตน (ชื่อ ที่อยู่ เบอร์โทร) ถูกจัดเก็บแยกจากเนื้อหาเคสในตารางเฉพาะที่ไม่มีผู้ใดอ่านได้โดยตรง
            ต้องเรียกผ่านฟังก์ชันที่ตรวจสิทธิ์และ <strong className="text-foreground">บันทึกประวัติการเข้าดูทุกครั้ง</strong>
            หน้ารายการเคสจะแสดงเพียงชื่อแบบปกปิด (เช่น ส•••) และรหัสเคสเท่านั้น
          </p>
        </Section>

        <Section title="5. การใช้ AI">
          <p>
            ระบบใช้ AI ช่วยถอดเสียงและสรุปความเสี่ยงเบื้องต้น ข้อมูลจะถูก
            <strong className="text-foreground">ลบข้อมูลระบุตัวตนออกก่อนส่งประมวลผลทุกครั้ง</strong>
            ไม่มีการนำข้อมูลไปฝึกโมเดล และผลลัพธ์ของ AI เป็นเพียงข้อเสนอแนะ — การตัดสินใจทั้งหมดทำโดยเจ้าหน้าที่
          </p>
        </Section>

        <Section title="6. ผู้ที่เข้าถึงข้อมูลได้">
          <ul className="list-disc pl-5 space-y-1">
            <li>ผู้ดูแลระบบ / หัวหน้างาน: เข้าถึงเคสทั้งหมดเท่าที่จำเป็นต่อการกำกับดูแล</li>
            <li>นักสังคมสงเคราะห์: เข้าถึงข้อมูลระบุตัวตนเฉพาะเคสที่ได้รับมอบหมาย</li>
            <li>ผู้อ่านอย่างเดียว: เห็นเฉพาะข้อมูลเคสแบบไม่ระบุตัวตน</li>
            <li>หน่วยงานภายนอกจะได้รับข้อมูลเฉพาะเมื่อเจ้าของข้อมูลยินยอมให้ส่งต่อ</li>
          </ul>
        </Section>

        <Section title="7. ระยะเวลาจัดเก็บ">
          <p>
            เก็บข้อมูลเคส 5 ปีนับจากวันปิดเคส (สอดคล้องกับอายุความคดี) ไฟล์เสียงและรูปภาพเก็บ 1 ปีหลังปิดเคส
            เมื่อครบกำหนดจะลบหรือทำให้ไม่สามารถระบุตัวบุคคลได้
          </p>
        </Section>

        <Section title="8. สิทธิของเจ้าของข้อมูล">
          <p>ท่านมีสิทธิตาม พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 ได้แก่</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>ขอเข้าถึงและขอสำเนาข้อมูล</li>
            <li>ขอแก้ไขให้ถูกต้องเป็นปัจจุบัน</li>
            <li>ขอลบ ทำลาย หรือทำให้ไม่ระบุตัวตน</li>
            <li>ขอระงับการใช้ / คัดค้านการประมวลผล</li>
            <li>ถอนความยินยอมเมื่อใดก็ได้ โดยไม่กระทบการช่วยเหลือที่ได้ดำเนินการไปแล้ว</li>
            <li>ร้องเรียนต่อสำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล</li>
          </ul>
          <p>
            ใช้สิทธิได้โดยแจ้งรหัสเคสของท่านมาที่ dpo@swingthailand.org หรือติดต่อเจ้าหน้าที่ที่รับเรื่อง
            ระบบจะดำเนินการภายใน 30 วัน
          </p>
        </Section>

        <Section title="9. มาตรการความปลอดภัย">
          <ul className="list-disc pl-5 space-y-1">
            <li>เข้ารหัสข้อมูลระหว่างส่งและขณะจัดเก็บ</li>
            <li>ควบคุมสิทธิ์ระดับแถวข้อมูล (RLS) ตามบทบาทผู้ใช้</li>
            <li>ไฟล์เสียง/รูปภาพเป็นที่จัดเก็บแบบปิด เปิดดูผ่านลิงก์ชั่วคราวอายุ 5 นาที</li>
            <li>ออกจากระบบอัตโนมัติเมื่อไม่มีการใช้งาน 20 นาที และบันทึก audit log ทุกการแก้ไข</li>
          </ul>
        </Section>

        <Section title="10. เหตุละเมิดข้อมูล">
          <p>หากเกิดเหตุละเมิดข้อมูลส่วนบุคคล มูลนิธิจะแจ้งสำนักงานฯ ภายใน 72 ชั่วโมง และแจ้งเจ้าของข้อมูลเมื่อมีความเสี่ยงสูง</p>
        </Section>

        <p className="text-xs text-muted-foreground text-center pb-6">
          เอกสารนี้จัดทำโดยมูลนิธิ SWING เพื่ออธิบายแนวปฏิบัติของระบบ · ไม่ใช่การรับรองหรือตรวจสอบโดยบุคคลที่สาม
        </p>
      </main>
    </div>
  );
}
