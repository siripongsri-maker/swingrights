import { Languages, Check } from 'lucide-react';
import { useI18n, LANGS } from '@/i18n';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

/** 5-language switcher (ไทย / EN / မြန်မာ / ខ្មែរ / ລາວ). */
export function LanguageToggle({ className }: { className?: string }) {
  const { lang, setLang } = useI18n();
  const current = LANGS.find((l) => l.id === lang);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Language / ภาษา"
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border border-border bg-card/70 backdrop-blur px-3 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-primary transition-colors',
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
                'flex items-center justify-between rounded-lg px-3 py-2 text-xs transition-colors text-start',
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
}
