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
        variant === 'default' && 'bg-ink-primary text-white',
        variant === 'secondary' && 'bg-surface-sunken text-ink-secondary',
        variant === 'outline' && 'border border-line-hairline text-ink-secondary',
        variant === 'success' && 'bg-status-good/10 text-status-good',
        variant === 'destructive' && 'bg-status-critical/10 text-status-critical',
        className
      )}
      {...props}
    />
  );
}

export { Badge };
