import hero from '@/assets/illus/hero.webp';
import call from '@/assets/illus/call.webp';
import care from '@/assets/illus/care.webp';
import group from '@/assets/illus/group.webp';
import lawyer from '@/assets/illus/lawyer.webp';
import mic from '@/assets/illus/mic.webp';
import speak from '@/assets/illus/speak.webp';
import { cn } from '@/lib/utils';

/** SWING RIGHTS cartoon illustrations (transparent WebP) with their intrinsic size. */
const ILLUS = {
  hero: { src: hero, w: 630, h: 800 },
  call: { src: call, w: 800, h: 743 },
  care: { src: care, w: 759, h: 800 },
  group: { src: group, w: 800, h: 549 },
  lawyer: { src: lawyer, w: 800, h: 763 },
  mic: { src: mic, w: 800, h: 761 },
  speak: { src: speak, w: 800, h: 759 },
} as const;

export type IllusName = keyof typeof ILLUS;

interface IllusProps {
  name: IllusName;
  /** Size it with a width class (e.g. "w-24"); height follows the aspect ratio. */
  className?: string;
  /** Load right away. Only for an illustration that is visible on first paint (landing hero). */
  eager?: boolean;
}

/**
 * Decorative illustration. Always alt="" and hidden from screen readers, lazy below the fold,
 * width/height set so the page does not jump while it loads.
 */
export function Illus({ name, className, eager = false }: IllusProps) {
  const { src, w, h } = ILLUS[name];
  return (
    <img
      src={src}
      width={w}
      height={h}
      alt=""
      aria-hidden="true"
      draggable={false}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      className={cn('pointer-events-none h-auto max-w-full select-none object-contain', className)}
    />
  );
}
