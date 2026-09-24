import { forwardRef } from 'react';
import { Languages, Check } from 'lucide-react';
import { useI18n, LANGS } from '@/i18n';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

/** 5-language switcher (ไทย / EN / မြန်မာ / ខ្មែរ / ລາວ). */
export const LanguageToggle = forwardRef<HTMLButtonElement, { className?: string }>(function LanguageToggle({ className }, ref) {
  const { lang, setLang } = useI18n();
  const current = LANGS.find((l) => l.id === lang);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          ref={ref}
          type="button"
          aria-label="Language / ภาษา"
          className={cn(
            'inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-primary-soft hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            className,
          )}
        >
          <Languages className="w-3.5 h-3.5" aria-hidden />
          {current?.short ?? lang.toUpperCase()}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-40 p-1.5 z-[1200]" align="end">
        <div role="group" aria-label="Language / ภาษา" className="grid gap-0.5">
          {LANGS.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setLang(l.id)}
              aria-pressed={lang === l.id}
              className={cn(
                'flex min-h-10 items-center justify-between rounded-lg px-3 py-2 text-xs transition-colors text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                lang === l.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-foreground',
              )}
            >
              {l.label}
              {lang === l.id && <Check className="w-3.5 h-3.5" />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
});
