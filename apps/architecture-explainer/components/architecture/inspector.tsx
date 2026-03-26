'use client';

import * as React from 'react';
import { ArrowRightLeft, FileCode2, Focus, ScanSearch } from 'lucide-react';
import { FullGraphEmpty } from '@/components/architecture/full-graph-empty';
import { TimingWaterfall } from '@/components/architecture/timing-waterfall';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type {
  ArchitectureNode,
  ArchitectureNodeTiming,
} from '@/lib/architecture/contracts';

function NodeList({
  title,
  items,
}: {
  title: string;
  items: { label: string; value: string }[];
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
        {title}
      </p>
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={`${title}-${item.label}-${item.value}`}
            className="rounded-md border border-border/60 bg-background/35 px-3 py-2"
          >
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className="mt-1 text-sm leading-relaxed font-medium text-foreground break-words whitespace-normal">
              {item.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Inspector({
  node,
  timing,
  focusMode,
  onFocusConnections,
  onShowFullGraph,
}: {
  node: ArchitectureNode | null;
  timing: ArchitectureNodeTiming | null;
  focusMode: boolean;
  onFocusConnections: () => void;
  onShowFullGraph: () => void;
}) {
  const [activeTab, setActiveTab] = React.useState<
    'overview' | 'contract' | 'code' | 'timing'
  >('overview');

  React.useEffect(() => {
    setActiveTab('overview');
  }, [node?.id]);

  if (!node) {
    return <FullGraphEmpty />;
  }

  return (
    <Card className="flex h-[calc(100vh-10rem)] min-h-[780px] flex-col overflow-hidden border-border/60 bg-card/82">
      <CardHeader className="gap-4 border-b border-border/60 bg-background/24 px-5 py-5">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {node.pipelines.map((pipeline) => (
                <Badge key={`${node.id}-${pipeline}`}>{pipeline}</Badge>
              ))}
              <Badge variant="outline">{node.kind.replace('-', ' ')}</Badge>
            </div>
            <div className="space-y-1">
              <CardTitle className="text-xl">{node.title}</CardTitle>
              <CardDescription>{node.summary}</CardDescription>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={onFocusConnections}>
              <Focus className="size-3.5" />
              Focus connections
            </Button>
            {focusMode ? (
              <Button variant="ghost" size="sm" onClick={onShowFullGraph}>
                <ArrowRightLeft className="size-3.5" />
                Show full map
              </Button>
            ) : null}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden px-5 py-5">
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as typeof activeTab)}
          className="grid min-h-0 flex-1 grid-rows-[auto,minmax(0,1fr)] gap-4 overflow-hidden"
        >
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="contract">Data contract</TabsTrigger>
            <TabsTrigger value="code">Source code</TabsTrigger>
            <TabsTrigger value="timing">Timing</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="min-h-0 overflow-hidden">
            <div className="h-full space-y-5 overflow-y-auto pr-1">
              <section className="space-y-3">
                <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
                  What this does
                </p>
                <p className="text-sm leading-relaxed text-foreground/90">
                  {node.summary}
                </p>
              </section>

              <Separator />

              <section className="space-y-3">
                <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
                  Component type
                </p>
                <div className="rounded-md border border-border/60 bg-background/35 px-3 py-3">
                  <p className="text-sm leading-relaxed text-foreground/90">
                    This node participates in the{' '}
                    <span className="font-medium">
                      {node.pipelines.join(', ')}
                    </span>{' '}
                    pipeline flow and is classified as a{' '}
                    <span className="font-medium">
                      {node.kind.replace('-', ' ')}
                    </span>{' '}
                    component in the current dashboard architecture.
                  </p>
                </div>
              </section>
            </div>
          </TabsContent>

          <TabsContent value="contract" className="min-h-0 overflow-hidden">
            <section className="h-full space-y-5 overflow-y-auto pr-1">
              <NodeList title="Inputs" items={node.inputs} />
              <Separator />
              <NodeList title="Outputs" items={node.outputs} />
            </section>
          </TabsContent>

          <TabsContent value="code" className="min-h-0 overflow-hidden">
            <section className="h-full space-y-3 overflow-y-auto pr-1">
              <div className="flex items-center gap-2">
                <ScanSearch className="size-4 text-muted-foreground" />
                <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
                  Source code references
                </p>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                These are the concrete files and symbols that implement the
                selected component in the current codebase.
              </p>
              <div className="space-y-2">
                {node.codeRefs.map((ref) => (
                  <div
                    key={`${ref.path}:${ref.symbol}`}
                    className="rounded-md border border-border/60 bg-background/35 px-3 py-3 text-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <p className="font-medium break-words">{ref.symbol}</p>
                        <p className="text-xs leading-relaxed text-muted-foreground break-all whitespace-normal">
                          {ref.path}
                        </p>
                      </div>
                      <FileCode2 className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </TabsContent>

          <TabsContent value="timing" className="min-h-0 overflow-hidden">
            <section className="h-full space-y-3 overflow-y-auto pr-1">
              <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
                Timing breakdown
              </p>
              <TimingWaterfall timing={timing} />
            </section>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
