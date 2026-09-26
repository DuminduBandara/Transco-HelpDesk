/**
 * Auto-generates and validates 6-character Ticket IDs.
 * Rules:
 *  - Total length: exactly 6 characters.
 *  - 1st two characters: Capital letters (A-Z).
 *  - Remaining 4 characters: Numbers (0-9).
 *  - Examples: TK1001, HD4820, IT0042, AB7391.
 */

const UPPERCASE_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function generateTicketId(prefix?: string): string {
  let letterPart = "";
  if (prefix && /^[A-Z]{2}$/i.test(prefix)) {
    letterPart = prefix.toUpperCase();
  } else {
    const l1 = UPPERCASE_LETTERS[Math.floor(Math.random() * UPPERCASE_LETTERS.length)];
    const l2 = UPPERCASE_LETTERS[Math.floor(Math.random() * UPPERCASE_LETTERS.length)];
    letterPart = `${l1}${l2}`;
  }

  const numberPart = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
  return `${letterPart}${numberPart}`;
}

export function isValidTicketId(id: unknown): id is string {
  if (typeof id !== "string") return false;
  return /^[A-Z]{2}\d{4}$/.test(id.trim().toUpperCase());
}
