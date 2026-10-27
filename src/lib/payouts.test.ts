import { describe, expect, it } from "vitest";
import { netOf, totalOwed, type Payout } from "./payouts";

function payout(overrides: Partial<Payout>): Payout {
  return {
    id: 1,
    vendor_id: 1,
    vendor_name: "TechShop",
    status: "pending",
    currency: "XOF",
    commission_rate_percent: 10,
    gross_amount: 100_000,
    commission_amount: 10_000,
    net_amount: 90_000,
    payment_reference: null,
    paid_at: null,
    created_at: null,
    items: null,
    ...overrides,
  };
}

describe("payouts helpers", () => {
  it("derives net as gross minus commission", () => {
    expect(netOf({ gross_amount: 100_000, commission_amount: 10_000 })).toBe(90_000);
  });

  it("sums only pending payouts as still owed to vendors", () => {
    const list = [
      payout({ id: 1, net_amount: 90_000 }),
      payout({ id: 2, net_amount: 45_000 }),
      payout({ id: 3, status: "paid", net_amount: 500_000 }),
    ];
    expect(totalOwed(list)).toBe(135_000);
  });

  it("owes nothing when there are no payouts", () => {
    expect(totalOwed([])).toBe(0);
  });
});
