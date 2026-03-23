import * as React from 'react';
import type { Metadata } from 'next';
import { Providers } from '@/components/providers';
import './global.css';

export const metadata: Metadata = {
  title: 'Sales Performance Dashboard Architecture Explainer',
  description: 'Interactive architecture explorer for the Sales Performance Dashboard',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      style={
        {
          '--font-geist-sans':
            'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          '--font-geist-mono':
            'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
        } as React.CSSProperties
      }
    >
      <body>
        <Providers attribute="class" defaultTheme="dark" enableSystem={false}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
