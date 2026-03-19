'use client';

import { useState, useEffect, useMemo } from 'react';
import { ChevronDown, Check, Loader2 } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { FilterDefinition } from '@/lib/filters';

interface FilterDropdownProps {
  definition: FilterDefinition;
  values: string[];
  onSetValues: (values: string[]) => void;
}

const BOOLEAN_OPTIONS = [
  { value: 'true', label: 'Yes' },
  { value: 'false', label: 'No' },
];

export function FilterDropdown({
  definition,
  values,
  onSetValues,
}: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [options, setOptions] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<string[]>(values);

  const hasValues = values.length > 0;
  const isBool = definition.type === 'boolean';

  useEffect(() => {
    if (open) setDraft(values);
  }, [open, values]);

  useEffect(() => {
    if (!open || isBool || options !== null) return;

    setLoading(true);
    fetch(`/api/filter-options?key=${definition.key}`)
      .then((res) => res.json())
      .then((data) => setOptions(data.options ?? []))
      .catch(() => setOptions([]))
      .finally(() => setLoading(false));
  }, [open, isBool, options, definition.key]);

  useEffect(() => {
    if (!open) setSearch('');
  }, [open]);

  const filtered = useMemo(() => {
    if (!options) return [];
    if (!search) return options;
    const q = search.toLowerCase();
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, search]);

  const draftChanged = useMemo(() => {
    if (draft.length !== values.length) return true;
    const sorted = [...draft].sort();
    const committed = [...values].sort();
    return sorted.some((v, i) => v !== committed[i]);
  }, [draft, values]);

  function toggleDraft(val: string) {
    setDraft((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val],
    );
  }

  function apply() {
    onSetValues(draft);
    setOpen(false);
  }

  function clearAndApply() {
    onSetValues([]);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={`flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs transition-all select-none cursor-pointer ${
          hasValues
            ? 'border-filter-active-border bg-filter-active-bg text-filter-active-text font-medium'
            : 'border-filter-trigger-border bg-filter-trigger-bg text-filter-trigger-text hover:bg-filter-trigger-hover-bg hover:border-filter-trigger-hover-border'
        }`}
      >
        <span className="max-w-[140px] truncate">
          {hasValues
            ? `${definition.label} (${values.length})`
            : definition.label}
        </span>
        <ChevronDown className="size-3 opacity-50" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-0">
        {isBool ? (
          <div className="flex flex-col">
            <div className="p-1">
              {BOOLEAN_OPTIONS.map((opt) => {
                const active = draft.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setDraft(active ? [] : [opt.value])}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-table-cell-text hover:bg-interactive-ghost-hover transition-colors"
                  >
                    <span
                      className={`flex size-4 items-center justify-center rounded border transition-colors ${active ? 'border-accent-brand bg-accent-brand text-text-inverse' : 'border-border-strong'}`}
                    >
                      {active && <Check className="size-3" />}
                    </span>
                    {opt.label}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-1.5 border-t border-border-subtle p-1.5">
              <button
                type="button"
                disabled={draft.length === 0 && !hasValues}
                onClick={clearAndApply}
                className="rounded-md px-2 py-1 text-xs text-text-tertiary transition-colors disabled:opacity-30 disabled:cursor-not-allowed enabled:hover:text-text-primary"
              >
                Clear
              </button>
              <Button
                size="sm"
                disabled={!draftChanged}
                onClick={apply}
                className="ml-auto h-7 text-xs"
              >
                Apply
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="p-2 border-b border-border-subtle">
              <input
                type="text"
                placeholder="Search…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-7 w-full rounded-md border border-border bg-surface px-2 text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-interactive-focus-ring"
                autoFocus
              />
            </div>
            <ScrollArea className="max-h-52 p-1">
              {loading ? (
                <div className="flex items-center justify-center py-4 text-text-tertiary">
                  <Loader2 className="size-4 animate-spin" />
                </div>
              ) : filtered.length === 0 ? (
                <p className="py-3 text-center text-xs text-text-tertiary">
                  No options found
                </p>
              ) : (
                filtered.map((opt) => {
                  const active = draft.includes(opt);
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => toggleDraft(opt)}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-table-cell-text hover:bg-interactive-ghost-hover transition-colors"
                    >
                      <span
                        className={`flex size-4 shrink-0 items-center justify-center rounded border transition-colors ${active ? 'border-accent-brand bg-accent-brand text-text-inverse' : 'border-border-strong'}`}
                      >
                        {active && <Check className="size-3" />}
                      </span>
                      <span className="truncate">{opt}</span>
                    </button>
                  );
                })
              )}
            </ScrollArea>
            <div className="flex items-center gap-1.5 border-t border-border-subtle p-1.5">
              <button
                type="button"
                disabled={draft.length === 0 && !hasValues}
                onClick={clearAndApply}
                className="rounded-md px-2 py-1 text-xs text-text-tertiary transition-colors disabled:opacity-30 disabled:cursor-not-allowed enabled:hover:text-text-primary"
              >
                Clear
              </button>
              <Button
                size="sm"
                disabled={!draftChanged}
                onClick={apply}
                className="ml-auto h-7 text-xs"
              >
                Apply
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
