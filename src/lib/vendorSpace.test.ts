import { describe, expect, it } from "vitest";
import { canShip, isOutOfStock, totalCount } from "./vendorSpace";

describe("vendor space helpers", () => {
  it("totals orders across statuses", () => {
    expect(totalCount({ confirmed: 2, delivered: 3 })).toBe(5);
    expect(totalCount({})).toBe(0);
  });

  it("lets a vendor ship only a confirmed share", () => {
    expect(canShip({ status: "confirmed" })).toBe(true);
    for (const status of ["pending", "shipped", "delivered", "cancelled"]) {
      expect(canShip({ status })).toBe(false);
    }
  });

  it("flags an offer without stock", () => {
    expect(isOutOfStock({ stock_quantity: 0 })).toBe(true);
    expect(isOutOfStock({ stock_quantity: 3 })).toBe(false);
  });
});
