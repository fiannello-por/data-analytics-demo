'use client';

// apps/challenger/components/filter-bar-client.tsx
//
// Client-side filter bar backed by the dashboard reducer's draft state.
// Each filter key renders a dropdown that dispatches SET_DRAFT_FILTERS.
// Global Apply / Cancel buttons commit or discard pending changes.

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  GLOBAL_FILTER_KEYS,
  type GlobalFilterKey,
  type DashboardFilters,
  type DateRange,
} from '@por/dashboard-constants';

import { useFilterDictionaries } from '@/lib/query-hooks';
import type { DashboardAction } from '@/lib/dashboard-reducer';

// ─── Props ──────────────────────────────────────────────────────────────────

export type FilterBarClientProps = {
  draftFilters: DashboardFilters;
  draftDateRange: DateRange;
  committedFilters: DashboardFilters;
  committedDateRange: DateRange;
  hasPendingChanges: boolean;
  dispatch: React.Dispatch<DashboardAction>;
};

// ─── Single filter dropdown ─────────────────────────────────────────────────

type FilterDropdownItemProps = {
  filterKey: GlobalFilterKey;
  options: string[];
  selected: string[];
  onChangeValues: (key: GlobalFilterKey, values: string[]) => void;
};

function FilterDropdownItem({
  filterKey,
  options,
  selected,
  onChangeValues,
}: FilterDropdownItemProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  const count = selected.length;
  const label = count > 0 ? `${filterKey} (${count})` : filterKey;

  function toggleOption(value: string) {
    const current = new Set(selected);
    if (current.has(value)) {
      current.delete(value);
    } else {
      current.add(value);
    }
    onChangeValues(filterKey, [...current]);
  }

  function handleClearAll() {
    onChangeValues(filterKey, []);
  }

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', display: 'inline-block' }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        style={{
          padding: '0.25rem 0.75rem',
          background: count > 0 ? '#2563eb' : '#f0f0f0',
          color: count > 0 ? '#fff' : '#111',
          border: '1px solid #ccc',
          borderRadius: '4px',
          fontSize: '0.8rem',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={`${filterKey} filter options`}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            zIndex: 100,
            minWidth: 220,
            maxHeight: 300,
            overflowY: 'auto',
            background: '#fff',
            border: '1px solid #ccc',
            borderRadius: '4px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
            padding: '0.5rem 0',
            marginTop: 4,
          }}
        >
          {options.length === 0 ? (
            <div
              style={{
                padding: '0.5rem 0.75rem',
                fontSize: '0.8rem',
                color: '#666',
              }}
            >
              No options available
            </div>
          ) : (
            options.map((option) => (
              <label
                key={option}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.25rem 0.75rem',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(option)}
                  onChange={() => toggleOption(option)}
                />
                <span style={{ flex: 1 }}>{option}</span>
              </label>
            ))
          )}

          {/* Clear all for this key */}
          {count > 0 && (
            <div
              style={{
                padding: '0.5rem 0.75rem',
                borderTop: '1px solid #eee',
                marginTop: '0.25rem',
              }}
            >
              <button
                onClick={handleClearAll}
                style={{
                  padding: '0.25rem 0.5rem',
                  background: '#f0f0f0',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                Clear
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Skeleton buttons ───────────────────────────────────────────────────────

function FilterBarSkeleton() {
  return (
    <div
      data-testid="filter-bar-skeleton"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.5rem',
        padding: '0.75rem 0',
      }}
    >
      {GLOBAL_FILTER_KEYS.map((key) => (
        <button
          key={key}
          disabled
          style={{
            padding: '0.25rem 0.75rem',
            background: '#e5e5e5',
            color: '#999',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '0.8rem',
            cursor: 'default',
            whiteSpace: 'nowrap',
          }}
        >
          {key}
        </button>
      ))}
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export function FilterBarClient({
  draftFilters,
  draftDateRange,
  committedDateRange,
  hasPendingChanges,
  dispatch,
}: FilterBarClientProps) {
  const { data, isPending } = useFilterDictionaries();

  const handleChangeValues = useCallback(
    (key: GlobalFilterKey, values: string[]) => {
      const next: DashboardFilters = { ...draftFilters };
      if (values.length > 0) {
        next[key] = values;
      } else {
        delete next[key];
      }
      dispatch({ type: 'SET_DRAFT_FILTERS', filters: next });
    },
    [draftFilters, dispatch],
  );

  function handleApply() {
    dispatch({ type: 'APPLY_FILTERS' });
  }

  function handleCancel() {
    dispatch({ type: 'DISCARD_DRAFTS' });
  }

  // Build dictionary lookup for fast option resolution
  const dictMap = new Map<string, string[]>();
  if (data) {
    for (const dict of data.dictionaries) {
      dictMap.set(dict.key, dict.options);
    }
  }

  const dateLabel = `${committedDateRange.startDate} - ${committedDateRange.endDate}`;

  return (
    <div data-testid="filter-bar" style={{ padding: '0.5rem 0' }}>
      {/* Date range display */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '0.5rem',
        }}
      >
        <span
          style={{
            fontSize: '0.8rem',
            color: '#555',
            background: '#f5f5f5',
            padding: '0.25rem 0.75rem',
            borderRadius: '4px',
            border: '1px solid #ddd',
          }}
        >
          {dateLabel}
        </span>

        {/* Pending changes indicator + Apply / Cancel */}
        {hasPendingChanges && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span
              style={{
                display: 'inline-block',
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#f97316',
              }}
              title="Pending filter changes"
            />
            <span style={{ fontSize: '0.75rem', color: '#f97316' }}>
              Pending changes
            </span>

            <button
              onClick={handleApply}
              style={{
                padding: '0.25rem 0.75rem',
                background: '#2563eb',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              Apply
            </button>
            <button
              onClick={handleCancel}
              style={{
                padding: '0.25rem 0.75rem',
                background: '#e5e5e5',
                color: '#333',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Filter dropdowns */}
      {isPending ? (
        <FilterBarSkeleton />
      ) : (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}
        >
          {GLOBAL_FILTER_KEYS.map((key) => (
            <FilterDropdownItem
              key={key}
              filterKey={key}
              options={dictMap.get(key) ?? []}
              selected={draftFilters[key] ?? []}
              onChangeValues={handleChangeValues}
            />
          ))}
        </div>
      )}
    </div>
  );
}
