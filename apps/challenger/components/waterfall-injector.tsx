// apps/challenger/components/waterfall-injector.tsx

import type { WaterfallCollector } from '../lib/waterfall-types';

type Props = {
  collector: WaterfallCollector;
  allPromises: Promise<unknown>[];
};

export async function WaterfallInjector({ collector, allPromises }: Props) {
  await Promise.allSettled(allPromises);
  const spans = collector.getSpans();

  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
      window.__CHALLENGER_TELEMETRY__ = {
        ...window.__CHALLENGER_TELEMETRY__,
        waterfall: ${JSON.stringify(spans)},
      };
      try { sessionStorage.setItem('challenger-waterfall', ${JSON.stringify(JSON.stringify(spans))}); } catch {}
    `,
      }}
    />
  );
}
