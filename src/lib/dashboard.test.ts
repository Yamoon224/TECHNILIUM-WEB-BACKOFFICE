import { describe, expect, it } from "vitest";
import { formatValue, localized, scalePoints, shares } from "./dashboard";

describe("formatValue", () => {
  it("formats amounts, percentages and counts", () => {
    expect(formatValue(118000, "money")).toBe("118 000 F CFA");
    expect(formatValue(12.5, "percent")).toBe("12,5 %");
    expect(formatValue(1234, "number")).toBe("1 234");
    expect(formatValue(0, "money")).toBe("0 F CFA");
  });
});

describe("localized", () => {
  it("falls back to French when the English wording is missing", () => {
    expect(localized("Ventes", "Sales", "en")).toBe("Sales");
    expect(localized("Ventes", "", "en")).toBe("Ventes");
    expect(localized("Ventes", "Sales", "fr")).toBe("Ventes");
  });
});

describe("shares", () => {
  it("gives each slice its percentage", () => {
    expect(shares([1, 1, 2])).toEqual([25, 25, 50]);
  });

  it("is all zeros without data", () => {
    expect(shares([0, 0])).toEqual([0, 0]);
    expect(shares([])).toEqual([]);
  });
});

describe("scalePoints", () => {
  it("scales to the highest value, zero at the bottom", () => {
    expect(scalePoints([0, 5, 10], 100, 50)).toEqual([
      { x: 0, y: 50 },
      { x: 50, y: 25 },
      { x: 100, y: 0 },
    ]);
  });

  it("centres a single point and flattens an all-zero series", () => {
    expect(scalePoints([7], 100, 50)).toEqual([{ x: 50, y: 0 }]);
    expect(scalePoints([0, 0], 100, 50).every((point) => point.y === 50)).toBe(true);
  });
});
