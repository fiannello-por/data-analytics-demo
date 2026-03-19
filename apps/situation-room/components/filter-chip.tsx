import { Badge } from "@/components/ui/badge";

interface FilterChipProps {
  label: string;
  values: string[];
  onRemove: () => void;
}

export function FilterChip({ label, values, onRemove }: FilterChipProps) {
  return (
    <Badge
      variant="secondary"
      className="gap-1.5 pl-2.5 pr-1.5 py-1 text-xs font-normal bg-accent-brand-subtle text-text-primary border border-border-subtle cursor-default"
    >
      <span className="font-medium text-text-secondary">{label}:</span>
      <span>{values.join(", ")}</span>
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 rounded-sm p-0.5 hover:bg-surface-sunken text-text-tertiary hover:text-text-primary transition-colors"
        aria-label={`Remove ${label} filter`}
      >
        ×
      </button>
    </Badge>
  );
}
