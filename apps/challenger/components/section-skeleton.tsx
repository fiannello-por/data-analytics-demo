'use client';

// apps/challenger/components/section-skeleton.tsx

type SectionSkeletonProps = {
  height?: number;
  label?: string;
};

export function SectionSkeleton({ height = 200, label }: SectionSkeletonProps) {
  return (
    <div
      data-testid="section-skeleton"
      style={{ height }}
      className="flex items-center justify-center rounded-md bg-gray-100 animate-pulse"
    >
      {label && (
        <span className="text-sm text-gray-400 select-none">{label}</span>
      )}
    </div>
  );
}
