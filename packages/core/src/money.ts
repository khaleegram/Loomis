/**
 * Money is stored and transmitted as kobo (minor NGN units) as an integer.
 * UI enters/displays Naira. Never use floats on the wire. (loomis-financial-integrity rule.)
 */

/** Convert a Naira amount entered in the UI to integer kobo for the wire. */
export function nairaToKobo(naira: number): number {
  return Math.round(naira * 100);
}

/** Convert integer kobo from the API to a Naira number for display math. */
export function koboToNaira(kobo: number): number {
  return kobo / 100;
}

const NGN_FORMATTER = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  minimumFractionDigits: 2,
});

/** Format integer kobo as a display string, e.g. 1000000 -> "₦10,000.00". */
export function formatKobo(kobo: number): string {
  return NGN_FORMATTER.format(koboToNaira(kobo));
}
