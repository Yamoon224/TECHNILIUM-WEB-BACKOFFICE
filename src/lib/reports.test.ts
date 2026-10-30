import { describe, expect, it } from "vitest";
import { barPercent, defaultPeriod, hasCostGap, isValidPeriod, marginPercentLabel, maxRevenue, toDateInput } from "./reports";

describe("period helpers", () => {
  it("formats a local date as YYYY-MM-DD", () => {
    expect(toDateInput(new Date(2026, 9, 5))).toBe("2026-10-05");
  });

  it("defaults to the 30 days ending today, inclusive", () => {
    expect(defaultPeriod(new Date(2026, 9, 31))).toEqual({ from: "2026-10-02", to: "2026-10-31" });
  });

  it("crosses a month boundary", () => {
    expect(defaultPeriod(new Date(2026, 10, 10))).toEqual({ from: "2026-10-12", to: "2026-11-10" });
  });

  it("rejects an inverted or incomplete period", () => {
    expect(isValidPeriod({ from: "2026-10-01", to: "2026-10-31" })).toBe(true);
    expect(isValidPeriod({ from: "2026-10-01", to: "2026-10-01" })).toBe(true);
    expect(isValidPeriod({ from: "2026-10-31", to: "2026-10-01" })).toBe(false);
    expect(isValidPeriod({ from: "", to: "2026-10-01" })).toBe(false);
  });
});

describe("bar scaling", () => {
  it("scales against the largest value", () => {
    expect(barPercent(50, 100)).toBe(50);
    expect(barPercent(100, 100)).toBe(100);
  });

  it("keeps a tiny non-zero value visible", () => {
    expect(barPercent(1, 100_000)).toBe(2);
  });

  it("is zero when there is nothing to scale", () => {
    expect(barPercent(0, 100)).toBe(0);
    expect(barPercent(10, 0)).toBe(0);
  });

  it("finds the maximum daily revenue", () => {
    expect(maxRevenue([])).toBe(0);
    expect(
      maxRevenue([
        { date: "2026-10-01", orders: 1, revenue: 30 },
        { date: "2026-10-02", orders: 2, revenue: 90 },
      ]),
    ).toBe(90);
  });
});

describe("margin helpers", () => {
  it("formats the margin rate with a decimal comma", () => {
    expect(marginPercentLabel(76.4)).toBe("76,4 %");
    expect(marginPercentLabel(30)).toBe("30,0 %");
    expect(marginPercentLabel(-5.5)).toBe("-5,5 %");
  });

  it("shows a dash when there is no revenue to compare to", () => {
    expect(marginPercentLabel(null)).toBe("-");
  });

  it("flags revenue without a recorded cost, which overstates the margin", () => {
    expect(hasCostGap({ uncosted_lines: 0 })).toBe(false);
    expect(hasCostGap({ uncosted_lines: 2 })).toBe(true);
  });
});
