import { Languages } from 'lucide-react';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

/** Thai / English switcher. */
export function LanguageToggle({ className }: { className?: string }) {
  const { lang, setLang } = useI18n();
  return (
    <div
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full border border-border bg-card/70 backdrop-blur p-0.5',
        className,
      )}
      role="group"
      aria-label="Language / ภาษา"
    >
      <Languages className="w-3 h-3 mx-1.5 text-muted-foreground" aria-hidden />
      {(['th', 'en'] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={cn(
            'text-[11px] font-medium px-2.5 py-1 rounded-full transition-colors',
            lang === l ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-primary',
          )}
        >
          {l === 'th' ? 'ไทย' : 'EN'}
        </button>
      ))}
    </div>
  );
}
