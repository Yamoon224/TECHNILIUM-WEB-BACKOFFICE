import { describe, expect, it } from "vitest";
import { buildQuery, describeAction, isFailure, outcomeLabel } from "./audit";

describe("audit helpers", () => {
  it("flags refused and failed requests", () => {
    expect(isFailure({ status: 200 })).toBe(false);
    expect(isFailure({ status: 302 })).toBe(false);
    expect(isFailure({ status: 403 })).toBe(true);
    expect(isFailure({ status: 500 })).toBe(true);
  });

  it("words the outcome", () => {
    expect(outcomeLabel(200)).toBe("Réussi");
    expect(outcomeLabel(403)).toBe("Refusé (droits)");
    expect(outcomeLabel(422)).toBe("Rejeté");
    expect(outcomeLabel(500)).toBe("Erreur serveur");
  });

  it("builds a query without blank filters", () => {
    const query = new URLSearchParams(buildQuery({ user_id: "7", method: "", path: "refund", failed: false }));

    expect(query.get("user_id")).toBe("7");
    expect(query.get("path")).toBe("refund");
    expect(query.has("method")).toBe(false);
    expect(query.has("failed")).toBe(false);
    expect(query.get("per_page")).toBe("100");
  });

  it("sends the failed-only filter as 1", () => {
    expect(new URLSearchParams(buildQuery({ failed: true })).get("failed")).toBe("1");
  });
});

describe("describeAction", () => {
  it("puts the access-management routes in plain words", () => {
    expect(describeAction({ method: "PUT", route: "api/v1/admin/access/switches" })).toBe("Activation ou désactivation d'une fonctionnalité");
    expect(describeAction({ method: "DELETE", route: "api/v1/admin/access/groups/{name}" })).toBe("Suppression d'un groupe d'utilisateurs");
  });

  it("has nothing to say about other routes", () => {
    expect(describeAction({ method: "POST", route: "api/v1/admin/payments" })).toBeNull();
    expect(describeAction({ method: "POST", route: null })).toBeNull();
  });
});
