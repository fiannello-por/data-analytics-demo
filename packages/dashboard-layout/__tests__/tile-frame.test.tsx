import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  DashboardSplit,
  TileEmptyState,
  TileErrorState,
  TileFrame,
  TileLoadingState,
} from "../src";

describe("TileFrame", () => {
  it("renders title, subtitle, and actions in shared chrome", () => {
    const html = renderToStaticMarkup(
      <TileFrame
        title="Main Metrics"
        subtitle="Track the primary outcomes for this booking category."
        actions={<button type="button">Inspect</button>}
      >
        <div>Body</div>
      </TileFrame>,
    );

    expect(html).toContain("Main Metrics");
    expect(html).toContain(
      "Track the primary outcomes for this booking category.",
    );
    expect(html).toContain("Inspect");
    expect(html).toContain("Body");
  });
});

describe("tile states", () => {
  it("renders a shared loading shell", () => {
    const html = renderToStaticMarkup(
      <TileLoadingState label="Loading dashboard tile" />,
    );

    expect(html).toContain("Loading dashboard tile");
    expect(html).toContain('role="status"');
  });

  it("renders a shared empty shell", () => {
    const html = renderToStaticMarkup(
      <TileEmptyState
        title="No data yet"
        description="Connect a source to populate this tile."
      />,
    );

    expect(html).toContain("No data yet");
    expect(html).toContain("Connect a source to populate this tile.");
  });

  it("renders a shared error shell", () => {
    const html = renderToStaticMarkup(
      <TileErrorState
        title="Unable to load tile"
        description="Try again after refreshing the page."
      />,
    );

    expect(html).toContain("Unable to load tile");
    expect(html).toContain("Try again after refreshing the page.");
    expect(html).toContain('role="alert"');
  });
});

describe("DashboardSplit", () => {
  it("gives the first child content width and the second child fill width", () => {
    const html = renderToStaticMarkup(
      <DashboardSplit
        leading={<div data-testid="leading">Leading content</div>}
        trailing={<div data-testid="trailing">Trailing content</div>}
      />,
    );

    expect(html).toContain('data-dashboard-split-slot="leading"');
    expect(html).toContain('data-dashboard-split-slot="trailing"');
    expect(html).toContain("flex:0 0 auto");
    expect(html).toContain("flex:1 1 0%");
  });

  it("applies the requested split direction", () => {
    const html = renderToStaticMarkup(
      <DashboardSplit
        direction="column"
        leading={<div>Leading content</div>}
        trailing={<div>Trailing content</div>}
      />,
    );

    expect(html).toContain("flex-direction:column");
  });
});
