import { Phone, Siren } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { SOS_CONTACTS } from '@/lib/myReports';
import { useI18n } from '@/i18n';

export function SosButton() {
  const { t, lang } = useI18n();
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive" className="w-full h-14 text-base font-bold rounded-[1.25rem]">
          <Siren className="w-5 h-5" /> {t('cl.sos.button')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('cl.sos.title')}</DialogTitle>
          <DialogDescription>{t('cl.sos.desc')}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          {SOS_CONTACTS.map((c) => (
            <a key={c.phone} href={`tel:${c.phone}`} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 min-h-14 hover:border-destructive transition-colors">
              <span className="w-10 h-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center shrink-0"><Phone className="w-5 h-5" /></span>
              <span className="flex-1">
                <span className="block font-semibold">{lang === 'th' ? `คุณ${c.name}` : c.nameEn} · {t(`cl.sos.${c.area}`)}</span>
                <span className="block font-mono text-sm text-muted-foreground">{c.phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3')}</span>
              </span>
            </a>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
