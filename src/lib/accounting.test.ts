import { describe, expect, it } from "vitest";
import { entryTotals, isTrialBalanced, type JournalEntry, type TrialBalance } from "./accounting";

describe("accounting helpers", () => {
  it("sums an entry's debit and credit", () => {
    const entry: JournalEntry = {
      id: 1,
      journal: "VT",
      entry_date: "2026-10-27",
      description: "Facture",
      reference: null,
      currency: "XOF",
      lines: [
        { account: "411", debit: 118, credit: 0 },
        { account: "701", debit: 0, credit: 100 },
        { account: "4431", debit: 0, credit: 18 },
      ],
    };
    expect(entryTotals(entry)).toEqual({ debit: 118, credit: 118 });
  });

  it("flags an unbalanced trial balance", () => {
    const balanced: TrialBalance = { accounts: [], total_debit: 10, total_credit: 10 };
    expect(isTrialBalanced(balanced)).toBe(true);
    expect(isTrialBalanced({ ...balanced, total_credit: 9 })).toBe(false);
  });
});
