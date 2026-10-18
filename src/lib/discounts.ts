// Shared pure discount rules (browser + server). Account, completed-profile and promo-code percentages add up, capped at 100 %.
export const ACCOUNT_DISCOUNT = 5;
export const PROFILE_DISCOUNT = 5;
export const normalizeCode = (code: string) => code.trim().toUpperCase();
export const codePattern = /^[A-Z0-9_-]{2,40}$/;
export function totalPercent(account: boolean, codePercent: number, profileComplete = false) {
  return Math.min(100, (account ? ACCOUNT_DISCOUNT : 0) + (profileComplete ? PROFILE_DISCOUNT : 0) + Math.max(0, codePercent));
}
export function applyDiscount(total: number | null, percent: number) {
  if (total === null) return null;
  return Math.round(total * (1 - percent / 100) * 100) / 100;
}
