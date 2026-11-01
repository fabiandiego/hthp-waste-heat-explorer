/** Offset between Celsius and Kelvin used throughout the paper. */
export const KELVIN_OFFSET = 273.15;

export function toK(tC: number): number {
  return tC + KELVIN_OFFSET;
}

export function toC(TK: number): number {
  return TK - KELVIN_OFFSET;
}

/**
 * Entropic (logarithmic) mean temperature of a stream changing from tIn to tOut
 * at constant c_p, in kelvin: (T_in - T_out) / ln(T_in / T_out).
 * Paper Eqs. 4, 12, 13, 19. Returns the limit T_in for zero glide.
 */
export function logMeanT(tInC: number, tOutC: number): number {
  const a = toK(tInC);
  const b = toK(tOutC);
  if (Math.abs(a - b) < 1e-9) return a;
  return (a - b) / Math.log(a / b);
}
