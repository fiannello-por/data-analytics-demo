import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const appRoot = path.resolve(__dirname, '..');

describe('analytics suite preset configuration', () => {
  it('uses the requested shadcn preset metadata', () => {
    const componentsJson = JSON.parse(
      fs.readFileSync(path.join(appRoot, 'components.json'), 'utf8'),
    );

    expect(componentsJson.style).toBe('base-nova');
    expect(componentsJson.tailwind.baseColor).toBe('zinc');
    expect(componentsJson.iconLibrary).toBe('lucide');
    expect(componentsJson.menuColor).toBe('default');
    expect(componentsJson.menuAccent).toBe('subtle');
  });

  it('defines the preset card and border neutrals with stone chart tokens and small radius', () => {
    const css = fs.readFileSync(path.join(appRoot, 'app/global.css'), 'utf8');

    expect(css).toContain('--foreground: oklch(0.145 0 0);');
    expect(css).toContain('--primary: oklch(0.609 0.126 221.723);');
    expect(css).toContain('--primary: oklch(0.715 0.143 215.221);');
    expect(css).toContain('--card: oklch(0.205 0 0);');
    expect(css).toContain('--background: oklch(0.145 0 0);');
    expect(css).toContain('--border: oklch(1 0 0 / 10%);');
    expect(css).toContain('--chart-1: oklch(0.869 0.005 56.366);');
    expect(css).toContain('--chart-5: oklch(0.268 0.007 34.298);');
    expect(css).toContain('--radius: 0.45rem;');
    expect(css).toContain('--font-heading: var(--font-sans);');
  });

  it('adds only a scoped dashboard accent palette without overriding backgrounds', () => {
    const css = fs.readFileSync(path.join(appRoot, 'app/global.css'), 'utf8');

    expect(css).toContain('.sales-dashboard-accent {');
    expect(css).toContain('--primary: #2c49c8;');
    expect(css).toContain('--dashboard-action: #84b3e8;');
    expect(css).toContain('--chart-1: #69b0f4;');
    expect(css).toContain('--chart-2: #9c63bf;');
    expect(css).toContain('--chart-5: #2a44b8;');
    expect(css).not.toContain('.sales-dashboard-accent {\n  --background:');
    expect(css).not.toContain('.sales-dashboard-theme {');
    expect(css).not.toContain('.dark .sales-dashboard-theme {');
  });

  it('uses small radii and a solid subtle menu implementation in the UI primitives', () => {
    const button = fs.readFileSync(
      path.join(appRoot, 'components/ui/button.tsx'),
      'utf8',
    );
    const card = fs.readFileSync(
      path.join(appRoot, 'components/ui/card.tsx'),
      'utf8',
    );
    const badge = fs.readFileSync(
      path.join(appRoot, 'components/ui/badge.tsx'),
      'utf8',
    );
    const shell = fs.readFileSync(
      path.join(appRoot, 'components/suite-shell.tsx'),
      'utf8',
    );

    expect(button).toContain('rounded-[min(var(--radius-md),12px)]');
    expect(button).not.toContain('radius-3xl');
    expect(button).toContain('border-border bg-background');
    expect(card).toContain('rounded-xl bg-card');
    expect(card).toContain('ring-1 ring-foreground/10');
    expect(badge).toContain('border-border bg-transparent text-foreground');
    expect(shell).toContain('rounded-xl bg-card p-1 ring-1 ring-foreground/10');
    expect(shell).toContain("variant: activeSection === 'platform' ? 'secondary' : 'ghost'");
  });
});
