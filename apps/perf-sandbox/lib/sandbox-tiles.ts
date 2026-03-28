// apps/perf-sandbox/lib/sandbox-tiles.ts

// Fixed 5-tile subset — one bookings_amount per category.
// Exercises all 5 categories with minimal query volume.
export const SANDBOX_TILES = [
  { tileId: 'new_logo_bookings_amount', category: 'New Logo' as const },
  { tileId: 'expansion_bookings_amount', category: 'Expansion' as const },
  { tileId: 'migration_bookings_amount', category: 'Migration' as const },
  { tileId: 'renewal_bookings_amount', category: 'Renewal' as const },
  { tileId: 'total_bookings_amount', category: 'Total' as const },
] as const;