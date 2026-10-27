import { describe, expect, it } from "vitest";
import { canReply, countOpen, statusActions } from "./support";

describe("statusActions", () => {
  it("offers to resolve an active ticket", () => {
    expect(statusActions("open").map((a) => a.target)).toEqual(["resolved"]);
    expect(statusActions("pending_customer").map((a) => a.target)).toEqual(["resolved"]);
  });

  it("offers to reopen or close a resolved ticket", () => {
    expect(statusActions("resolved").map((a) => a.target)).toEqual(["open", "closed"]);
  });

  it("offers nothing on a closed ticket", () => {
    expect(statusActions("closed")).toEqual([]);
  });

  it("never offers a move the backend would refuse", () => {
    // From the backend: open -> {pending_customer, resolved}, pending -> {open, resolved},
    // resolved -> {open, closed}, closed -> {}.
    const legal: Record<string, string[]> = {
      open: ["pending_customer", "resolved"],
      pending_customer: ["open", "resolved"],
      resolved: ["open", "closed"],
      closed: [],
    };
    for (const status of Object.keys(legal) as (keyof typeof legal)[]) {
      for (const action of statusActions(status as never)) {
        expect(legal[status]).toContain(action.target);
      }
    }
  });
});

describe("helpers", () => {
  it("accepts a reply except on a closed ticket", () => {
    expect(canReply("open")).toBe(true);
    expect(canReply("resolved")).toBe(true);
    expect(canReply("closed")).toBe(false);
  });

  it("counts the tickets still to be handled", () => {
    expect(countOpen([{ status: "open" }, { status: "open" }, { status: "pending_customer" }, { status: "closed" }])).toBe(2);
  });
});
