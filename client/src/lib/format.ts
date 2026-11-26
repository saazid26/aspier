/**
 * Formats a numeric course fee with US locale grouping (e.g. 2000 -> "2,000").
 */
export function formatCourseFee(fee: unknown): string {
  const numeric = Number(fee ?? 0);
  return (Number.isFinite(numeric) && numeric >= 0 ? numeric : 0).toLocaleString('en-US');
}
