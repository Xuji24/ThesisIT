'use client';

/**
 * Spinner — wraps HeroUI's Spinner with design-system classNames overrides.
 * HeroUI's Tailwind plugin is not required because all visual styles are
 * applied via the classNames prop using our existing Tailwind v4 setup.
 */
import { Spinner as HeroSpinner } from '@heroui/react';
import { cn } from '@/lib/utils';

/**
 * @param {{ className?: string, size?: 'sm' | 'md' | 'lg', label?: string }} props
 */
interface SpinnerProps { className?: string; size?: 'sm' | 'md' | 'lg'; }

function Spinner({ className, size = 'sm' }: SpinnerProps) {
  return (
    <HeroSpinner
      size={size}
      className={cn('text-neutral-900', className)}
    />
  );
}

export { Spinner };
