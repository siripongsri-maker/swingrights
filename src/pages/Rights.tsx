import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronsUpDown, Leaf, Phone, Share2 } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { LanguageToggle } from '@/components/LanguageToggle';
import { useI18n } from '@/i18n';
import { RIGHTS, RIGHTS_SECTIONS, type RightsSectionId } from '@/data/rights';
import { toast } from 'sonner';

/** Placeholder — SWING fills in the real hotline number. */
const SWING_PHONE = '+6600000000';

const SECTION_LABEL_KEYS: Record<RightsSectionId, string> = {
  arrest: 'rights.section.arrest',
  investigation: 'rights.section.investigation',
  detention: 'rights.section.detention',
};

export default function Rights() {
  const { t } = useI18n();
  const [open, setOpen] = useState<string[]>([]);
  const allOpen = open.length === RIGHTS.length;

  const toggleAll = () => setOpen(allOpen ? [] : RIGHTS.map((r) => String(r.id)));

  const share = async () => {
    const url = window.location.href;
    const data = { title: t('rights.title'), text: t('rights.subtitle'), url };
    try {
      if (navigator.share) {
        await navigator.share(data);
        return;
      }
      throw new Error('no-share');
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        toast.success(t('rights.shareCopied'));
      } catch {
        /* clipboard unavailable — ignore */
      }
    }
  };

  return (
    <div className="min-h-dvh bg-background">
      <div className="bg-gradient-leaf grain">
        <header className="max-w-5xl mx-auto px-5 pt-7 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-elegant">
              <Leaf className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-medium tracking-tight">{t('app.name')}</span>
          </Link>
          <LanguageToggle />
        </header>

        <main className="max-w-5xl mx-auto px-5 pt-10 pb-28 sm:pb-16">
          {/* Header */}
          <div className="max-w-2xl">
            <h1 className="font-display text-3xl sm:text-4xl font-medium tracking-tight mb-2">
              {t('rights.title')}
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed">{t('rights.subtitle')}</p>
            <p className="mt-3 text-sm text-primary font-medium">{t('rights.context')}</p>
          </div>

          {/* Controls */}
          <div className="mt-6 mb-8 flex items-center justify-between gap-3">
            <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
              <ArrowLeft className="w-4 h-4 rtl:-scale-x-100" /> {t('common.back')}
            </Link>
            <Button variant="outline" size="sm" onClick={toggleAll} className="rounded-full bg-card/70 backdrop-blur">
              <ChevronsUpDown className="w-4 h-4" />
              {allOpen ? t('rights.collapseAll') : t('rights.expandAll')}
            </Button>
          </div>

          {/* Rights accordion cards, grouped by section */}
          {RIGHTS_SECTIONS.map((section) => {
            const items = RIGHTS.filter((r) => r.section === section);
            return (
              <section key={section} className="mb-10">
                <h2 className="font-display text-xl font-medium mb-4 flex items-center gap-2.5">
                  <span className="w-1.5 h-6 rounded-full bg-primary/70" aria-hidden />
                  {t(SECTION_LABEL_KEYS[section])}
                </h2>
                <Accordion
                  type="multiple"
                  value={open}
                  onValueChange={setOpen}
                  className="grid grid-cols-1 md:grid-cols-2 gap-3.5"
                >
                  {items.map((r) => {
                    const Icon = r.icon;
                    return (
                      <AccordionItem
                        key={r.id}
                        value={String(r.id)}
                        className="rounded-[1.25rem] bg-card border border-border shadow-card overflow-hidden"
                      >
                        <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-primary-soft/40 transition-colors text-start [&>svg]:shrink-0">
                          <span className="flex items-start gap-3.5">
                            <span className="mt-0.5 w-10 h-10 rounded-2xl bg-primary-soft flex items-center justify-center shrink-0">
                              <Icon className="w-5 h-5 text-primary" aria-hidden />
                            </span>
                            <span>
                              <span className="block text-xs font-medium text-primary/80 mb-0.5">
                                {r.id}
                              </span>
                              <span className="block text-base font-semibold leading-snug">
                                {r.title}
                              </span>
                            </span>
                          </span>
                        </AccordionTrigger>
                        <AccordionContent className="px-5 pb-5 ps-[4.25rem] text-base leading-relaxed text-muted-foreground">
                          {r.body}
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </section>
            );
          })}

          {/* Disclaimer footer */}
          <footer className="mt-4 rounded-[1.25rem] border border-border bg-card/70 backdrop-blur p-5">
            <p className="text-sm leading-relaxed text-muted-foreground">{t('rights.disclaimer')}</p>
          </footer>
        </main>
      </div>

      {/* Sticky bottom action bar (mobile) */}
      <div className="fixed bottom-0 inset-x-0 sm:hidden bg-card/90 backdrop-blur border-t border-border px-4 py-3 flex gap-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Button asChild className="flex-1 h-12 rounded-full bg-gradient-primary shadow-elegant text-base">
          <a href={`tel:${SWING_PHONE}`}>
            <Phone className="w-4 h-4" /> {t('rights.call')}
          </a>
        </Button>
        <Button
          variant="outline"
          className="flex-1 h-12 rounded-full text-base"
          onClick={share}
        >
          <Share2 className="w-4 h-4" /> {t('rights.share')}
        </Button>
      </div>
    </div>
  );
}
