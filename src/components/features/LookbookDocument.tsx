import React from 'react';
import { useAppStore } from '@/store/useAppStore';
import { generateItemVisualSvg } from '@/lib/svgGenerator';
import { fmtDimension } from '@/utils/formatters';
import { ITEM_CONFIG } from '@/config/constants';
import { ITEM_TYPES } from '@/config/enums';
import {
  PrintableItem,
  CurtainItemInput,
  WallpaperItemInput,
  AreaItemInput,
  RemovalItemInput,
} from '@/types';

export const LookbookDocument = React.forwardRef<HTMLDivElement>((_props, ref) => {
  const { shopConfig, rooms } = useAppStore((state) => state);
  const today = new Date().toLocaleDateString('th-TH', { dateStyle: 'long' });

  const renderSvg = (item: PrintableItem) => {
    const svgString = generateItemVisualSvg(item);
    return { __html: svgString };
  };

  return (
    <div
      ref={ref}
      className="w-[210mm] min-h-[297mm] bg-white p-[15mm] mx-auto text-slate-900 relative flex flex-col font-sans"
    >
      {/* Header */}
      <div className="flex justify-between items-center border-b-2 border-slate-800 pb-4 mb-6">
        <div className="flex items-center gap-4">
          {/* Logo ขนาดเล็ก */}
          {shopConfig.logoUrl && (
            <img src={shopConfig.logoUrl} className="h-12 w-auto object-contain" alt="Logo" />
          )}
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{shopConfig.name}</h1>
            <p className="text-xs text-slate-500">Lookbook / รายการสินค้าแนะนำ</p>
          </div>
        </div>

        <div className="text-right text-sm text-slate-500">
          <div>{today}</div>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-2 gap-6 content-start">
        {rooms.map((room) => {
          if (room.items.length === 0) return null;

          return room.items.map((item, idx) => {
            if (item.is_suspended) return null;

            // Prepare Data
            let title: string = ITEM_CONFIG[item.type]?.name || 'สินค้า';
            let dimStr = '';
            const specs: string[] = [];

            // -- 1. Curtain --
            if (item.type === ITEM_TYPES.CURTAIN) {
              const curtainItem = item as unknown as CurtainItemInput;
              title = `${curtainItem.style || 'ผ้าม่าน'} (${curtainItem.fabric_variant})`;
              if (curtainItem.code) specs.push(`ผ้า: ${curtainItem.code}`);
              if (curtainItem.sheer_code) specs.push(`โปร่ง: ${curtainItem.sheer_code}`);
              if (curtainItem.bracket_color) specs.push(`ราง: ${curtainItem.bracket_color}`);
              dimStr = `${fmtDimension(curtainItem.width_m)} x ${fmtDimension(curtainItem.height_m)} ม.`;
            }
            // -- 2. Wallpaper --
            else if (item.type === ITEM_TYPES.WALLPAPER) {
              const wpItem = item as WallpaperItemInput;
              title = 'วอลล์เปเปอร์';
              if (wpItem.wallpaper_code) specs.push(`รหัส: ${wpItem.wallpaper_code}`);
              dimStr = `${wpItem.widths.length} ผนัง (สูง ${fmtDimension(wpItem.height_m)} ม.)`;
            }
            // -- 3. Area Items (Blind, Partition, etc.) --
            else if (
              (
                [
                  ITEM_TYPES.WOODEN_BLIND,
                  ITEM_TYPES.ROLLER_BLIND,
                  ITEM_TYPES.VERTICAL_BLIND,
                  ITEM_TYPES.ALUMINUM_BLIND,
                  ITEM_TYPES.PARTITION,
                  ITEM_TYPES.PLEATED_SCREEN,
                ] as string[]
              ).includes(item.type)
            ) {
              // [FIXED] Added 'as string[]' to fix TS2345 (Type mismatch on .includes)
              const areaItem = item as AreaItemInput;
              if (areaItem.code) specs.push(`รหัส: ${areaItem.code}`);
              dimStr = `${fmtDimension(areaItem.width_m)} x ${fmtDimension(areaItem.height_m)} ม.`;

              if (item.type === ITEM_TYPES.WOODEN_BLIND)
                title = `มู่ลี่${areaItem.fabric_variant || ''}`;
              else if (item.type === ITEM_TYPES.ROLLER_BLIND)
                title = `ม่านม้วน (${areaItem.fabric_variant || ''})`;
              else if (item.type === ITEM_TYPES.PARTITION)
                title = `ฉากกั้นห้อง (${areaItem.opening_style || ''})`;
              else if (item.type === ITEM_TYPES.PLEATED_SCREEN)
                title = `มุ้งจีบ (${areaItem.opening_style || ''})`;

              if (areaItem.adjustment_side) specs.push(areaItem.adjustment_side);
            }
            // -- 4. Removal --
            else if (item.type === ITEM_TYPES.REMOVAL) {
              const removalItem = item as RemovalItemInput;
              title = removalItem.description || 'งานรื้อถอน';
            }

            // Render Card
            return (
              <div
                key={`${room.id}-${item.id}-${idx}`}
                className="border border-slate-200 rounded-lg overflow-hidden flex bg-white break-inside-avoid"
              >
                <div
                  className="w-1/2 bg-slate-50 flex items-center justify-center p-2 min-h-[140px]"
                  dangerouslySetInnerHTML={renderSvg(item)}
                />
                <div className="w-1/2 p-3 flex flex-col relative">
                  <div className="inline-block self-start px-2 py-0.5 bg-slate-100 text-[10px] font-bold text-slate-500 rounded mb-1">
                    🏠 {room.name}
                  </div>
                  <div className="font-bold text-sm text-slate-900 leading-tight mb-1">{title}</div>
                  <div className="text-sm font-mono font-bold text-slate-800 border-b border-dashed border-slate-300 pb-1 mb-2">
                    {dimStr}
                  </div>

                  <ul className="text-xs text-slate-600 space-y-1">
                    {specs.map((s, i) => (
                      <li key={i} className="truncate">
                        • {s}
                      </li>
                    ))}
                  </ul>

                  {item.notes && (
                    <div className="mt-auto pt-1 text-[10px] text-orange-600 line-clamp-2">
                      ⚠ {item.notes}
                    </div>
                  )}
                </div>
              </div>
            );
          });
        })}
      </div>

      <div className="mt-auto pt-8 text-center text-[10px] text-slate-400">
        เอกสารสร้างโดยระบบ Marnthara QOL • หน้า 1/1
      </div>
    </div>
  );
});
