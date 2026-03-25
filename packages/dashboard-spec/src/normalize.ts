import type {
  GridLayoutSpec,
  SplitLayoutSpec,
  StackLayoutSpec,
  TileInteractionSpec,
  TileLayoutSpec,
  TileSpec,
} from './spec';

const DEFAULT_LAYOUT = {
  colSpan: 1,
  minHeight: 240,
} as const;

const DEFAULT_INTERACTIONS = {
  allowInspect: false,
  allowDownload: false,
} as const;

export type NormalizedTileLayoutSpec = TileLayoutSpec & {
  colSpan: number;
  minHeight: number;
};

export type NormalizedTileInteractionSpec = Required<TileInteractionSpec>;

export type NormalizedTileSpec = Omit<TileSpec, 'layout' | 'interactions'> & {
  layout: NormalizedTileLayoutSpec;
  interactions: NormalizedTileInteractionSpec;
  children?: NormalizedTileSpec[];
};

export function normalizeTileSpec(spec: TileSpec): NormalizedTileSpec {
  if (spec.kind === 'composite') {
    return {
      ...spec,
      children: spec.children.map((child) => normalizeTileSpec(child)),
      layout: normalizeLayout(spec.layout),
      interactions: normalizeInteractions(spec.interactions),
    };
  }

  return {
    ...spec,
    layout: normalizeLayout(spec.layout),
    interactions: normalizeInteractions(spec.interactions),
  };
}

function normalizeLayout(layout: TileSpec['layout']): NormalizedTileLayoutSpec {
  if (!layout) {
    return { ...DEFAULT_LAYOUT };
  }

  const base = {
    ...DEFAULT_LAYOUT,
    ...layout,
  };

  if (!('type' in layout) || layout.type === undefined) {
    return base;
  }

  switch (layout.type) {
    case 'split':
      return {
        ...base,
        direction: layout.direction ?? 'horizontal',
        type: 'split',
      } satisfies SplitLayoutSpec as NormalizedTileLayoutSpec;
    case 'grid':
      return {
        ...base,
        columns: layout.columns ?? 1,
        gap: layout.gap ?? 0,
        type: 'grid',
      } satisfies GridLayoutSpec as NormalizedTileLayoutSpec;
    case 'stack':
      return {
        ...base,
        gap: layout.gap ?? 0,
        type: 'stack',
      } satisfies StackLayoutSpec as NormalizedTileLayoutSpec;
    default:
      return base;
  }
}

function normalizeInteractions(
  interactions: TileSpec['interactions'],
): NormalizedTileInteractionSpec {
  return {
    ...DEFAULT_INTERACTIONS,
    ...interactions,
  };
}
