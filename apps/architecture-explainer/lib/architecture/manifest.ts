import type { ArchitectureManifest } from '@/lib/architecture/contracts';

export const architectureManifest: ArchitectureManifest = {
  systemId: 'sales-performance-dashboard',
  systemTitle: 'Sales Performance Dashboard',
  nodes: [
    {
      id: 'dashboard-surface',
      kind: 'ui',
      stage: 'dashboard',
      position: { x: 760, y: 430 },
      title: 'Dashboard surface',
      summary:
        'The dashboard shell where users change filters, switch views, and trigger data refreshes.',
      pipelines: ['overview', 'snapshot', 'trend', 'closed-won', 'filters'],
      codeRefs: [
        {
          path: '/Users/f/Documents/GitHub/point-of-rental/data-analytics-demo/apps/situation-room/components/dashboard/dashboard-shell.tsx',
          symbol: 'DashboardShell',
        },
      ],
      inputs: [
        {
          label: 'User actions',
          value:
            'Filter changes, category changes, row selections, and refresh-triggering interactions.',
        },
      ],
      outputs: [
        {
          label: 'Refresh orchestration',
          value:
            'Coordinates which downstream requests need to run and which visual surfaces must update.',
        },
      ],
    },
    {
      id: 'filter-state',
      kind: 'client-state',
      stage: 'client',
      position: { x: 40, y: 40 },
      title: 'Filter and selection state',
      summary:
        'Stores the active date range, selected category, selected metric, and current filter set.',
      pipelines: ['overview', 'snapshot', 'trend', 'closed-won', 'filters'],
      codeRefs: [
        {
          path: '/Users/f/Documents/GitHub/point-of-rental/data-analytics-demo/apps/situation-room/lib/dashboard/query-inputs.ts',
          symbol: 'serializeDashboardStateSearchParams',
        },
        {
          path: '/Users/f/Documents/GitHub/point-of-rental/data-analytics-demo/apps/situation-room/components/dashboard/dashboard-shell.tsx',
          symbol: 'state',
        },
      ],
      inputs: [
        {
          label: 'State inputs',
          value:
            'Current date range, prior period range, chosen tab, selected tile, and multi-select filters.',
        },
      ],
      outputs: [
        {
          label: 'Request context',
          value:
            'Normalized client-side state that can be converted into API calls for each dashboard surface.',
        },
      ],
    },
    {
      id: 'request-planner',
      kind: 'request-builder',
      stage: 'client',
      position: { x: 360, y: 40 },
      title: 'Request planner',
      summary:
        'Builds the URLs and request combinations needed for the active dashboard surface.',
      pipelines: ['overview', 'snapshot', 'trend', 'closed-won'],
      codeRefs: [
        {
          path: '/Users/f/Documents/GitHub/point-of-rental/data-analytics-demo/apps/situation-room/lib/dashboard/query-inputs.ts',
          symbol: 'buildDashboardOverviewUrl',
        },
        {
          path: '/Users/f/Documents/GitHub/point-of-rental/data-analytics-demo/apps/situation-room/lib/dashboard/query-inputs.ts',
          symbol: 'buildDashboardCategoryUrl',
        },
        {
          path: '/Users/f/Documents/GitHub/point-of-rental/data-analytics-demo/apps/situation-room/lib/dashboard/query-inputs.ts',
          symbol: 'buildDashboardTrendUrl',
        },
        {
          path: '/Users/f/Documents/GitHub/point-of-rental/data-analytics-demo/apps/situation-room/lib/dashboard/query-inputs.ts',
          symbol: 'buildDashboardClosedWonUrl',
        },
      ],
      inputs: [
        {
          label: 'Planning inputs',
          value:
            'Normalized state plus the currently visible dashboard surface that needs fresh data.',
        },
      ],
      outputs: [
        {
          label: 'API requests',
          value:
            'Concrete API requests for overview, detail snapshots, trends, or the closed-won table.',
        },
      ],
    },
    {
      id: 'data-api-layer',
      kind: 'api-route',
      stage: 'api',
      position: { x: 700, y: 40 },
      title: 'Dashboard data API',
      summary:
        'Route handlers that receive dashboard requests and dispatch them to the correct server loaders.',
      pipelines: ['overview', 'snapshot', 'trend', 'closed-won'],
      codeRefs: [
        {
          path: '/Users/f/Documents/GitHub/point-of-rental/data-analytics-demo/apps/situation-room/app/api/dashboard/overview/route.ts',
          symbol: 'GET',
        },
        {
          path: '/Users/f/Documents/GitHub/point-of-rental/data-analytics-demo/apps/situation-room/app/api/dashboard/category/[category]/route.ts',
          symbol: 'GET',
        },
        {
          path: '/Users/f/Documents/GitHub/point-of-rental/data-analytics-demo/apps/situation-room/app/api/dashboard/trend/[tileId]/route.ts',
          symbol: 'GET',
        },
        {
          path: '/Users/f/Documents/GitHub/point-of-rental/data-analytics-demo/apps/situation-room/app/api/dashboard/closed-won/[category]/route.ts',
          symbol: 'GET',
        },
      ],
      inputs: [
        {
          label: 'API inputs',
          value:
            'Request URLs containing date ranges, filter values, active categories, and selected metrics.',
        },
      ],
      outputs: [
        {
          label: 'Loader calls',
          value:
            'Server-side calls into overview, snapshot, trend, and table loaders using the request context.',
        },
      ],
    },
    {
      id: 'filter-dictionary-service',
      kind: 'api-route',
      stage: 'api',
      position: { x: 360, y: 220 },
      title: 'Filter dictionary service',
      summary:
        'Fetches the available values for each global control so the filter UI can render valid options.',
      pipelines: ['filters'],
      codeRefs: [
        {
          path: '/Users/f/Documents/GitHub/point-of-rental/data-analytics-demo/apps/situation-room/app/api/dashboard/filter-dictionaries/[key]/route.ts',
          symbol: 'GET',
        },
        {
          path: '/Users/f/Documents/GitHub/point-of-rental/data-analytics-demo/apps/situation-room/lib/server/get-dashboard-filter-dictionary.ts',
          symbol: 'getDashboardFilterDictionary',
        },
      ],
      inputs: [
        {
          label: 'Filter key',
          value:
            'A domain-specific filter dimension such as Division, Region, Segment, or Booking Plan Opp Type.',
        },
      ],
      outputs: [
        {
          label: 'Filter options',
          value:
            'A sorted list of valid values for that filter so the control can render and constrain user choices.',
        },
      ],
    },
    {
      id: 'metric-query-layer',
      kind: 'sql-builder',
      stage: 'query',
      position: { x: 1050, y: 40 },
      title: 'Metric query layer',
      summary:
        'Builds the BigQuery SQL for overview, detail, trend, closed-won, and filter dictionary requests.',
      pipelines: ['overview', 'snapshot', 'trend', 'closed-won', 'filters'],
      codeRefs: [
        {
          path: '/Users/f/Documents/GitHub/point-of-rental/data-analytics-demo/apps/situation-room/lib/bigquery/dashboard-sql.ts',
          symbol: 'buildCategorySnapshotQuery',
        },
        {
          path: '/Users/f/Documents/GitHub/point-of-rental/data-analytics-demo/apps/situation-room/lib/bigquery/dashboard-sql.ts',
          symbol: 'buildTileTrendQuery',
        },
        {
          path: '/Users/f/Documents/GitHub/point-of-rental/data-analytics-demo/apps/situation-room/lib/bigquery/dashboard-sql.ts',
          symbol: 'buildClosedWonOpportunitiesQuery',
        },
        {
          path: '/Users/f/Documents/GitHub/point-of-rental/data-analytics-demo/apps/situation-room/lib/bigquery/dashboard-sql.ts',
          symbol: 'buildDivisionFilterOptionsQuery',
        },
      ],
      inputs: [
        {
          label: 'Query inputs',
          value:
            'Date windows, selected surfaces, filter values, and the metric definitions needed for the target response.',
        },
      ],
      outputs: [
        {
          label: 'Compiled SQL',
          value:
            'Parameterized BigQuery SQL tailored to the active view, grouping, and response contract.',
        },
      ],
    },
    {
      id: 'bigquery-warehouse',
      kind: 'bigquery',
      stage: 'warehouse',
      position: { x: 1400, y: 40 },
      title: 'BigQuery warehouse',
      summary:
        'Runs the compiled SQL against BigQuery and returns raw rows plus execution metadata.',
      pipelines: ['overview', 'snapshot', 'trend', 'closed-won', 'filters'],
      codeRefs: [
        {
          path: '/Users/f/Documents/GitHub/point-of-rental/data-analytics-demo/apps/situation-room/lib/bigquery/client.ts',
          symbol: 'getBigQueryClient',
        },
      ],
      inputs: [
        {
          label: 'Warehouse job',
          value:
            'Compiled SQL, parameters, location, and cache mode for the selected dashboard request.',
        },
      ],
      outputs: [
        {
          label: 'Raw result rows',
          value:
            'BigQuery rows and execution metadata before the dashboard-specific shaping layer runs.',
        },
      ],
    },
    {
      id: 'response-mapper',
      kind: 'transformer',
      stage: 'render',
      position: { x: 1740, y: 40 },
      title: 'Response mapper',
      summary:
        'Turns warehouse rows into the typed payloads used by overview scorecards, trend charts, tables, and filters.',
      pipelines: ['overview', 'snapshot', 'trend', 'closed-won', 'filters'],
      codeRefs: [
        {
          path: '/Users/f/Documents/GitHub/point-of-rental/data-analytics-demo/apps/situation-room/lib/server/get-dashboard-category-snapshot.ts',
          symbol: 'mapRows',
        },
        {
          path: '/Users/f/Documents/GitHub/point-of-rental/data-analytics-demo/apps/situation-room/lib/server/get-dashboard-overview-board.ts',
          symbol: 'getDashboardOverviewBoard',
        },
        {
          path: '/Users/f/Documents/GitHub/point-of-rental/data-analytics-demo/apps/situation-room/lib/server/get-dashboard-closed-won-opportunities.ts',
          symbol: 'getDashboardClosedWonOpportunities',
        },
      ],
      inputs: [
        {
          label: 'Raw data',
          value:
            'Unshaped warehouse rows that still need formatting, aggregation, and payload-specific normalization.',
        },
      ],
      outputs: [
        {
          label: 'Typed payloads',
          value:
            'Overview payloads, detail snapshot rows, trend points, closed-won rows, and filter dictionary values.',
        },
      ],
    },
    {
      id: 'overview-board',
      kind: 'render-target',
      stage: 'render',
      position: { x: 1450, y: 240 },
      title: 'Overview board',
      summary:
        'Renders the cross-category scorecards and global summary surfaces used by the overview mode.',
      pipelines: ['overview'],
      codeRefs: [
        {
          path: '/Users/f/Documents/GitHub/point-of-rental/data-analytics-demo/apps/situation-room/components/dashboard/overview-tab.tsx',
          symbol: 'OverviewTab',
        },
      ],
      inputs: [
        {
          label: 'Overview payload',
          value:
            'Mapped overview data for all categories, ready to render as scorecards and summary sections.',
        },
      ],
      outputs: [
        {
          label: 'Overview visuals',
          value:
            'Scorecards and global summary components visible in the overview mode of the dashboard.',
        },
      ],
    },
    {
      id: 'detail-metrics',
      kind: 'render-target',
      stage: 'render',
      position: { x: 1120, y: 570 },
      title: 'Detail metrics view',
      summary:
        'Renders the detailed metric table used when a user drills into a specific category.',
      pipelines: ['snapshot'],
      codeRefs: [
        {
          path: '/Users/f/Documents/GitHub/point-of-rental/data-analytics-demo/apps/situation-room/components/dashboard/tile-table.tsx',
          symbol: 'TileTable',
        },
      ],
      inputs: [
        {
          label: 'Snapshot payload',
          value:
            'Mapped current-period and prior-period metric rows for a selected dashboard category.',
        },
      ],
      outputs: [
        {
          label: 'Metric table',
          value:
            'The detailed KPI table that supports row selection and detail inspection.',
        },
      ],
    },
    {
      id: 'trend-view',
      kind: 'render-target',
      stage: 'render',
      position: { x: 760, y: 650 },
      title: 'Trend view',
      summary:
        'Renders the selected metric trend so users can inspect the time-series behavior behind a KPI.',
      pipelines: ['trend'],
      codeRefs: [
        {
          path: '/Users/f/Documents/GitHub/point-of-rental/data-analytics-demo/apps/situation-room/components/dashboard/trend-panel.tsx',
          symbol: 'TrendPanel',
        },
      ],
      inputs: [
        {
          label: 'Trend payload',
          value:
            'Weekly current and prior-year points for the metric currently selected in the dashboard.',
        },
      ],
      outputs: [
        {
          label: 'Trend visualization',
          value:
            'Chart-based detail view for the chosen KPI with current and prior-period comparison.',
        },
      ],
    },
    {
      id: 'closed-won-view',
      kind: 'render-target',
      stage: 'render',
      position: { x: 340, y: 570 },
      title: 'Closed won table',
      summary:
        'Renders the opportunity-level closed-won table with sorting and pagination.',
      pipelines: ['closed-won'],
      codeRefs: [
        {
          path: '/Users/f/Documents/GitHub/point-of-rental/data-analytics-demo/apps/situation-room/components/dashboard/closed-won-opportunities-table.tsx',
          symbol: 'ClosedWonOpportunitiesTable',
        },
      ],
      inputs: [
        {
          label: 'Closed-won payload',
          value:
            'Mapped current-period opportunity rows formatted for tabular exploration.',
        },
      ],
      outputs: [
        {
          label: 'Closed-won table UI',
          value:
            'The sortable and paginated opportunity table shown below the main dashboard content.',
        },
      ],
    },
    {
      id: 'filter-controls',
      kind: 'render-target',
      stage: 'render',
      position: { x: 40, y: 260 },
      title: 'Filter controls',
      summary:
        'Renders the global control bar so users can refine the dataset before refreshing the main surfaces.',
      pipelines: ['filters'],
      codeRefs: [
        {
          path: '/Users/f/Documents/GitHub/point-of-rental/data-analytics-demo/apps/situation-room/components/dashboard/dashboard-filters.tsx',
          symbol: 'DashboardFilters',
        },
      ],
      inputs: [
        {
          label: 'Dictionary payloads',
          value:
            'Mapped filter option lists, active values, date ranges, and freshness metadata for the controls.',
        },
      ],
      outputs: [
        {
          label: 'Control UI',
          value:
            'The collapsible global controls section that drives the rest of the dashboard refresh flow.',
        },
      ],
    },
  ],
  edges: [
    { from: 'dashboard-surface', to: 'filter-state', label: 'capture intent', type: 'trigger' },
    { from: 'filter-state', to: 'request-planner', label: 'plan requests', type: 'data' },
    { from: 'request-planner', to: 'data-api-layer', label: 'refresh data', type: 'trigger' },
    {
      from: 'request-planner',
      to: 'filter-dictionary-service',
      label: 'refresh filter options',
      type: 'trigger',
    },
    { from: 'data-api-layer', to: 'metric-query-layer', label: 'build metric SQL', type: 'data' },
    {
      from: 'filter-dictionary-service',
      to: 'metric-query-layer',
      label: 'build dictionary SQL',
      type: 'data',
    },
    { from: 'metric-query-layer', to: 'bigquery-warehouse', label: 'execute SQL', type: 'data' },
    { from: 'bigquery-warehouse', to: 'response-mapper', label: 'shape results', type: 'transform' },
    { from: 'response-mapper', to: 'overview-board', label: 'overview payload', type: 'render' },
    { from: 'response-mapper', to: 'detail-metrics', label: 'detail payload', type: 'render' },
    { from: 'response-mapper', to: 'trend-view', label: 'trend payload', type: 'render' },
    { from: 'response-mapper', to: 'closed-won-view', label: 'table payload', type: 'render' },
    { from: 'response-mapper', to: 'filter-controls', label: 'dictionary payload', type: 'render' },
    { from: 'overview-board', to: 'dashboard-surface', label: 'render board', type: 'render' },
    { from: 'detail-metrics', to: 'dashboard-surface', label: 'render detail', type: 'render' },
    { from: 'trend-view', to: 'dashboard-surface', label: 'render trend', type: 'render' },
    { from: 'closed-won-view', to: 'dashboard-surface', label: 'render table', type: 'render' },
    { from: 'filter-controls', to: 'dashboard-surface', label: 'render controls', type: 'render' },
  ],
};
