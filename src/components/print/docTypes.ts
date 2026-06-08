// Shared document-type constants for the print parts (kept separate from
// PrintDocument to avoid a parts → orchestrator import cycle).

export type DocumentType = 'quotation' | 'delivery' | 'receipt';

export const DOC_TITLES: Record<DocumentType, string> = {
  quotation: 'ใบเสนอราคา (QUOTATION)',
  delivery: 'ใบส่งของ / ใบส่งมอบงาน (DELIVERY NOTE)',
  receipt: 'ใบเสร็จรับเงิน (RECEIPT)',
};
