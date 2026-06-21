/** Bottom inset so scroll content clears the floating tab bar. */
export const PARENT_FLOATING_TAB_HEIGHT = 72;
export const PARENT_FLOATING_TAB_MARGIN = 12;

export function parentScrollBottomPadding(safeBottom: number): number {
  return PARENT_FLOATING_TAB_HEIGHT + PARENT_FLOATING_TAB_MARGIN + safeBottom + 16;
}
