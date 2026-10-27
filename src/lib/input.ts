/**
 * Parses an optional positive whole amount typed by a user.
 * Returns `undefined` for a blank field (= "use the default"), the number
 * for a valid positive integer, and `null` for anything else — so the
 * caller can tell "left empty" from "typed garbage".
 */
export function parseOptionalAmount(raw: string): number | undefined | null {
  const text = raw.trim();
  if (text === "") return undefined;
  if (!/^\d+$/.test(text)) return null;
  const value = Number(text);
  return value >= 1 ? value : null;
}

export interface ReturnItemInput {
  offer_id: number;
  quantity: number;
}

/**
 * Parses "12:2, 15" into [{offer_id: 12, quantity: 2}, {offer_id: 15, quantity: 1}].
 * A blank field is "no articles" (an empty list); anything malformed is null.
 */
export function parseReturnItems(raw: string): ReturnItemInput[] | null {
  const text = raw.trim();
  if (text === "") return [];

  const items: ReturnItemInput[] = [];

  for (const part of text.split(",")) {
    const match = /^\s*(\d+)\s*(?::\s*(\d+)\s*)?$/.exec(part);
    if (!match) return null;

    const offerId = Number(match[1]);
    const quantity = match[2] === undefined ? 1 : Number(match[2]);
    if (offerId < 1 || quantity < 1) return null;

    items.push({ offer_id: offerId, quantity });
  }

  return items;
}
