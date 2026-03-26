import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Situation Room',
  description:
    'Homepage placeholder for the Situation Room analytics proof of concept.',
};

export default function HomePage() {
  return (
    <main
      aria-label="Situation Room home"
      className="min-h-screen bg-background"
    />
  );
}
