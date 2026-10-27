import { describe, expect, it } from "vitest";
import { couponState, describeDiscount, usageLabel, type Coupon } from "./promotions";

const NOW = new Date("2026-10-27T12:00:00Z");

function coupon(overrides: Partial<Coupon>): Coupon {
  return {
    id: 1,
    code: "TEST",
    type: "percent",
    value: 10,
    min_order_amount: 0,
    max_uses: null,
    max_uses_per_customer: null,
    used_count: 0,
    starts_at: null,
    ends_at: null,
    active: true,
    created_at: null,
    ...overrides,
  };
}

describe("couponState", () => {
  it("is active by default", () => {
    expect(couponState(coupon({}), NOW)).toBe("active");
  });

  it("reports a disabled coupon first, whatever its dates", () => {
    expect(couponState(coupon({ active: false, ends_at: "2020-01-01T00:00:00Z" }), NOW)).toBe("inactive");
  });

  it("recognises a scheduled and an expired coupon", () => {
    expect(couponState(coupon({ starts_at: "2026-12-01T00:00:00Z" }), NOW)).toBe("scheduled");
    expect(couponState(coupon({ ends_at: "2026-01-01T00:00:00Z" }), NOW)).toBe("expired");
  });

  it("is exhausted once its uses are all taken", () => {
    expect(couponState(coupon({ max_uses: 5, used_count: 4 }), NOW)).toBe("active");
    expect(couponState(coupon({ max_uses: 5, used_count: 5 }), NOW)).toBe("exhausted");
  });
});

describe("labels", () => {
  it("describes a percentage and a fixed amount", () => {
    expect(describeDiscount({ type: "percent", value: 15 })).toBe("15 %");
    expect(describeDiscount({ type: "fixed", value: 5000 })).toContain("5");
    expect(describeDiscount({ type: "fixed", value: 5000 })).toContain("F CFA");
  });

  it("shows usage against the cap, or infinity when uncapped", () => {
    expect(usageLabel({ used_count: 3, max_uses: 100 })).toBe("3 / 100");
    expect(usageLabel({ used_count: 3, max_uses: null })).toBe("3 / ∞");
  });
});
