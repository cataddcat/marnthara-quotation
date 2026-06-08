import React, { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useCalculations } from '@/hooks/useCalculations';
import { bahttext, fmtDimension } from '@/utils/formatters';
// [CHANGE] Import from new type-guards file
import { isCurtainItem, isWallpaperItem, isRemovalItem, isAreaItem } from '@/lib/type-guards';
import { PricingEngine } from '@/lib/pricing/PricingEngine';
import { ITEM_CONFIG } from '@/config/constants';
import { cn } from '@/lib/utils';
import { ItemData } from '@/types';

export type DocumentType = 'quotation' | 'delivery' | 'receipt';

interface PrintDocumentProps {
  docType: DocumentType;
}

const fmtNum = (num: number) => {
  return num.toLocaleString('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// Move impure logic outside component
const generateDocId = () => {
  const now = new Date();
  const yy = now.getFullYear().toString().slice(-2);
  const mm = (now.getMonth() + 1).toString().padStart(2, '0');
  const rand = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(4, '0');
  return `QT-${yy}${mm}-${rand}`;
};

// Smart Item Grouping
const groupItems = (items: ItemData[]) => {
  const groups: { item: ItemData; count: number; unitPrice: number; totalPrice: number }[] = [];
  items.forEach((item) => {
    if (item.is_suspended) return;

    // [CHANGE] Use PricingEngine instead of CALC
    const unitPrice = PricingEngine.calculatePrice(item);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...propsToCompare } = item;
    const signature = JSON.stringify(propsToCompare);

    const existingGroup = groups.find((g) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _gid, ...gProps } = g.item;
      return JSON.stringify(gProps) === signature;
    });

    if (existingGroup) {
      existingGroup.count += 1;
      existingGroup.totalPrice += unitPrice;
    } else {
      groups.push({ item, count: 1, unitPrice, totalPrice: unitPrice });
    }
  });
  return groups;
};

export const PrintDocument = React.forwardRef<HTMLDivElement, PrintDocumentProps>(
  ({ docType }, ref) => {
    const { shopConfig, customer, rooms } = useAppStore((state) => state);
    const { grandTotal, discountAmount, vatAmount, finalTotal } = useCalculations();

    const isDelivery = docType === 'delivery';
    const showPrices = !isDelivery;

    // Use useState lazy initializer for stable ID generation
    const [docId] = useState(generateDocId);

    const DOC_TITLES: Record<DocumentType, string> = {
      quotation: 'ใบเสนอราคา (QUOTATION)',
      delivery: 'ใบส่งของ / ใบส่งมอบงาน (DELIVERY NOTE)',
      receipt: 'ใบเสร็จรับเงิน (RECEIPT)',
    };

    const printStyles = `
      /* The table's identity row is print-only (keeps the on-screen preview clean);
         it lives in <thead>, so table-header-group repeats it on every printed page. */
      .print-row { display: none; }
      @page { size: A4; margin: 12mm 15mm; }
      @media print {
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        html, body { height: auto !important; overflow: visible !important; }
        #root { display: block !important; }
        thead { display: table-header-group; }
        tfoot { display: table-footer-group; }
        tr { break-inside: avoid; page-break-inside: avoid; }
        .room-header { break-after: avoid; page-break-after: avoid; }
        .no-print { display: none !important; }
        .print-row { display: table-row !important; }

        /* Let the sheet flow into the @page box instead of forcing a fixed
           210x297mm frame (which overflowed the 180x277mm printable area and
           spilled a phantom second page). @page owns the margins now. */
        .print-sheet {
          width: auto !important;
          min-height: 0 !important;
          padding: 0 !important;
          margin: 0 !important;
        }
      }
    `;

    // Logic: Site Address
    const showSite = customer.showInstallationAddress !== false;
    const isSameAddr = customer.useSameAddress !== false;
    const siteAddressDisplay = isSameAddr
      ? '(สถานที่ติดตั้งเดียวกับที่อยู่ลูกค้า)'
      : customer.installationAddress || '-';

    return (
      <div ref={ref} className="bg-white text-slate-900 font-sans leading-normal text-[12px]">
        <style>{printStyles}</style>

        {/* A4 Wrapper — fixed-sheet sizing is for the on-screen preview only;
            print resets `.print-sheet` to flow into the @page box (see printStyles). */}
        <div className="print-sheet w-[210mm] min-h-[297mm] px-[10mm] py-[10mm] mx-auto flex flex-col bg-white">
          {/* --- HEADER --- */}
          <header className="flex justify-between items-start border-b-2 border-slate-800 pb-3 mb-3">
            <div className="flex gap-4 items-start">
              {shopConfig.logoUrl ? (
                <img
                  src={shopConfig.logoUrl}
                  alt="Logo"
                  className="w-[80px] h-[80px] object-contain border border-slate-100 rounded"
                />
              ) : (
                <div className="w-[80px] h-[80px] bg-slate-100 flex items-center justify-center text-slate-300 font-bold rounded">
                  LOGO
                </div>
              )}
              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  {shopConfig.name || 'ชื่อร้านค้า'}
                </h1>
                <div className="text-slate-600 whitespace-pre-line mt-1 leading-tight">
                  {shopConfig.address}
                </div>
                <div className="text-slate-600 mt-2">
                  <span className="font-bold">โทร:</span> {shopConfig.phone}
                  {shopConfig.taxId && (
                    <span className="ml-3">
                      <span className="font-bold">เลขผู้เสียภาษี:</span> {shopConfig.taxId}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="text-right">
              <div
                className={cn(
                  'inline-block px-4 py-1.5 text-sm font-bold rounded border mb-3',
                  isDelivery
                    ? 'bg-slate-100 border-slate-300'
                    : 'bg-slate-900 text-white border-slate-900'
                )}
              >
                {DOC_TITLES[docType]}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-end items-center gap-2">
                  <span className="font-bold text-slate-500">เลขที่:</span>
                  <span className="font-mono font-bold text-base">{docId}</span>
                </div>
                <div className="flex justify-end items-center gap-2">
                  <span className="font-bold text-slate-500">วันที่:</span>
                  <div className="w-[100px] border-b border-slate-400 h-5"></div>
                </div>
              </div>
            </div>
          </header>

          {/* --- CUSTOMER INFO --- */}
          <section className="mb-3 border border-slate-300 rounded-xl flex overflow-hidden bg-white">
            {/* Left: Customer Info */}
            <div className={cn('p-3', showSite ? 'flex-[1.2]' : 'flex-1')}>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded">
                  ข้อมูลลูกค้า (Customer)
                </h3>
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="grid grid-cols-[80px_1fr] gap-2">
                  <span className="text-slate-500 font-medium">ชื่อลูกค้า:</span>
                  <span className="font-bold text-slate-900 text-[13px]">
                    {customer.name || '-'}
                  </span>
                </div>
                <div className="grid grid-cols-[80px_1fr] gap-2">
                  <span className="text-slate-500 font-medium">ที่อยู่:</span>
                  <span className="text-slate-800 leading-snug">{customer.address || '-'}</span>
                </div>
                <div className="grid grid-cols-[80px_1fr] gap-2">
                  <span className="text-slate-500 font-medium">เบอร์โทร:</span>
                  <div className="flex gap-4">
                    <span className="font-mono text-slate-800">{customer.phone || '-'}</span>
                    {customer.taxId && (
                      <span className="text-slate-600">
                        <span className="font-medium text-slate-500 mr-1">Tax ID:</span>
                        {customer.taxId}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Site Info */}
            {showSite && (
              <>
                <div className="w-px bg-slate-200 my-3"></div>
                <div className="flex-1 p-3 bg-slate-50/30">
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded">
                      สถานที่ติดตั้ง (Site Location)
                    </h3>
                  </div>
                  <div
                    className={cn(
                      'text-sm leading-relaxed',
                      isSameAddr ? 'text-slate-400 italic' : 'text-slate-700'
                    )}
                  >
                    {siteAddressDisplay}
                  </div>
                </div>
              </>
            )}
          </section>

          {/* --- TABLE --- */}
          <div className="flex-1">
            <table className="w-full border border-slate-300 border-collapse">
              <thead>
                {/* Print-only identity row — repeats on every page (table-header-group)
                    so continuation pages carry the shop / doc / number. */}
                <tr className="print-row border-b border-slate-300">
                  <th
                    colSpan={showPrices ? 5 : 4}
                    className="px-2 py-1.5 border-b border-slate-300"
                  >
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="font-bold text-slate-900">
                        {shopConfig.name || 'ชื่อร้านค้า'}
                      </span>
                      <span className="text-slate-600 font-normal">
                        {DOC_TITLES[docType]} · เลขที่ {docId}
                      </span>
                    </div>
                  </th>
                </tr>
                <tr className="bg-slate-100 text-slate-900 text-xs border-b border-slate-300">
                  <th className="py-2 w-[45px] text-center font-bold border-r border-slate-300">
                    ลำดับ
                  </th>
                  <th className="py-2 px-2 text-left font-bold border-r border-slate-300">
                    รายการสินค้า (Description)
                  </th>
                  <th className="py-2 px-2 w-[60px] text-center font-bold border-r border-slate-300">
                    จำนวน
                  </th>
                  {showPrices ? (
                    <>
                      <th className="py-2 px-2 w-[112px] text-right font-bold border-r border-slate-300">
                        ราคา/หน่วย
                      </th>
                      <th className="py-2 pr-2 w-[120px] text-right font-bold">จำนวนเงิน</th>
                    </>
                  ) : (
                    <th className="py-2 px-2 w-[150px] text-center font-bold">หมายเหตุ</th>
                  )}
                </tr>
              </thead>

              {rooms.map((room, roomIndex) => {
                if (room.items.length === 0) return null;
                const groupedItems = groupItems(room.items);

                return (
                  <tbody key={room.id} className="border-b border-slate-300 last:border-0">
                    <tr className="bg-slate-50/80 room-header border-b border-slate-300">
                      <td className="py-1.5 px-1 text-center font-bold text-slate-600 border-r border-slate-300 bg-slate-100">
                        {roomIndex + 1}
                      </td>
                      <td
                        colSpan={showPrices ? 4 : 3}
                        className="py-1.5 px-2 font-bold text-slate-900"
                      >
                        🏠 {room.name}
                      </td>
                    </tr>
                    {groupedItems.map((group, groupIndex) => {
                      const { item, count, unitPrice, totalPrice } = group;
                      const itemConfig = ITEM_CONFIG[item.type];
                      let itemName = itemConfig ? itemConfig.name : 'รายการ';
                      let details = '';
                      let dimensions = '';

                      // [SAFE REF] Using Type Guards for Strict Safety
                      if (isCurtainItem(item)) {
                        itemName = 'ผ้าม่าน';
                        details = `${item.style || '-'} (${item.fabric_variant || '-'}) ${
                          item.code ? `รหัส: ${item.code}` : ''
                        }`;
                        dimensions = `${fmtDimension(item.width_m)} × ${fmtDimension(item.height_m)} ม.`;
                      } else if (isWallpaperItem(item)) {
                        itemName = 'วอลล์เปเปอร์';
                        details = item.wallpaper_code ? `Code: ${item.wallpaper_code}` : '';
                        dimensions = '-';
                      } else if (isRemovalItem(item)) {
                        itemName = 'งานรื้อถอน/อื่นๆ';
                        details = item.description || '';
                        dimensions = '-';
                      } else if (isAreaItem(item)) {
                        // All blinds, partitions, screens
                        details = item.code ? `รหัส: ${item.code}` : '';
                        dimensions = `${fmtDimension(item.width_m)} × ${fmtDimension(item.height_m)} ม.`;
                      }

                      return (
                        <tr
                          key={groupIndex}
                          className="border-b border-slate-200 text-xs even:bg-slate-50 hover:bg-slate-100/50"
                        >
                          <td className="py-2 px-1 text-center text-slate-500 align-top border-r border-slate-300">
                            {roomIndex + 1}.{groupIndex + 1}
                          </td>
                          <td className="py-2 px-2 align-top border-r border-slate-300">
                            <div className="font-bold text-slate-800 text-[13px]">{itemName}</div>
                            <div className="text-slate-600">{details}</div>
                            {dimensions !== '-' && (
                              <div className="text-slate-500 font-mono mt-0.5 text-[12px]">
                                {dimensions}
                              </div>
                            )}
                            {item.notes && (
                              <div className="text-[12px] text-red-500 mt-0.5">* {item.notes}</div>
                            )}
                          </td>
                          <td className="py-2 px-2 text-center align-top font-mono text-slate-900 border-r border-slate-300 font-bold text-[13px]">
                            {count}
                          </td>
                          {showPrices ? (
                            <>
                              <td className="py-2 px-2 text-right align-top font-mono text-slate-700 border-r border-slate-300 text-[13px]">
                                {fmtNum(unitPrice)}
                              </td>
                              <td className="py-2 pr-2 text-right align-top font-mono font-bold text-slate-900 text-[13px]">
                                {fmtNum(totalPrice)}
                              </td>
                            </>
                          ) : (
                            <td className="py-2 px-2 text-center align-top text-slate-400">-</td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                );
              })}
            </table>
          </div>

          {/* --- FOOTER SUMMARY --- */}
          <div className="mt-4 break-inside-avoid page-break-inside-avoid">
            <div className="flex items-start border-t-2 border-slate-800 pt-3 gap-6">
              <div className="flex-1">
                {showPrices && (
                  <div className="bg-slate-100 p-2 rounded mb-2 text-center border border-slate-200">
                    <span className="text-[12px] text-slate-500 block uppercase tracking-wider mb-1">
                      จำนวนเงินตัวอักษร
                    </span>
                    <span className="font-bold text-slate-800 text-sm">{bahttext(finalTotal)}</span>
                  </div>
                )}
                <div className="text-[12px] text-slate-600 space-y-1">
                  <div className="font-bold text-slate-800 text-xs">เงื่อนไข / หมายเหตุ:</div>
                  <ul className="list-disc list-inside pl-1">
                    {shopConfig.pdf?.priceValidity && (
                      <li>ยืนยันราคาภายใน {shopConfig.pdf.priceValidity}</li>
                    )}
                    {shopConfig.pdf?.paymentTerms && <li>{shopConfig.pdf.paymentTerms}</li>}
                    {/* Dynamic Notes */}
                    {shopConfig.pdf?.notes?.map(
                      (note, i) => note.trim() && <li key={i}>{note}</li>
                    )}
                  </ul>

                  {/* BANK ACCOUNT DISPLAY */}
                  {shopConfig.bankAccount?.isEnabled !== false &&
                    shopConfig.bankAccount?.accountNumber && (
                      <div className="mt-2 p-2 border border-slate-300 rounded bg-white inline-block min-w-[250px]">
                        <div className="font-bold text-slate-900 mb-1 border-b border-slate-200 pb-1">
                          ชำระเงินผ่านบัญชี
                        </div>
                        <div className="grid grid-cols-[60px_1fr] gap-1">
                          <span className="text-slate-500">ธนาคาร:</span>
                          <span>{shopConfig.bankAccount.bankName}</span>
                          <span className="text-slate-500">ชื่อบัญชี:</span>
                          <span>{shopConfig.bankAccount.accountName}</span>
                          <span className="text-slate-500">เลขที่:</span>
                          <span className="font-mono font-bold text-slate-900 text-[13px]">
                            {shopConfig.bankAccount.accountNumber}
                          </span>
                          {shopConfig.bankAccount.branch && (
                            <>
                              <span className="text-slate-500">สาขา:</span>
                              <span>{shopConfig.bankAccount.branch}</span>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                </div>
              </div>

              {showPrices && (
                <div className="w-[260px] text-sm">
                  <div className="space-y-1 border-b border-slate-300 pb-2 mb-2">
                    <div className="flex justify-between text-slate-600">
                      <span>รวมเป็นเงิน</span>
                      <span className="font-mono font-medium text-[13px]">
                        {fmtNum(grandTotal)}
                      </span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-green-700">
                        <span>ส่วนลด</span>
                        <span className="font-mono font-medium text-[13px]">
                          -{fmtNum(discountAmount)}
                        </span>
                      </div>
                    )}
                    {shopConfig.baseVatRate > 0 && (
                      <>
                        <div className="flex justify-between text-slate-600 text-xs">
                          <span>หลังหักส่วนลด</span>
                          <span className="font-mono">{fmtNum(grandTotal - discountAmount)}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>VAT {shopConfig.baseVatRate}%</span>
                          <span className="font-mono">{fmtNum(vatAmount)}</span>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex justify-between items-center text-black p-3 rounded shadow-sm">
                    <span className="font-bold">ยอดสุทธิ</span>
                    <span className="font-bold text-xl font-mono">{fmtNum(finalTotal)}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-6 mt-6">
              <div className="border border-slate-300 rounded-xl p-3 flex flex-col items-center justify-between min-h-[120px]">
                <div className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  ผู้เสนอราคา / ผู้รับเงิน
                </div>
                <div className="w-full flex flex-col items-center mt-auto">
                  <div className="border-b border-slate-900 w-[160px] h-6 mb-3"></div>
                  <div className="flex gap-1 text-slate-500 text-[12px]">
                    (
                    <div className="w-[140px] text-center relative top-[2px]">
                      ..................................................
                    </div>
                    )
                  </div>
                </div>
                <div className="flex items-center justify-center gap-2 text-[12px] text-slate-500 mt-2">
                  <span>วันที่:</span>
                  <div className="w-8 border-b border-slate-400 h-4"></div>
                  <span>/</span>
                  <div className="w-8 border-b border-slate-400 h-4"></div>
                  <span>/</span>
                  <div className="w-10 border-b border-slate-400 h-4"></div>
                </div>
              </div>
              <div className="border border-slate-300 rounded-xl p-3 flex flex-col items-center justify-between min-h-[120px]">
                <div className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  ผู้อนุมัติสั่งซื้อ / ผู้รับสินค้า
                </div>
                <div className="w-full flex flex-col items-center mt-auto">
                  <div className="border-b border-slate-900 w-[160px] h-6 mb-3"></div>
                  <div className="flex gap-1 text-slate-500 text-[12px]">
                    (
                    <div className="w-[140px] text-center relative top-[2px]">
                      ..................................................
                    </div>
                    )
                  </div>
                </div>
                <div className="flex items-center justify-center gap-2 text-[12px] text-slate-500 mt-2">
                  <span>วันที่:</span>
                  <div className="w-8 border-b border-slate-400 h-4"></div>
                  <span>/</span>
                  <div className="w-8 border-b border-slate-400 h-4"></div>
                  <span>/</span>
                  <div className="w-10 border-b border-slate-400 h-4"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);
