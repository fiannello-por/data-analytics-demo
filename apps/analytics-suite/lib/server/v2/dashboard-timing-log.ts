import 'server-only';

type TimingDetails = Record<string, string | number | boolean | null | undefined>;

function shouldLogDashboardTimings() {
  return process.env.NODE_ENV !== 'production' || process.env.DASHBOARD_TIMING_LOGS === '1';
}

function formatDetails(details: TimingDetails) {
  const entries = Object.entries(details).filter(([, value]) => value != null);

  if (entries.length === 0) {
    return '';
  }

  return entries
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(' ');
}

export async function withDashboardTimingLog<T>(
  label: string,
  details: TimingDetails,
  operation: () => Promise<T>,
): Promise<T> {
  const startedAt = performance.now();

  try {
    const result = await operation();

    if (shouldLogDashboardTimings()) {
      const elapsedMs = Math.round((performance.now() - startedAt) * 100) / 100;
      const suffix = formatDetails(details);
      console.info(
        `[dashboard-timing] ${label} ok ${elapsedMs}ms${suffix ? ` ${suffix}` : ''}`,
      );
    }

    return result;
  } catch (error) {
    if (shouldLogDashboardTimings()) {
      const elapsedMs = Math.round((performance.now() - startedAt) * 100) / 100;
      const suffix = formatDetails(details);
      const message = error instanceof Error ? error.message : 'unknown error';
      console.error(
        `[dashboard-timing] ${label} fail ${elapsedMs}ms${suffix ? ` ${suffix}` : ''} error=${message}`,
      );
    }

    throw error;
  }
}

export function logDashboardTiming(label: string, elapsedMs: number, details: TimingDetails) {
  if (!shouldLogDashboardTimings()) {
    return;
  }

  const suffix = formatDetails(details);
  console.info(
    `[dashboard-timing] ${label} ${Math.round(elapsedMs * 100) / 100}ms${suffix ? ` ${suffix}` : ''}`,
  );
}
