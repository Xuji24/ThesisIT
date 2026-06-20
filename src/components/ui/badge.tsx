import { cn } from '@/lib/utils';
import { type HTMLAttributes } from 'react';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'success' | 'destructive';
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
        variant === 'default' && 'bg-neutral-900 text-white',
        variant === 'secondary' && 'bg-neutral-100 text-neutral-700',
        variant === 'outline' && 'border border-neutral-200 text-neutral-600',
        variant === 'success' && 'bg-emerald-100 text-emerald-700',
        variant === 'destructive' && 'bg-red-100 text-red-700',
        className
      )}
      {...props}
    />
  );
}

export { Badge };
