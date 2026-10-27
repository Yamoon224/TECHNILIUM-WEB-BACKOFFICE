import { describe, expect, it } from "vitest";
import { canRetry, countByStatus, eventLabel } from "./notifications";

describe("notification helpers", () => {
  it("only offers a retry for a failed message", () => {
    expect(canRetry({ status: "failed" })).toBe(true);
    expect(canRetry({ status: "sent" })).toBe(false);
    expect(canRetry({ status: "pending" })).toBe(false);
  });

  it("counts messages per status", () => {
    expect(countByStatus([{ status: "sent" }, { status: "sent" }, { status: "failed" }])).toEqual({
      pending: 0,
      sent: 2,
      failed: 1,
    });
    expect(countByStatus([])).toEqual({ pending: 0, sent: 0, failed: 0 });
  });

  it("labels known events and falls back to the raw key for new ones", () => {
    expect(eventLabel("order.shipped")).toBe("Commande expédiée");
    expect(eventLabel("order.something_new")).toBe("order.something_new");
  });
});
