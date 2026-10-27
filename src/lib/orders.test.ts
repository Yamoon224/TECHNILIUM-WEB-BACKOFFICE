import { describe, expect, it } from "vitest";
import { hasSplit, sellerLabel } from "./orders";

describe("sub-order helpers", () => {
  it("labels Technilium's own stock and vendors", () => {
    expect(sellerLabel({ vendor_id: null })).toBe("Technilium");
    expect(sellerLabel({ vendor_id: 12 })).toBe("Vendeur #12");
  });

  it("only shows a breakdown when several sellers are involved", () => {
    const share = { id: 1, vendor_id: null, status: "pending" as const, subtotal: { amount: 1, currency: "XOF" }, delivered_at: null };
    expect(hasSplit({ sub_orders: [share] })).toBe(false);
    expect(hasSplit({ sub_orders: [share, { ...share, id: 2 }] })).toBe(true);
    expect(hasSplit({})).toBe(false);
  });
});
