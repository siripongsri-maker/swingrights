import { Link } from 'react-router-dom';
import { ShieldCheck, Mic, Sparkles, Search, ArrowRight, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-soft">
      <header className="max-w-5xl mx-auto px-5 pt-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center shadow-elegant">
            <ShieldCheck className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-medium tracking-wide">SWING · Voice Screening</span>
        </div>
        <Link to="/admin/login" className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1">
          <Lock className="w-3 h-3" /> เจ้าหน้าที่
        </Link>
      </header>

      <main className="max-w-5xl mx-auto px-5 pt-16 pb-20 text-center">
        <span className="inline-block bg-primary-soft text-primary text-[10px] font-medium tracking-[0.14em] px-3 py-1.5 rounded-full mb-5">
          SWING FOUNDATION · RIGHTS & VIOLATION TOOL
        </span>
        <h1 className="text-4xl sm:text-5xl font-medium leading-tight text-balance mb-4">
          คัดกรองเสียง · บันทึกการละเมิดสิทธิ์<br />
          <span className="bg-gradient-primary bg-clip-text text-transparent">ด้วย AI ที่เคียงข้างเจ้าหน้าที่</span>
        </h1>
        <p className="text-base text-muted-foreground max-w-xl mx-auto mb-8 text-balance">
          เครื่องมือสัมภาษณ์ผู้ถูกละเมิด พร้อมประเมินความเสี่ยง สรุปสถานการณ์ และแนะนำการส่งต่อโดยอัตโนมัติ
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-12">
          <Link to="/intake">
            <Button size="lg" className="h-12 px-6 rounded-xl bg-gradient-primary shadow-elegant">
              <Mic className="w-4 h-4" /> เริ่มสัมภาษณ์เคสใหม่ <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link to="/track">
            <Button size="lg" variant="outline" className="h-12 px-6 rounded-xl">
              <Search className="w-4 h-4" /> ติดตามสถานะเคส
            </Button>
          </Link>
        </div>

      </main>
    </div>
  );
}
