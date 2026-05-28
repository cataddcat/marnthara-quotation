import { AppState } from '@/store/useAppStore';
import { generateItemVisualSvg } from './svgGenerator';
import { fmtDimension, fmtTH } from '@/utils/formatters';
import { ITEM_CONFIG } from '@/config/constants';
import { ITEM_TYPES } from '@/config/enums';
import { CurtainItemInput, WallpaperItemInput, AreaItemInput, RemovalItemInput } from '@/types';
import { PricingEngine } from '@/lib/pricing/PricingEngine';

export const printLookBook = (state: AppState) => {
  const { shopConfig, customer, rooms } = state;

  const styles = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;600;700&display=swap');
      @media print { @page { size: A4; margin: 1cm; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      body { font-family: 'Sarabun', sans-serif; margin: 0; padding: 0; font-size: 10pt; color: #0f172a; line-height: 1.4; }
      .header { border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
      .shop-name { font-size: 18pt; font-weight: bold; color: #0f172a; }
      .doc-title { font-size: 14pt; font-weight: bold; text-align: right; }
      .grid-container { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
      .card { border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; break-inside: avoid; page-break-inside: avoid; background: #fff; display: flex; flex-direction: row; height: 140px; }
      .card-visual { width: 120px; background: #f8fafc; display: flex; align-items: center; justify-content: center; border-right: 1px solid #e2e8f0; padding: 5px; }
      .card-content { flex: 1; padding: 10px; display: flex; flex-col; justify-content: space-between; }
      .room-badge { display: inline-block; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 8pt; font-weight: bold; margin-bottom: 4px; }
      .item-title { font-weight: bold; font-size: 11pt; color: #0f172a; margin-bottom: 2px; }
      .item-sku { font-size: 9pt; color: #64748b; margin-bottom: 4px; font-family: monospace; }
      .specs-list { margin: 0; padding: 0; list-style: none; font-size: 9pt; color: #334155; }
      .specs-list li { display: inline-block; margin-right: 8px; }
      .specs-list li::before { content: "• "; color: #94a3b8; }
      .price-tag { font-weight: bold; font-size: 10pt; color: #0f172a; text-align: right; margin-top: auto; }
      .footer { margin-top: 30px; border-top: 1px dashed #cbd5e1; padding-top: 10px; text-align: center; font-size: 9pt; color: #64748b; }
    </style>
  `;

  let htmlBody = '';
  let totalAmount = 0;

  rooms.forEach((room) => {
    if (room.items.length === 0) return;

    room.items.forEach((pItem) => {
      if (pItem.is_suspended) return;

      const price = PricingEngine.calculatePrice(pItem);
      totalAmount += price;
      const svg = generateItemVisualSvg(pItem);

      let title: string = ITEM_CONFIG[pItem.type]?.name || 'สินค้า';
      let sku = '';
      let dims: string;

      const specs: string[] = [];

      // --- CURTAIN (Curtains) ---
      if (pItem.type === ITEM_TYPES.CURTAIN) {
        const item = pItem as unknown as CurtainItemInput;
        title = `${item.style || 'ผ้าม่าน'} (${item.fabric_variant})`;
        sku = item.code || '-';
        dims = `${fmtDimension(item.width_m)} x ${fmtDimension(item.height_m)} ม.`;

        if (item.style) specs.push(`สไตล์: ${item.style}`);
        if (item.sheer_code) specs.push(`โปร่ง: ${item.sheer_code}`);
      }
      // --- WALLPAPER ---
      else if (pItem.type === ITEM_TYPES.WALLPAPER) {
        const item = pItem as WallpaperItemInput;
        title = 'วอลล์เปเปอร์';
        sku = item.wallpaper_code || '-';
        dims = `${item.widths.length} ผนัง (สูง ${fmtDimension(item.height_m)} ม.)`;
      }
      // --- REMOVAL ---
      else if (pItem.type === ITEM_TYPES.REMOVAL) {
        const item = pItem as RemovalItemInput;
        title = item.description || 'งานรื้อถอน/ค่าแรง';
        dims = `${item.quantity} จุด`;
      }
      // --- AREA ITEMS (Blinds, Partitions, Screens) ---
      else {
        const item = pItem as AreaItemInput;
        if (pItem.type === ITEM_TYPES.WOODEN_BLIND) title = `มู่ลี่${item.fabric_variant || ''}`;
        else if (pItem.type === ITEM_TYPES.ROLLER_BLIND)
          title = `ม่านม้วน (${item.fabric_variant || ''})`;
        else if (pItem.type === ITEM_TYPES.PARTITION)
          title = `ฉากกั้นห้อง (${item.opening_style || ''})`;
        else if (pItem.type === ITEM_TYPES.PLEATED_SCREEN)
          title = `มุ้งจีบ (${item.opening_style || ''})`;

        sku = item.code || '-';
        dims = `${fmtDimension(item.width_m)} x ${fmtDimension(item.height_m)} ม.`;

        if (item.adjustment_side) specs.push(`${item.adjustment_side}`);
        if (item.opening_style && !title.includes(item.opening_style))
          specs.push(`${item.opening_style}`);
        if (
          item.fabric_variant &&
          (pItem.type === ITEM_TYPES.PARTITION || pItem.type === ITEM_TYPES.PLEATED_SCREEN)
        ) {
          specs.push(`สี: ${item.fabric_variant}`);
        }
      }

      const specsHtml = specs.map((s) => `<li>${s}</li>`).join('');

      htmlBody += `
        <div class="card">
          <div class="card-visual">${svg}</div>
          <div class="card-content">
            <div>
              <span class="room-badge">🏠 ${room.name}</span>
              <div class="item-title">${title}</div>
              <div class="item-sku">SKU: ${sku} | ${dims}</div>
              <ul class="specs-list">${specsHtml}</ul>
              ${pItem.notes ? `<div style="font-size:9pt; color:#ef4444; margin-top:4px;">* ${pItem.notes}</div>` : ''}
            </div>
            <div class="price-tag">${fmtTH(price)}</div>
          </div>
        </div>
      `;
    });
  });

  const printContent = `
    <html>
      <head><title>Lookbook</title>${styles}</head>
      <body>
        <div class="header">
          <div class="shop-name">${shopConfig.name || 'Marnthara'}</div>
          <div class="doc-title">LOOKBOOK / รายการสินค้า</div>
        </div>
        <div style="margin-bottom: 20px;">
          <strong>ลูกค้า:</strong> ${customer.name || '-'} 
          <span style="margin-left: 20px;"><strong>โทร:</strong> ${customer.phone || '-'}</span>
        </div>
        <div class="grid-container">
          ${htmlBody}
        </div>
        <div class="footer">
          รวมมูลค่าสินค้าทั้งหมด: <strong>${fmtTH(totalAmount)}</strong> (ยังไม่รวมส่วนลด/VAT)
        </div>
      </body>
    </html>
  `;

  const windowPrint = window.open('', '', 'width=900,height=800');
  if (windowPrint) {
    windowPrint.document.write(printContent);
    windowPrint.document.close();
    windowPrint.focus();
    setTimeout(() => {
      windowPrint.print();
      windowPrint.close();
    }, 500);
  }
};
