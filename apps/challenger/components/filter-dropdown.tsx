'use client';

// apps/challenger/components/filter-dropdown.tsx
// Interactive dropdown for a single filter key. Client component.

import { useState, useRef, useEffect } from 'react';

export interface FilterDropdownProps {
  filterKey: string;
  options: string[];
  selected: string[];
  buildApplyUrl: (key: string, values: string[]) => string;
}

export function FilterDropdown({
  filterKey,
  options,
  selected,
  buildApplyUrl,
}: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set(selected));
  const containerRef = useRef<HTMLDivElement>(null);

  // Re-sync local checked state when the `selected` prop changes (URL navigation)
  useEffect(() => {
    setChecked(new Set(selected));
  }, [selected]);

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

  const selectedCount = selected.length;
  const label =
    selectedCount > 0 ? `${filterKey} (${selectedCount})` : filterKey;

  const hasChanges =
    checked.size !== selected.length ||
    [...checked].some((v) => !selected.includes(v));

  function toggleOption(value: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      return next;
    });
  }

  function handleClear() {
    setChecked(new Set());
  }

  const applyUrl = buildApplyUrl(filterKey, [...checked]);

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', display: 'inline-block' }}
    >
      {/* Toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        style={{
          padding: '0.25rem 0.75rem',
          background: selectedCount > 0 ? '#2563eb' : '#f0f0f0',
          color: selectedCount > 0 ? '#fff' : '#111',
          border: '1px solid #ccc',
          borderRadius: '4px',
          fontSize: '0.8rem',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </button>

      {/* Dropdown popover */}
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
          {/* Option checkboxes */}
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
                  checked={checked.has(option)}
                  onChange={() => toggleOption(option)}
                />
                <span style={{ flex: 1 }}>{option}</span>
              </label>
            ))
          )}

          {/* Actions */}
          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              padding: '0.5rem 0.75rem',
              borderTop: '1px solid #eee',
              marginTop: '0.25rem',
            }}
          >
            {/* Apply navigates to new URL */}
            <a
              href={applyUrl}
              onClick={() => setOpen(false)}
              aria-disabled={!hasChanges}
              style={{
                flex: 1,
                textAlign: 'center',
                padding: '0.25rem 0.5rem',
                background: hasChanges ? '#2563eb' : '#b0c4f8',
                color: '#fff',
                borderRadius: '4px',
                fontSize: '0.8rem',
                textDecoration: 'none',
                pointerEvents: hasChanges ? 'auto' : 'none',
                cursor: hasChanges ? 'pointer' : 'default',
              }}
            >
              Apply
            </a>
            {/* Clear unchecks all */}
            <button
              onClick={handleClear}
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
        </div>
      )}
    </div>
  );
}
