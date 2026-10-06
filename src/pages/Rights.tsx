import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronsUpDown, Phone, Share2, Camera, Languages } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { SWING_BRANCHES } from '@/data/hotlines';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { LanguageToggle } from '@/components/LanguageToggle';
import { QuickExitSlot } from '@/components/screening/QuickExit';
import { useI18n } from '@/i18n';
import { RIGHTS, RIGHTS_SECTIONS, type RightsSectionId } from '@/data/rights';
import { toast } from 'sonner';
import { BrandHeader } from '@/components/BrandLogo';
import { Illus } from '@/components/Illus';

const SECTION_LABEL_KEYS: Record<RightsSectionId, string> = {
  arrest: 'rights.section.arrest',
  investigation: 'rights.section.investigation',
  detention: 'rights.section.detention',
};

export default function Rights() {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState<string[]>([]);
  const [callOpen, setCallOpen] = useState(false);
  const allOpen = open.length === RIGHTS.length;
  // Jump to /rights#arrest (and old #section-arrest) links from the landing page
  useEffect(() => {
    const id = window.location.hash.slice(1).replace(/^section-/, '');
    if (id) window.setTimeout(() => document.getElementById(id)?.scrollIntoView(), 50);
  }, []);

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
    } catch (e) {
      // The person closed the share sheet on purpose: copy nothing, say nothing
      if ((e as DOMException)?.name === 'AbortError') return;
      try {
        await navigator.clipboard.writeText(url);
        toast.success(t('rights.shareCopied'));
      } catch {
        // Clipboard blocked too: tell them how to copy the link by hand
        toast(t('rights.shareManual'));
      }
    }
  };

  return (
    <div className="min-h-dvh bg-background">
      <div className="bg-background">
        {/* Phones: the header (and the Quick Exit slot in it) stays on screen while scrolling,
            so Quick Exit never has to float over the sticky section titles. 68px tall. */}
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur max-w-5xl mx-auto px-5 py-3 flex items-center justify-between gap-3 sm:static sm:bg-transparent sm:backdrop-blur-none sm:pt-7 sm:pb-0">
          <Link to="/" aria-label="SWING RIGHTS" className="inline-flex min-h-11 items-center"><BrandHeader className="max-sm:[&>span]:hidden" /></Link>
          <div className="flex items-center gap-2"><QuickExitSlot /><LanguageToggle /></div>
        </header>

        <main className="max-w-5xl mx-auto px-5 pt-6 sm:pt-10 sw-pad-action-bar">
          {/* Header */}
          <div className="flex items-center gap-4">
            <div className="min-w-0 flex-1 max-w-2xl">
              <h1 className="font-display text-[28px] leading-[1.3] sm:text-[44px] sm:leading-[1.2] font-medium mb-2">
                {t('rights.title')}
              </h1>
              <p className="text-base text-muted-foreground leading-relaxed">{t('rights.subtitle')}</p>
              <p className="mt-3 text-sm text-primary font-medium">{t('rights.context')}</p>
            </div>
            <Illus name="lawyer" eager className="w-[88px] shrink-0 sm:w-32" />
          </div>

          {/* The 15 rights only exist in Thai (src/data/rights.ts); say so in the other languages */}
          {lang !== 'th' && (
            <div className="mt-5 max-w-2xl rounded-2xl border border-border bg-accent-soft p-4">
              <p className="flex items-start gap-2.5 text-sm leading-relaxed text-foreground">
                <Languages className="mt-1 h-4 w-4 shrink-0" aria-hidden />
                {t('rights.thaiOnly')}
              </p>
              <Button variant="outline" size="sm" className="mt-3 rounded-full bg-card" onClick={() => setCallOpen(true)}>
                <Phone aria-hidden /> {t('rights.call')}
              </Button>
            </div>
          )}

          {/* Jump chips */}
          <nav aria-label={t('rights.jump')} className="mt-5 -mx-5 px-5 flex gap-2 overflow-x-auto pb-1 print:hidden">
            {RIGHTS_SECTIONS.map((sec) => (
              <a key={sec} href={`#${sec}`}
                onClick={(e) => { e.preventDefault(); document.getElementById(sec)?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); history.replaceState(null, '', `#${sec}`); }}
                className="shrink-0 inline-flex min-h-11 items-center rounded-full border border-border bg-card px-4 text-sm font-medium hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {t(SECTION_LABEL_KEYS[sec])}
              </a>
            ))}
          </nav>

          {/* Controls */}
          <div className="mt-6 mb-8 flex items-center justify-between gap-3 print:hidden">
            <Link to="/" className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
              <ArrowLeft className="w-4 h-4 rtl:-scale-x-100" aria-hidden /> {t('common.back')}
            </Link>
            <Button variant="outline" onClick={toggleAll} aria-pressed={allOpen} className="min-h-11 rounded-full bg-card/70 backdrop-blur">
              <ChevronsUpDown className="w-4 h-4" aria-hidden />
              {allOpen ? t('rights.collapseAll') : t('rights.expandAll')}
            </Button>
          </div>

          {/* Rights accordion cards, grouped by section (screen only; print uses the list below) */}
          {RIGHTS_SECTIONS.map((section) => {
            const items = RIGHTS.filter((r) => r.section === section);
            return (
              <section key={section} id={section} className="mb-10 scroll-mt-[76px] sm:scroll-mt-2 print:hidden">
                {/* Phones: sticks under the 68px sticky header. sw-qe-clear makes room if Quick Exit ever floats. */}
                <h2 className="sw-qe-clear sticky top-[68px] sm:top-0 z-10 -mx-5 px-5 py-3 mb-3 bg-background/95 backdrop-blur font-subhead text-xl font-medium flex items-center gap-2.5">
                  <span className="w-1.5 h-6 rounded-full bg-primary/70" aria-hidden />
                  {t(SECTION_LABEL_KEYS[section])}
                  <span className="ms-auto shrink-0 whitespace-nowrap rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-semibold text-primary">{t('rights.count', { n: items.length })}</span>
                </h2>
                <Accordion
                  type="multiple"
                  value={open}
                  onValueChange={setOpen}
                  className="grid grid-cols-1 md:grid-cols-2 gap-3.5 items-start"
                >
                  {items.map((r) => {
                    const Icon = r.icon;
                    return (
                      <AccordionItem
                        key={r.id}
                        value={String(r.id)}
                        className="rounded-[20px] bg-card border border-border shadow-card overflow-hidden"
                      >
                        <AccordionTrigger className="min-h-16 w-full gap-3 px-4 py-3 hover:no-underline hover:bg-primary-soft/40 transition-colors text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring [&>svg]:h-5 [&>svg]:w-5 [&>svg]:shrink-0">
                          <span className="flex items-center gap-3">
                            <span className="w-8 h-8 rounded-full bg-primary-soft text-primary font-mono text-sm font-semibold flex items-center justify-center shrink-0" aria-hidden>
                              {r.id}
                            </span>
                            <Icon className="w-5 h-5 text-primary shrink-0" aria-hidden />
                            <span lang="th" className="text-[17px] font-semibold leading-snug">{r.title}</span>
                          </span>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-5 ps-[3.75rem] text-base leading-[1.75] text-foreground/85">
                          <p lang="th" className="max-w-[65ch]">{r.body}</p>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </section>
            );
          })}

          {/* Print / Save as PDF: every right written out in full, plus the SWING numbers.
              Reads src/data/rights.ts only, so the rights text stays exactly as it is. */}
          <div className="hidden print:block">
            {RIGHTS_SECTIONS.map((section) => (
              <div key={section} className="mb-6">
                <h2 className="mb-2 font-subhead text-lg font-semibold">{t(SECTION_LABEL_KEYS[section])}</h2>
                {RIGHTS.filter((r) => r.section === section).map((r) => (
                  <div key={r.id} lang="th" className="mb-3 break-inside-avoid">
                    <h3 className="text-base font-semibold">{r.id}. {r.title}</h3>
                    <p className="text-sm leading-relaxed">{r.body}</p>
                  </div>
                ))}
              </div>
            ))}
            <div className="mb-6 break-inside-avoid">
              <h2 className="mb-2 font-subhead text-lg font-semibold">{t('rights.branches')}</h2>
              <ul className="space-y-1 text-sm">
                {SWING_BRANCHES.map((b) => (
                  <li key={b.tel}><span className="font-semibold">{t(b.labelKey)}</span> <span className="font-mono" dir="ltr">{b.display}</span></li>
                ))}
              </ul>
            </div>
          </div>

          {/* Save for offline */}
          <div className="mb-4 flex items-start gap-3 rounded-[20px] border border-border bg-card p-5 shadow-card print:hidden">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent"><Camera className="h-5 w-5" aria-hidden /></span>
            <div>
              <p className="font-subhead text-base font-semibold">{t('rights.saveTitle')}</p>
              <p className="text-sm leading-relaxed text-muted-foreground">{t('rights.saveBody')}</p>
            </div>
          </div>

          {/* Disclaimer footer */}
          <footer className="mt-4 rounded-[20px] border border-border bg-card/70 backdrop-blur p-5">
            <p className="text-sm leading-relaxed text-muted-foreground">{t('rights.disclaimer')}</p>
          </footer>
        </main>
      </div>

      {/* Sticky bottom action bar */}
      <div className="sw-action-bar fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur border-t border-border print:hidden">
        <div className="max-w-5xl mx-auto grid grid-cols-2 gap-3 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {/* Labels may wrap to two lines (Burmese/Khmer are longer) instead of being cut off */}
          <Button variant="action" className="h-auto min-h-[52px] whitespace-normal px-3 py-1.5 text-center text-base leading-snug" onClick={() => setCallOpen(true)}>
            <Phone className="w-5 h-5" aria-hidden /> {t('rights.call')}
          </Button>
          <Button variant="outline" className="h-auto min-h-[52px] whitespace-normal rounded-full px-3 py-1.5 text-center text-base leading-snug" onClick={share}>
            <Share2 className="w-5 h-5" aria-hidden /> {t('rights.share')}
          </Button>
        </div>
      </div>

      {/* Quick Exit and the 44px close button sit in the sheet's built-in top row */}
      <Sheet open={callOpen} onOpenChange={setCallOpen}>
        <SheetContent side="bottom" aria-describedby={undefined} className="rounded-t-[1.5rem] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <SheetHeader className="text-start">
            <SheetTitle className="font-subhead">{t('rights.branches')}</SheetTitle>
          </SheetHeader>
          <ul className="mt-4 max-w-md space-y-2">
            {SWING_BRANCHES.map((b) => (
              <li key={b.tel}>
                <a href={`tel:${b.tel}`} className="flex min-h-14 items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <span className="font-semibold">{t(b.labelKey)}</span>
                  <span className="inline-flex items-center gap-2 font-mono text-base text-accent" dir="ltr"><Phone className="h-4 w-4" aria-hidden />{b.display}</span>
                </a>
              </li>
            ))}
          </ul>
        </SheetContent>
      </Sheet>
    </div>
  );
}
