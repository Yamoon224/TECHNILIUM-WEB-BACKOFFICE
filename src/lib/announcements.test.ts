import { describe, expect, it } from "vitest";
import { matchesAccept } from "@/components/Dropzone";
import { announcementState, fromLocalInput, toLocalInput, type Announcement } from "./announcements";

const base: Announcement = {
  id: 1,
  title: "Soldes",
  image_url: "x.jpg",
  link_url: null,
  width: 600,
  height: 400,
  delay_seconds: 3,
  max_displays: null,
  starts_at: null,
  ends_at: null,
  is_active: true,
  archived_at: null,
};
const now = new Date("2026-11-05T12:00:00Z");

describe("announcementState", () => {
  it("is active without a period", () => {
    expect(announcementState(base, now)).toBe("active");
  });

  it("is scheduled before its start and expired after its end", () => {
    expect(announcementState({ ...base, starts_at: "2026-11-06T00:00:00Z" }, now)).toBe("scheduled");
    expect(announcementState({ ...base, ends_at: "2026-11-05T11:00:00Z" }, now)).toBe("expired");
    expect(announcementState({ ...base, starts_at: "2026-11-01T00:00:00Z", ends_at: "2026-11-10T00:00:00Z" }, now)).toBe("active");
  });

  it("is archived whatever else it is", () => {
    expect(announcementState({ ...base, archived_at: "2026-11-04T00:00:00Z" }, now)).toBe("archived");
    expect(announcementState({ ...base, archived_at: "2026-11-04T00:00:00Z", is_active: false }, now)).toBe("archived");
  });

  it("is inactive when switched off, whatever the period", () => {
    expect(announcementState({ ...base, is_active: false }, now)).toBe("inactive");
  });
});

describe("local date inputs", () => {
  it("round-trips an instant through a datetime-local value", () => {
    const iso = "2026-11-05T12:30:00.000Z";
    expect(fromLocalInput(toLocalInput(iso))).toBe(iso);
  });

  it("keeps empty values empty", () => {
    expect(toLocalInput(null)).toBe("");
    expect(fromLocalInput("")).toBe("");
  });
});

describe("matchesAccept", () => {
  it("accepts every file without a rule", () => {
    expect(matchesAccept({ name: "a.bin", type: "" }, undefined)).toBe(true);
  });

  it("matches MIME types, wildcards and extensions", () => {
    expect(matchesAccept({ name: "a.png", type: "image/png" }, "image/png,image/jpeg")).toBe(true);
    expect(matchesAccept({ name: "a.pdf", type: "application/pdf" }, "image/png,image/jpeg")).toBe(false);
    expect(matchesAccept({ name: "a.webp", type: "image/webp" }, "image/*")).toBe(true);
    expect(matchesAccept({ name: "Doc.PDF", type: "" }, ".pdf")).toBe(true);
  });
});
