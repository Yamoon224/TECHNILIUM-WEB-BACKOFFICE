import { describe, expect, it } from "vitest";
import { isActive, navFor, shortcutsFor, STAFF_NAV } from "./navigation";

describe("navFor", () => {
  it("gives a vendor-only account just its own space", () => {
    const groups = navFor(["vendeur_tiers"]);

    expect(groups.flatMap((group) => group.items.map((item) => item.href))).toEqual(["/espace-vendeur"]);
    expect(shortcutsFor(["vendeur_tiers"]).map((item) => item.href)).toEqual(["/espace-vendeur"]);
  });

  it("gives staff the whole menu, with no page listed twice", () => {
    const hrefs = navFor(["comptable"]).flatMap((group) => group.items.map((item) => item.href));

    expect(hrefs).toContain("/comptabilite");
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("keeps every former menu page", () => {
    const hrefs = STAFF_NAV.flatMap((group) => group.items.map((item) => item.href));
    const former = [
      "/", "/commandes", "/categories", "/produits", "/offres", "/vendeurs", "/stock", "/achats", "/paiements", "/livraisons",
      "/factures", "/comptabilite", "/reversements", "/retours", "/rapports", "/promotions", "/support", "/avis", "/notifications", "/audit",
    ];

    expect(hrefs.sort()).toEqual([...former].sort());
  });
});

describe("isActive", () => {
  it("matches the page and its sub-pages, the root only exactly", () => {
    expect(isActive("/commandes", "/commandes")).toBe(true);
    expect(isActive("/commandes", "/commandes/12")).toBe(true);
    expect(isActive("/commandes", "/commandesx")).toBe(false);
    expect(isActive("/", "/")).toBe(true);
    expect(isActive("/", "/stock")).toBe(false);
  });
});
