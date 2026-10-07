import { useMemo, type CSSProperties } from 'react';
import { cn } from '@/lib/utils';

interface SoftWaveProps {
  /** Number of 3px bars. About 56 for the 44px phone band, about 170 for the 64px desktop band. */
  bars?: number;
  /** Size and placement of the band, e.g. "h-11 px-4 sm:hidden" or "hidden sm:flex h-16". */
  className?: string;
}

type Bar = { h: number; mix: number; delay: number };

/** Smooth sum of sines inside an envelope that tapers to nothing at both ends. */
function buildBars(count: number): Bar[] {
  const n = Math.max(1, Math.round(count));
  return Array.from({ length: n }, (_, i) => {
    const t = (i + 0.5) / n;
    const env = Math.pow(Math.sin(Math.PI * t), 1.4);
    const s = 0.5 + 0.5 * (
      0.6 * Math.sin(2 * Math.PI * 2.3 * t + 0.6)
      + 0.3 * Math.sin(2 * Math.PI * 5.1 * t + 1.9)
      + 0.1 * Math.sin(2 * Math.PI * 9.7 * t + 0.3)
    );
    return {
      h: Math.max(0.05, env * (0.35 + 0.65 * s)),
      mix: Math.pow(Math.sin(Math.PI * t), 1.2),
      delay: -t * 1.6,
    };
  });
}

/**
 * Soft sound-wave band (brand motif). Decorative only: grey at the ends, warming to soft pink in
 * the middle, mirrored around the centre line. It breathes gently for about 8 seconds and then
 * rests; it never moves when the person has asked for reduced motion. Place it in the layout
 * (never fixed, never behind text).
 */
export function SoftWave({ bars = 56, className }: SoftWaveProps) {
  const items = useMemo(() => buildBars(bars), [bars]);
  return (
    <div
      aria-hidden="true"
      className={cn('sw-soft-wave pointer-events-none flex select-none items-center justify-between', className)}
    >
      {items.map((b, i) => (
        <span
          key={i}
          className="sw-soft-wave-bar"
          style={{ height: `${(b.h * 100).toFixed(1)}%`, animationDelay: `${b.delay.toFixed(2)}s`, '--mix': b.mix.toFixed(3) } as CSSProperties}
        />
      ))}
    </div>
  );
}
