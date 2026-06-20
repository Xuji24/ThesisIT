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
        'relative w-full rounded-xl border p-4 text-sm',
        variant === 'default' && 'border-neutral-200 bg-white text-neutral-800',
        variant === 'destructive' && 'border-red-200 bg-red-50 text-red-700',
        variant === 'warning' && 'border-amber-200 bg-amber-50 text-amber-800',
        variant === 'success' && 'border-emerald-200 bg-emerald-50 text-emerald-700',
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
