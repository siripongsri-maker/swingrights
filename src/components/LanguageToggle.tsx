import { forwardRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Languages, Check } from 'lucide-react';
import { useI18n, LANGS } from '@/i18n';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

/** 5-language switcher (ไทย / EN / မြန်မာ / ខ្មែរ / ລາວ). */
export const LanguageToggle = forwardRef<HTMLButtonElement, { className?: string }>(function LanguageToggle({ className }, ref) {
  const { lang, setLang, t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const current = LANGS.find((l) => l.id === lang);
  const shortLabel = current?.short ?? lang.toUpperCase();
  // Name in the current language plus English, so anyone can find the switcher
  const groupLabel = lang === 'en' ? 'Language' : `${t('ui.language')} / Language`;
  const chooseLanguage = (next: typeof lang) => {
    setLang(next);
    if (/^\/report(?:\/(?:en|my|km|lo))?\/?$/.test(location.pathname)) {
      navigate(next === 'th' ? '/report' : `/report/${next}`, { replace: true });
    }
  };
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          ref={ref}
          type="button"
          aria-label={`${shortLabel}, ${groupLabel}`}
          className={cn(
            'inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors duration-150 ease-out hover:bg-primary-soft hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            className,
          )}
        >
          <Languages className="w-3.5 h-3.5" aria-hidden />
          {shortLabel}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-44 p-1.5 z-[1200]" align="end">
        <div role="group" aria-label={groupLabel} className="grid gap-2">
          {LANGS.map((l) => (
            <button
              key={l.id}
              type="button"
              lang={l.id}
              onClick={() => chooseLanguage(l.id)}
              aria-pressed={lang === l.id}
              className={cn(
                'flex min-h-11 items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition-colors duration-150 ease-out text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                lang === l.id ? 'bg-primary text-primary-foreground font-semibold' : 'hover:bg-muted text-foreground',
              )}
            >
              {l.label}
              {lang === l.id && <Check className="w-4 h-4 shrink-0" aria-hidden />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
});
