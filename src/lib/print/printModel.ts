// src/lib/print/printModel.ts
//
// Shared, render-agnostic print model. Extracted from PrintDocument so the
// measurement pass, the paginator, and the page renderer all agree on exactly
// the same rows + amounts (single source of truth — see the print pagination plan).

import { ItemData, Room } from '@/types';
import { PricingEngine } from '@/lib/pricing/PricingEngine';
import { ITEM_CONFIG } from '@/config/constants';
import { isCurtainItem, isWallpaperItem, isRemovalItem, isAreaItem } from '@/lib/type-guards';
import { fmtDimension } from '@/utils/formatters';

export interface ItemGroup {
  item: ItemData;
  count: number;
  unitPrice: number;
  totalPrice: number;
}

/**
 * Collapse identical items in a room into a single priced row (moved verbatim
 * from PrintDocument). Suspended items are skipped, matching pricing totals.
 */
export const groupItems = (items: ItemData[]): ItemGroup[] => {
  const groups: ItemGroup[] = [];
  items.forEach((item) => {
    if (item.is_suspended) return;

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

/** A single rendered line on the document (one grouped item). */
export interface PrintItemRow {
  itemName: string;
  details: string;
  /** Formatted "W × H ม." or '-' when not applicable. */
  dimensions: string;
  notes?: string;
  count: number;
  unitPrice: number;
  /** Line amount (count × unit) — what the carried-forward running sum adds. */
  amount: number;
}

/** Map a grouped item to its display row (type-guard logic moved from PrintDocument). */
export const toItemRow = (group: ItemGroup): PrintItemRow => {
  const { item, count, unitPrice, totalPrice } = group;
  const itemConfig = ITEM_CONFIG[item.type];
  let itemName = itemConfig ? itemConfig.name : 'รายการ';
  let details = '';
  let dimensions = '-';

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
    details = item.code ? `รหัส: ${item.code}` : '';
    dimensions = `${fmtDimension(item.width_m)} × ${fmtDimension(item.height_m)} ม.`;
  }

  return {
    itemName,
    details: details.trim(),
    dimensions,
    notes: item.notes,
    count,
    unitPrice,
    amount: totalPrice,
  };
};

/**
 * Flat, ordered sequence of blocks that the paginator measures and packs.
 * A `room` block is a section header; an `item` block is one priced line.
 */
export type PrintBlock =
  | { kind: 'room'; key: string; no: number; name: string }
  | { kind: 'item'; key: string; seq: string; row: PrintItemRow };

/**
 * Build the block stream from rooms. Room/item numbering preserves the original
 * room array index (parity with the previous document); rooms whose items are
 * all suspended/empty are skipped so no orphan header is emitted.
 */
export const buildBlocks = (rooms: Room[]): PrintBlock[] => {
  const blocks: PrintBlock[] = [];
  rooms.forEach((room, roomIndex) => {
    if (room.items.length === 0) return;
    const groups = groupItems(room.items);
    if (groups.length === 0) return;

    blocks.push({ kind: 'room', key: room.id, no: roomIndex + 1, name: room.name });
    groups.forEach((group, gi) => {
      blocks.push({
        kind: 'item',
        key: `${room.id}-${gi}`,
        seq: `${roomIndex + 1}.${gi + 1}`,
        row: toItemRow(group),
      });
    });
  });
  return blocks;
};
