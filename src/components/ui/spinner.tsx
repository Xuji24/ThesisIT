'use client';

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SpinnerProps { className?: string; size?: 'sm' | 'md' | 'lg'; }

const SIZE_CLASSES: Record<NonNullable<SpinnerProps['size']>, string> = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
};

function Spinner({ className, size = 'sm' }: SpinnerProps) {
  return (
    <Loader2
      className={cn('animate-spin text-ink-primary', SIZE_CLASSES[size], className)}
      aria-hidden
    />
  );
}

export { Spinner };
