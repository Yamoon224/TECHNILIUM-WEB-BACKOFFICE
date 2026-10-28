/**
 * The password rule of the API (at least 8 characters, a letter and a digit), checked before
 * sending so the person gets an answer at once. The server remains the authority.
 */
export type PasswordProblem = "short" | "letter" | "digit" | "mismatch";

export function passwordProblem(password: string, confirmation?: string): PasswordProblem | null {
  if (password.length < 8) return "short";
  if (!/[A-Za-zÀ-ÿ]/.test(password)) return "letter";
  if (!/\d/.test(password)) return "digit";
  if (confirmation !== undefined && password !== confirmation) return "mismatch";
  return null;
}
