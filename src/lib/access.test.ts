import { describe, expect, it } from "vitest";
import { assignableGroups, featuresBySection, nextSwitch, switchFor, toggled, withSwitch, type AccessFeature, type AccessGroup, type AccessSwitch } from "./access";

const feature = (key: string, group: string): AccessFeature => ({ key, label: key, label_en: key, group, group_en: `${group} EN` });

describe("featuresBySection", () => {
  it("gathers the features by section, in the order received", () => {
    const sections = featuresBySection([feature("a", "Ventes"), feature("b", "Finance"), feature("c", "Ventes")]);

    expect(sections.map((section) => section.section)).toEqual(["Ventes", "Finance"]);
    expect(sections[0].features.map((item) => item.key)).toEqual(["a", "c"]);
  });

  it("names the sections in English on request", () => {
    expect(featuresBySection([feature("a", "Ventes")], true)[0].section).toBe("Ventes EN");
  });
});

describe("switchFor and withSwitch", () => {
  const switches: AccessSwitch[] = [{ feature: "manage-orders", subject_type: "role", subject: "comptable", enabled: false }];

  it("finds the switch of a group or a user, null when none", () => {
    expect(switchFor(switches, "manage-orders", "role", "comptable")).toBe(false);
    expect(switchFor(switches, "manage-orders", "user", "comptable")).toBeNull();
    expect(switchFor(switches, "manage-stock", "role", "comptable")).toBeNull();
  });

  it("sets, replaces and clears a switch", () => {
    const base = { feature: "manage-orders", subject_type: "role" as const, subject: "comptable" };

    expect(withSwitch(switches, { ...base, enabled: null })).toEqual([]);
    expect(withSwitch(switches, { ...base, enabled: true })).toEqual([{ ...base, enabled: true }]);
    expect(withSwitch([], { ...base, subject: "support", enabled: false })).toHaveLength(1);
  });
});

describe("nextSwitch", () => {
  it("cycles default → off → default for a group", () => {
    expect(nextSwitch(null, "role")).toBe(false);
    expect(nextSwitch(false, "role")).toBeNull();
  });

  it("lets one account be forced on as well", () => {
    expect(nextSwitch(null, "user")).toBe(false);
    expect(nextSwitch(false, "user")).toBe(true);
    expect(nextSwitch(true, "user")).toBeNull();
  });
});

describe("assignableGroups and toggled", () => {
  it("never offers the customer profile for a team account", () => {
    const groups = [{ name: "client" }, { name: "comptable" }] as AccessGroup[];

    expect(assignableGroups(groups).map((group) => group.name)).toEqual(["comptable"]);
  });

  it("adds a missing value and removes a present one", () => {
    expect(toggled(["a"], "b")).toEqual(["a", "b"]);
    expect(toggled(["a", "b"], "a")).toEqual(["b"]);
  });
});
