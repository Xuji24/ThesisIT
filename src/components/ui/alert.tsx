import { cn } from '@/lib/utils';
import { type HTMLAttributes } from 'react';

interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive' | 'warning' | 'success';
}

function Alert({ className, variant = 'default', ...props }: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        'relative w-full rounded-md border p-4 text-sm',
        variant === 'default' && 'border-line-hairline bg-surface-card text-ink-secondary',
        variant === 'destructive' && 'border-status-critical/25 bg-status-critical/10 text-status-critical',
        variant === 'warning' && 'border-status-warning/35 bg-status-warning/10 text-[#8a5a00]',
        variant === 'success' && 'border-status-good/25 bg-status-good/10 text-status-good',
        className
      )}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h5
      className={cn('mb-1 font-semibold leading-none tracking-tight', className)}
      {...props}
    />
  );
}

function AlertDescription({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('text-sm leading-relaxed', className)} {...props} />
  );
}

export { Alert, AlertTitle, AlertDescription };
