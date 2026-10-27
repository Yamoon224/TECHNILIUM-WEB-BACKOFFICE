import { describe, expect, it } from "vitest";
import { availableActions, type ReturnStatus } from "./returns";

describe("availableActions", () => {
  it.each<[ReturnStatus, string[]]>([
    ["requested", ["accept", "reject"]],
    ["accepted", ["receive"]],
    ["received", ["refund", "reject"]],
    ["refunded", []],
    ["rejected", []],
  ])("offers the legal actions for %s", (status, expected) => {
    expect(availableActions(status)).toEqual(expected);
  });

  it("never offers a refund before the parcel is received", () => {
    expect(availableActions("requested")).not.toContain("refund");
    expect(availableActions("accepted")).not.toContain("refund");
  });
});
