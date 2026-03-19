import type { Metadata } from "next";
import "./global.css";

export const metadata: Metadata = {
  title: "Situation Room — Sales Performance Report",
  description: "Board-facing sales performance scorecard report",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
