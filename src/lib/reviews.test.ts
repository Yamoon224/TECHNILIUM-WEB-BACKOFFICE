import { describe, expect, it } from "vitest";
import { canPublish, canReject, pendingCount, stars } from "./reviews";

describe("review moderation helpers", () => {
  it("offers to publish anything not already published, including a rejected review", () => {
    expect(canPublish({ status: "pending" })).toBe(true);
    expect(canPublish({ status: "rejected" })).toBe(true);
    expect(canPublish({ status: "published" })).toBe(false);
  });

  it("offers to reject anything not already rejected, including a published review", () => {
    expect(canReject({ status: "pending" })).toBe(true);
    expect(canReject({ status: "published" })).toBe(true);
    expect(canReject({ status: "rejected" })).toBe(false);
  });

  it("counts the reviews waiting for a decision", () => {
    expect(pendingCount([{ status: "pending" }, { status: "published" }, { status: "pending" }, { status: "rejected" }])).toBe(2);
    expect(pendingCount([])).toBe(0);
  });

  it("draws stars", () => {
    expect(stars(3)).toBe("★★★☆☆");
  });
});
