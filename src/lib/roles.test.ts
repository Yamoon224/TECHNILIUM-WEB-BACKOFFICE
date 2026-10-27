import { describe, expect, it } from "vitest";
import { isVendorOnly } from "./roles";

describe("isVendorOnly", () => {
  it("is true for a vendor account", () => {
    expect(isVendorOnly(["vendeur_tiers"])).toBe(true);
  });

  it("is false once the account also has a staff role", () => {
    expect(isVendorOnly(["vendeur_tiers", "comptable"])).toBe(false);
  });

  it("is false for staff and for an account without roles", () => {
    expect(isVendorOnly(["administrateur"])).toBe(false);
    expect(isVendorOnly([])).toBe(false);
  });
});
