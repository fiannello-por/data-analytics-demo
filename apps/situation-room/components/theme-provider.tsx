'use client';

import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ComponentProps } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';

export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider {...props}>
      <TooltipProvider>
        <NuqsAdapter>{children}</NuqsAdapter>
      </TooltipProvider>
    </NextThemesProvider>
  );
}
