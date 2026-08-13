'use client';

/**
 * CustomSelect — Radix UI-based dropdown.
 * Per copilot-instructions: NEVER use native <select>. Always use this component.
 */
import * as SelectPrimitive from '@radix-ui/react-select';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function CustomSelect({
  value,
  onValueChange,
  options,
  placeholder = 'Select...',
  disabled = false,
  className,
}: CustomSelectProps) {
  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectPrimitive.Trigger
        className={cn(
          'flex w-full items-center justify-between rounded-md border border-line-hairline bg-surface-card px-4 py-2.5 text-sm text-ink-primary',
          'placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent/15 focus:border-accent',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="h-4 w-4 text-ink-muted shrink-0" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          className="z-50 min-w-[8rem] overflow-hidden rounded-md border border-line-hairline bg-surface-card shadow-overlay animate-in fade-in-0 zoom-in-95"
          position="popper"
          sideOffset={4}
        >
          <SelectPrimitive.Viewport className="p-1">
            {options.map((opt) => (
              <SelectPrimitive.Item
                key={opt.value}
                value={opt.value}
                className={cn(
                  'relative flex w-full cursor-default select-none items-center rounded-[calc(var(--radius-md)-2px)] py-2 pl-8 pr-3 text-sm text-ink-primary',
                  'outline-none focus:bg-surface-sunken data-[disabled]:pointer-events-none data-[disabled]:opacity-50'
                )}
              >
                <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                  <SelectPrimitive.ItemIndicator>
                    <Check className="h-4 w-4" />
                  </SelectPrimitive.ItemIndicator>
                </span>
                <SelectPrimitive.ItemText>{opt.label}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
