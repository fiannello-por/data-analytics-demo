// apps/challenger/app/layout.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Challenger — Sales Performance',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: '2rem' }}>
        {children}
      </body>
    </html>
  );
}