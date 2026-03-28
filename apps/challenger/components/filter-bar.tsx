// apps/challenger/components/filter-bar.tsx

import { loadFilterDictionaries } from '@/lib/dictionary-loader';
import type { ProbeCacheMode } from '@/lib/cache-mode';

export async function FilterBar({
  cacheMode,
}: {
  cacheMode: ProbeCacheMode;
}) {
  const dictionaries = await loadFilterDictionaries(cacheMode);

  return (
    <div id="filter-bar" data-loaded="true">
      <h2>Filters</h2>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {dictionaries.map((dict) => (
          <span
            key={dict.key}
            style={{
              padding: '0.25rem 0.5rem',
              background: '#f0f0f0',
              borderRadius: '4px',
              fontSize: '0.8rem',
            }}
          >
            {dict.key} ({dict.options.length})
          </span>
        ))}
      </div>
    </div>
  );
}