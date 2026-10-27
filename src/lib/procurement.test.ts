import { describe, expect, it } from "vitest";
import { isValidReceipt, linesTotal, parseOrderLines, purchaseActions, receivableLines, type PurchaseOrderLine } from "./procurement";

describe("purchaseActions", () => {
  it("sends or cancels a draft", () => {
    expect(purchaseActions("draft")).toEqual(["place", "cancel"]);
  });

  it("receives, adds costs or cancels an order that was sent", () => {
    expect(purchaseActions("ordered")).toEqual(["receive", "landed", "cancel"]);
  });

  it("no longer offers to cancel once goods have been received", () => {
    expect(purchaseActions("partially_received")).toEqual(["receive", "landed"]);
    expect(purchaseActions("partially_received")).not.toContain("cancel");
  });

  it("offers nothing on a closed order", () => {
    expect(purchaseActions("received")).toEqual([]);
    expect(purchaseActions("cancelled")).toEqual([]);
  });
});

describe("parseOrderLines", () => {
  it("parses offer:quantity:unit cost triples", () => {
    expect(parseOrderLines("12:10:5000, 15:4:20000")).toEqual([
      { offer_id: 12, quantity: 10, unit_cost_amount: 5000 },
      { offer_id: 15, quantity: 4, unit_cost_amount: 20000 },
    ]);
  });

  it("treats a blank text as no lines", () => {
    expect(parseOrderLines("  ")).toEqual([]);
  });

  it("rejects malformed text, a zero quantity and a repeated offer", () => {
    for (const bad of ["12:10", "12:10:5000:1", "a:1:1", "12:0:100", "12:1:100,12:2:100", "12:1:100,,13:1:1", "-1:1:1"]) {
      expect(parseOrderLines(bad)).toBeNull();
    }
  });

  it("allows a zero unit cost (free goods)", () => {
    expect(parseOrderLines("1:5:0")).toEqual([{ offer_id: 1, quantity: 5, unit_cost_amount: 0 }]);
  });

  it("totals the value of the lines", () => {
    expect(linesTotal([{ offer_id: 1, quantity: 10, unit_cost_amount: 100 }, { offer_id: 2, quantity: 2, unit_cost_amount: 50 }])).toBe(1100);
    expect(linesTotal([])).toBe(0);
  });
});

describe("receiving", () => {
  const line = (id: number, outstanding: number): PurchaseOrderLine => ({
    id, offer_id: id, description: "x", quantity_ordered: 10, quantity_received: 10 - outstanding,
    quantity_rejected: 0, outstanding, unit_cost_amount: 1,
  });

  it("lists only the lines with something still to receive", () => {
    expect(receivableLines({ lines: [line(1, 4), line(2, 0), line(3, 10)] }).map((l) => l.id)).toEqual([1, 3]);
    expect(receivableLines({})).toEqual([]);
  });

  it("accepts a receipt within what is outstanding", () => {
    expect(isValidReceipt(4, 0, 10)).toBe(true);
    expect(isValidReceipt(6, 4, 10)).toBe(true);
    expect(isValidReceipt(0, 10, 10)).toBe(true);
  });

  it("refuses an empty, negative, fractional or excessive receipt", () => {
    expect(isValidReceipt(0, 0, 10)).toBe(false);
    expect(isValidReceipt(-1, 5, 10)).toBe(false);
    expect(isValidReceipt(1.5, 0, 10)).toBe(false);
    expect(isValidReceipt(6, 5, 10)).toBe(false);
  });
});
