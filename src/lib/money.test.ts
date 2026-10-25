import { describe, expect, it } from "vitest";
import { addMoney, formatMoney, toMajorUnits, zeroMoney } from "./money";

describe("money", () => {
  it("converts XOF (0 decimals) smallest units to major units 1:1", () => {
    expect(toMajorUnits({ amount: 125000, currency: "XOF" })).toBe(125000);
  });

  it("converts EUR cents to major units", () => {
    expect(toMajorUnits({ amount: 4990, currency: "EUR" })).toBe(49.9);
  });

  it("formats XOF without decimals", () => {
    expect(formatMoney({ amount: 125000, currency: "XOF" })).toContain("125");
  });

  it("adds two amounts of the same currency", () => {
    expect(addMoney({ amount: 100, currency: "XOF" }, { amount: 50, currency: "XOF" })).toEqual({
      amount: 150,
      currency: "XOF",
    });
  });

  it("refuses to add mismatched currencies", () => {
    expect(() =>
      addMoney({ amount: 100, currency: "XOF" }, { amount: 50, currency: "EUR" }),
    ).toThrow(/different currencies/);
  });

  it("builds a zero amount", () => {
    expect(zeroMoney("XOF")).toEqual({ amount: 0, currency: "XOF" });
  });
});
