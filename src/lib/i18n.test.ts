import { describe, expect, it } from "vitest";
import { ORDER_STATUSES } from "./orderStatus";
import { translate, type MessageKey } from "./i18n";

describe("translate", () => {
  it("answers in the chosen language", () => {
    expect(translate("fr", "nav.orders")).toBe("Commandes");
    expect(translate("en", "nav.orders")).toBe("Orders");
  });

  it("has an English wording different from the French one for every key that should differ", () => {
    // A copy-pasted French string in the English dictionary is a missed translation.
    const sameOnPurpose: MessageKey[] = ["nav.audit", "nav.notifications", "shell.notifications", "nav.promotions", "nav.stock", "nav.catalog"];
    const keys = [
      "nav.general", "nav.sales", "nav.catalog", "nav.dashboard", "nav.orders", "nav.payments", "nav.invoices",
      "nav.returns", "nav.products", "nav.vendors", "nav.reports", "settings.title", "settings.theme", "settings.language",
      "shell.logout", "settings.reset", "settings.primary",
    ] as MessageKey[];

    for (const key of keys) {
      if (sameOnPurpose.includes(key)) continue;
      expect(translate("en", key), key).not.toBe(translate("fr", key));
    }
  });
});

describe("order statuses", () => {
  it("are translated in both languages", () => {
    for (const status of [...ORDER_STATUSES, "pending"]) {
      const key = `status.${status}` as MessageKey;

      expect(translate("fr", key), key).not.toBe("");
      expect(translate("en", key), key).not.toBe("");
    }

    expect(translate("en", "status.shipped")).toBe("Shipped");
    expect(translate("fr", "status.shipped")).toBe("Expédiée");
  });
});
