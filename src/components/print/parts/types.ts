import { ShopConfig, Customer } from '@/types';
import { DocumentType } from '../docTypes';

export interface DocTotals {
  grandTotal: number;
  discountAmount: number;
  vatAmount: number;
  finalTotal: number;
  /** เคาะราคา + ซ่อนรายการ → เอกสารโชว์เฉพาะยอดสุทธิ (ราคาเดียว) */
  hideBreakdown?: boolean;
}

/** Everything a page needs that is constant across the document. */
export interface PrintDocContext {
  shopConfig: ShopConfig;
  customer: Customer;
  docType: DocumentType;
  docId: string;
  showPrices: boolean;
  totals: DocTotals;
}
