// apps/challenger/components/tab-bar.tsx

import { CATEGORY_ORDER } from '@por/dashboard-constants';
import { buildTabUrl, type DashboardTab, type DashboardUrlState } from '@/lib/url-state';

const ALL_TABS: DashboardTab[] = ['Overview', ...CATEGORY_ORDER];

function toSlug(tab: DashboardTab): string {
  return tab.toLowerCase().replace(/\s+/g, '-');
}

export function TabBar({ state }: { state: DashboardUrlState }) {
  return (
    <nav
      style={{
        display: 'flex',
        borderBottom: '1px solid #e0e0e0',
        gap: '0',
      }}
    >
      {ALL_TABS.map((tab) => {
        const isActive = state.tab === tab;
        return (
          <a
            key={tab}
            href={buildTabUrl(tab, state)}
            data-testid={`tab-${toSlug(tab)}`}
            style={{
              padding: '0.75rem 1.25rem',
              textDecoration: 'none',
              fontSize: '0.9rem',
              fontWeight: isActive ? '600' : '400',
              color: isActive ? '#2563eb' : '#6b7280',
              borderBottom: isActive ? '2px solid #2563eb' : '2px solid transparent',
              marginBottom: '-1px',
              whiteSpace: 'nowrap',
            }}
          >
            {tab}
          </a>
        );
      })}
    </nav>
  );
}
