'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

export function ChapterSeparator({
  item,
}: {
  item: { name: ReactNode; icon?: ReactNode };
}) {
  return <div className="chapter-separator">{item.name}</div>;
}

export function ChapterItem({
  item,
}: {
  item: {
    url: string;
    name: ReactNode;
    icon?: ReactNode;
    external?: boolean;
  };
}) {
  const pathname = usePathname();
  const active =
    pathname === item.url || (item.url === '/' && pathname === '/');

  return (
    <Link
      href={item.url}
      className={`chapter-item${active ? ' chapter-active' : ''}`}
    >
      <span className="chapter-number" aria-hidden="true" />
      <span>{item.name}</span>
    </Link>
  );
}
