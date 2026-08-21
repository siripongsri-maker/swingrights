import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Building2, Loader2, Mail, MapPin, Phone, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAccess } from '@/hooks/useAccess';

const ORG_TYPES = [
  { v: 'hospital', label: 'โรงพยาบาล / สุขภาพ' },
  { v: 'legal', label: 'กฎหมาย / ทนาย' },
  { v: 'ngo', label: 'องค์กรภาคประชาชน' },
  { v: 'shelter', label: 'ศูนย์พักพิง' },
  { v: 'police', label: 'ตำรวจ / หน่วยงานรัฐ' },
  { v: 'hotline', label: 'สายด่วน' },
  { v: 'other', label: 'อื่น ๆ' },
];

interface Partner {
  id: string;
  name: string;
  org_type: string;
  province: string | null;
  district: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  services: string[];
  active: boolean;
  notes: string | null;
}

const EMPTY = { name: '', org_type: 'ngo', province: '', district: '', phone: '', email: '', address: '', services: '', notes: '' };

export default function AdminPartners() {
  const { isAdmin, loading } = useAccess();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const { data: partners = [], isLoading } = useQuery({
    queryKey: ['admin-partners'],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('referral_partners' as never)
        .select('id,name,org_type,province,district,phone,email,address,services,active,notes')
        .order('province')
        .order('name');
      if (error) throw error;
      return (data ?? []) as unknown as Partner[];
    },
  });

  const set = (k: keyof typeof EMPTY, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const add = async () => {
    if (!form.name.trim()) { toast.error('กรุณากรอกชื่อหน่วยงาน'); return; }
    setSaving(true);
    const services = form.services.split(',').map((s) => s.trim()).filter(Boolean);
    const { error } = await supabase.from('referral_partners' as never).insert({
      name: form.name.trim(),
      org_type: form.org_type,
      province: form.province.trim() || null,
      district: form.district.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      address: form.address.trim() || null,
      services,
      notes: form.notes.trim() || null,
      active: true,
    } as never);
    setSaving(false);
    if (error) { toast.error('บันทึกไม่สำเร็จ'); return; }
    toast.success('เพิ่มหน่วยงานแล้ว');
    setForm(EMPTY);
    setOpen(false);
    qc.invalidateQueries({ queryKey: ['admin-partners'] });
  };

  const toggle = async (p: Partner) => {
    const { error } = await supabase.from('referral_partners' as never).update({ active: !p.active } as never).eq('id', p.id);
    if (error) { toast.error('อัปเดตไม่สำเร็จ'); return; }
    qc.invalidateQueries({ queryKey: ['admin-partners'] });
  };

  const remove = async (p: Partner) => {
    if (!window.confirm(`ลบ "${p.name}" ออกจากรายชื่อหน่วยงานรับส่งต่อ?`)) return;
    const { error } = await supabase.from('referral_partners' as never).delete().eq('id', p.id);
    if (error) { toast.error('ลบไม่สำเร็จ'); return; }
    toast.success('ลบแล้ว');
    qc.invalidateQueries({ queryKey: ['admin-partners'] });
  };

  if (loading || isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }
  if (!isAdmin) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">เฉพาะผู้ดูแลระบบ</div>;
  }

  const typeLabel = (v: string) => ORG_TYPES.find((o) => o.v === v)?.label ?? v;

  return (
    <div className="min-h-screen bg-gradient-leaf grain">
      <header className="bg-gradient-dark text-white sticky top-0 z-30 shadow-elegant">
        <div className="max-w-4xl mx-auto px-5 py-4 flex items-center gap-3">
          <Link to="/admin" className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="font-display font-semibold">หน่วยงานรับส่งต่อ</h1>
            <p className="text-[11px] text-white/60">เครือข่ายช่วยเหลือรายพื้นที่ — ใช้แนะนำในรายละเอียดเคส</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="ml-auto"><Plus className="w-4 h-4 mr-1" /> เพิ่มหน่วยงาน</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>เพิ่มหน่วยงานรับส่งต่อ</DialogTitle></DialogHeader>
              <div className="grid gap-3 py-2">
                <Input placeholder="ชื่อหน่วยงาน *" value={form.name} onChange={(e) => set('name', e.target.value)} maxLength={200} />
                <Select value={form.org_type} onValueChange={(v) => set('org_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ORG_TYPES.map((o) => <SelectItem key={o.v} value={o.v}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="จังหวัด (เว้นว่าง = ทุกพื้นที่)" value={form.province} onChange={(e) => set('province', e.target.value)} maxLength={80} />
                  <Input placeholder="อำเภอ/เขต" value={form.district} onChange={(e) => set('district', e.target.value)} maxLength={80} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="โทรศัพท์" value={form.phone} onChange={(e) => set('phone', e.target.value)} maxLength={60} />
                  <Input placeholder="อีเมล" value={form.email} onChange={(e) => set('email', e.target.value)} maxLength={120} />
                </div>
                <Input placeholder="ที่อยู่" value={form.address} onChange={(e) => set('address', e.target.value)} maxLength={300} />
                <Input placeholder="บริการที่ให้ (คั่นด้วย ,) เช่น ตรวจสุขภาพ, ให้คำปรึกษากฎหมาย" value={form.services} onChange={(e) => set('services', e.target.value)} maxLength={500} />
                <Textarea placeholder="หมายเหตุภายใน" value={form.notes} onChange={(e) => set('notes', e.target.value)} maxLength={1000} rows={2} />
                <Button onClick={() => void add()} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'บันทึก'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-5 py-6 space-y-3">
        {partners.length === 0 && (
          <div className="bg-card border border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
            ยังไม่มีหน่วยงานในระบบ — กด "เพิ่มหน่วยงาน" เพื่อเริ่มสร้างเครือข่ายรายพื้นที่
          </div>
        )}
        {partners.map((p) => (
          <article key={p.id} className={`bg-card border border-border rounded-xl p-4 shadow-card ${p.active ? '' : 'opacity-50'}`}>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary-soft flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-medium text-sm">{p.name}</h2>
                  <span className="text-[10px] bg-primary-soft text-primary px-2 py-0.5 rounded-full">{typeLabel(p.org_type)}</span>
                  {!p.active && <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">ปิดใช้งาน</span>}
                </div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {[p.district, p.province].filter(Boolean).join(' · ') || 'ทุกพื้นที่'}
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-muted-foreground">
                  {p.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{p.phone}</span>}
                  {p.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{p.email}</span>}
                </div>
                {Array.isArray(p.services) && p.services.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {p.services.map((s, i) => <span key={i} className="text-[10px] bg-muted px-2 py-0.5 rounded-full">{s}</span>)}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1.5 shrink-0">
                <Button size="sm" variant="outline" className="h-8 text-[11px]" onClick={() => void toggle(p)}>
                  {p.active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                </Button>
                <Button size="sm" variant="ghost" className="h-8 text-[11px] text-destructive" onClick={() => void remove(p)}>
                  <Trash2 className="w-3 h-3 mr-1" /> ลบ
                </Button>
              </div>
            </div>
          </article>
        ))}
      </main>
    </div>
  );
}
