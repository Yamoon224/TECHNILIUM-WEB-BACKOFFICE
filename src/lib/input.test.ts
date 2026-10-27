import { describe, expect, it } from "vitest";
import { parseOptionalAmount, parseReturnItems } from "./input";

describe("parseOptionalAmount", () => {
  it("treats a blank field as 'use the default'", () => {
    expect(parseOptionalAmount("")).toBeUndefined();
    expect(parseOptionalAmount("   ")).toBeUndefined();
  });

  it("accepts a positive whole number", () => {
    expect(parseOptionalAmount("15000")).toBe(15000);
    expect(parseOptionalAmount(" 7 ")).toBe(7);
  });

  it("rejects zero, negatives, decimals and garbage", () => {
    for (const bad of ["0", "-5", "1.5", "12abc", "abc"]) {
      expect(parseOptionalAmount(bad)).toBeNull();
    }
  });
});

describe("parseReturnItems", () => {
  it("returns no articles for a blank field", () => {
    expect(parseReturnItems("")).toEqual([]);
  });

  it("parses offer:quantity pairs, defaulting the quantity to 1", () => {
    expect(parseReturnItems("12:2, 15")).toEqual([
      { offer_id: 12, quantity: 2 },
      { offer_id: 15, quantity: 1 },
    ]);
  });

  it("rejects malformed entries and zero quantities", () => {
    for (const bad of ["12:", ":2", "12:0", "a:1", "12;2", "12:1,,13"]) {
      expect(parseReturnItems(bad)).toBeNull();
    }
  });
});
