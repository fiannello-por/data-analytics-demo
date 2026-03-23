'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import { MoonStarIcon, SunIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted ? resolvedTheme !== 'light' : true;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      aria-label="Toggle color theme"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="gap-1.5"
    >
      {isDark ? <SunIcon data-icon="inline-start" /> : <MoonStarIcon data-icon="inline-start" />}
      <span>{isDark ? 'Light' : 'Dark'}</span>
    </Button>
  );
}
