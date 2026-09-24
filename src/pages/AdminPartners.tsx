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
import { useI18n } from '@/i18n';
import { LanguageToggle } from '@/components/LanguageToggle';

const ORG_TYPE_KEYS: { v: string; key: string }[] = [
  { v: 'hospital', key: 'partners.orgType.hospital' },
  { v: 'legal', key: 'partners.orgType.legal' },
  { v: 'ngo', key: 'partners.orgType.ngo' },
  { v: 'shelter', key: 'partners.orgType.shelter' },
  { v: 'police', key: 'partners.orgType.police' },
  { v: 'hotline', key: 'partners.orgType.hotline' },
  { v: 'other', key: 'partners.orgType.other' },
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
  const { t } = useI18n();
  const ORG_TYPES = ORG_TYPE_KEYS.map((o) => ({ v: o.v, label: t(o.key) }));
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
    if (!form.name.trim()) { toast.error(t('partners.error.nameRequired')); return; }
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
    if (error) { toast.error(t('partners.error.saveFailed')); return; }
    toast.success(t('partners.success.added'));
    setForm(EMPTY);
    setOpen(false);
    qc.invalidateQueries({ queryKey: ['admin-partners'] });
  };

  const toggle = async (p: Partner) => {
    const { error } = await supabase.from('referral_partners' as never).update({ active: !p.active } as never).eq('id', p.id);
    if (error) { toast.error(t('partners.error.updateFailed')); return; }
    qc.invalidateQueries({ queryKey: ['admin-partners'] });
  };

  const remove = async (p: Partner) => {
    if (!window.confirm(t('partners.confirmDelete', { name: p.name }))) return;
    const { error } = await supabase.from('referral_partners' as never).delete().eq('id', p.id);
    if (error) { toast.error(t('partners.error.deleteFailed')); return; }
    toast.success(t('partners.success.deleted'));
    qc.invalidateQueries({ queryKey: ['admin-partners'] });
  };

  if (loading || isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }
  if (!isAdmin) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">{t('partners.adminOnly')}</div>;
  }

  const typeLabel = (v: string) => ORG_TYPES.find((o) => o.v === v)?.label ?? v;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary-deep text-primary-foreground sticky top-0 z-30 shadow-elegant">
        <div className="max-w-4xl mx-auto px-5 py-4 flex items-center gap-3">
          <Link to="/admin" className="w-10 h-10 rounded-full bg-sidebar-accent hover:bg-sidebar-accent/80 flex items-center justify-center transition">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="font-display font-semibold">{t('partners.header.title')}</h1>
            <p className="text-[11px] text-sidebar-foreground/60">{t('partners.header.subtitle')}</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <LanguageToggle className="ml-auto border-sidebar-border bg-sidebar-accent text-sidebar-foreground hover:text-sidebar-foreground" />
            <DialogTrigger asChild>
              <Button size="sm" variant="action"><Plus className="w-4 h-4 mr-1" /> {t('partners.add')}</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{t('partners.add.title')}</DialogTitle></DialogHeader>
              <div className="grid gap-3 py-2">
                <Input placeholder={t('partners.form.namePlaceholder')} value={form.name} onChange={(e) => set('name', e.target.value)} maxLength={200} />
                <Select value={form.org_type} onValueChange={(v) => set('org_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ORG_TYPES.map((o) => <SelectItem key={o.v} value={o.v}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder={t('partners.form.provincePlaceholder')} value={form.province} onChange={(e) => set('province', e.target.value)} maxLength={80} />
                  <Input placeholder={t('partners.form.districtPlaceholder')} value={form.district} onChange={(e) => set('district', e.target.value)} maxLength={80} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder={t('partners.form.phonePlaceholder')} value={form.phone} onChange={(e) => set('phone', e.target.value)} maxLength={60} />
                  <Input placeholder={t('partners.form.emailPlaceholder')} value={form.email} onChange={(e) => set('email', e.target.value)} maxLength={120} />
                </div>
                <Input placeholder={t('partners.form.addressPlaceholder')} value={form.address} onChange={(e) => set('address', e.target.value)} maxLength={300} />
                <Input placeholder={t('partners.form.servicesPlaceholder')} value={form.services} onChange={(e) => set('services', e.target.value)} maxLength={500} />
                <Textarea placeholder={t('partners.form.notesPlaceholder')} value={form.notes} onChange={(e) => set('notes', e.target.value)} maxLength={1000} rows={2} />
                <Button onClick={() => void add()} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t('partners.save')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-5 py-6 space-y-3">
        {partners.length === 0 && (
          <div className="bg-card border border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
            {t('partners.empty')}
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
                  {!p.active && <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{t('partners.inactive')}</span>}
                </div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {[p.district, p.province].filter(Boolean).join(' · ') || t('partners.allAreas')}
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
                  {p.active ? t('partners.disable') : t('partners.enable')}
                </Button>
                <Button size="sm" variant="ghost" className="h-8 text-[11px] text-destructive" onClick={() => void remove(p)}>
                  <Trash2 className="w-3 h-3 mr-1" /> {t('partners.delete')}
                </Button>
              </div>
            </div>
          </article>
        ))}
      </main>
    </div>
  );
}
