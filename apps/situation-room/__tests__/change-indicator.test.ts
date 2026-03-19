import { describe, it, expect } from "vitest";
import { parseChange } from "@/components/change-indicator";

describe("parseChange", () => {
  it("identifies positive changes", () => {
    const result = parseChange("+12.5%");
    expect(result).toEqual({ direction: "positive", display: "+12.5%" });
  });

  it("identifies negative changes", () => {
    const result = parseChange("-8.3%");
    expect(result).toEqual({ direction: "negative", display: "-8.3%" });
  });

  it("identifies neutral/dash changes", () => {
    const result = parseChange("-");
    expect(result).toEqual({ direction: "neutral", display: "-" });
  });

  it("handles zero-ish values as neutral", () => {
    const result = parseChange("+0.0%");
    expect(result).toEqual({ direction: "neutral", display: "+0.0%" });
  });
});
