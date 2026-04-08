// apps/challenger/components/tab-bar.tsx

'use client';

import { CATEGORY_ORDER } from '@por/dashboard-constants';
import type { DashboardTab } from '@/lib/dashboard-reducer';

const ALL_TABS: DashboardTab[] = ['Overview', ...CATEGORY_ORDER];

function toSlug(tab: DashboardTab): string {
  return tab.toLowerCase().replace(/\s+/g, '-');
}

export function TabBar({
  activeTab,
  onTabClick,
  onTabHover,
}: {
  activeTab: DashboardTab;
  onTabClick: (tab: DashboardTab) => void;
  onTabHover: (tab: DashboardTab) => void;
}) {
  return (
    <nav
      style={{
        display: 'flex',
        borderBottom: '1px solid #e0e0e0',
        gap: '0',
      }}
    >
      {ALL_TABS.map((tab) => {
        const isActive = activeTab === tab;
        return (
          <button
            key={tab}
            type="button"
            onClick={() => onTabClick(tab)}
            onMouseEnter={() => onTabHover(tab)}
            data-testid={`tab-${toSlug(tab)}`}
            style={{
              padding: '0.75rem 1.25rem',
              textDecoration: 'none',
              fontSize: '0.9rem',
              fontWeight: isActive ? '600' : '400',
              color: isActive ? '#2563eb' : '#6b7280',
              marginBottom: '-1px',
              whiteSpace: 'nowrap',
              background: 'none',
              border: 'none',
              borderBottomWidth: '2px',
              borderBottomStyle: 'solid',
              borderBottomColor: isActive ? '#2563eb' : 'transparent',
              cursor: 'pointer',
            }}
          >
            {tab}
          </button>
        );
      })}
    </nav>
  );
}
