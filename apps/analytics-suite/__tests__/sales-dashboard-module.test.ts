import { describe, expect, it } from 'vitest';
import { salesPerformanceModule } from '@/dashboards/sales-performance/module';

describe('sales performance dashboard module', () => {
  it('defines metadata and a local semantic registry', () => {
    expect(salesPerformanceModule.id).toBe('sales-performance');
    expect(salesPerformanceModule.href).toBe('/dashboards/sales-performance');
    expect(salesPerformanceModule.registry.models).toContain(
      'sales_dashboard_v2_opportunity_base',
    );
    expect(salesPerformanceModule.registry.surfaces.length).toBeGreaterThan(0);
  });
});
