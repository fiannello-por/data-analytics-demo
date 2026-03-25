import { describe, expect, it } from "vitest";

import * as dashboardSpec from "@por/dashboard-spec";
import * as dashboardLayout from "@por/dashboard-layout";
import * as dashboardVisualizationRecharts from "@por/dashboard-visualization-recharts";

describe("dashboard package scaffolding", () => {
  it("exposes the shared packages to situation-room", () => {
    expect(dashboardSpec).toBeTruthy();
    expect(dashboardLayout).toBeTruthy();
    expect(dashboardVisualizationRecharts).toBeTruthy();
  });
});
