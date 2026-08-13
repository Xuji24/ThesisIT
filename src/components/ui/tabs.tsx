'use client';

import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';
import { type ComponentPropsWithoutRef } from 'react';

const Tabs = TabsPrimitive.Root;

function TabsList({ className, ...props }: ComponentPropsWithoutRef<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn('flex overflow-x-auto', className)}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'shrink-0 px-4 py-2 text-sm transition-colors flex items-center gap-2 whitespace-nowrap focus-visible:outline-none',
        'text-ink-muted hover:text-ink-primary',
        'data-[state=active]:text-ink-primary data-[state=active]:font-semibold',
        className
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: ComponentPropsWithoutRef<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      className={cn('flex-1 flex flex-col min-h-0 tab-enter', className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
