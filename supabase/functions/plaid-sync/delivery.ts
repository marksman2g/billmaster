// This module is deliberately dependency-free so the delivery boundary can be tested offline.
export function publicDeliveryBatch(row: Record<string, unknown>, moreJournal = false): Record<string, unknown> & { batch_id: string; batch_sequence: number; has_more: boolean } {
  const payload = row.payload && typeof row.payload === "object" && !Array.isArray(row.payload)
    ? row.payload as Record<string, unknown> : {};
  return {
    ...payload,
    batch_id: String(row.batch_id || ""),
    batch_sequence: Number(row.batch_sequence || 0),
    has_more: Boolean(payload.has_more) || moreJournal
  };
}
