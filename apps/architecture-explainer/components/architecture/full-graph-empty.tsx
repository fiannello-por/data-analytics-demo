'use client';

import * as React from 'react';
import { Network } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function FullGraphEmpty() {
  return (
    <Card className="border-dashed bg-card/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Network className="size-4 text-muted-foreground" />
          No component selected
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Select a node in the graph to inspect what it does, what it depends
          on, and how much time it contributes to the dashboard refresh path.
        </p>
      </CardContent>
    </Card>
  );
}
