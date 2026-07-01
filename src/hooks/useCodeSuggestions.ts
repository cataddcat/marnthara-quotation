import { useMemo } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useInventory } from '@/hooks/useInventory';
import { SuggestionItem } from '@/components/ui/CodePickerField';
import { InventoryItem } from '@/store/slices/InventorySlice';
import { collectProjectCodes } from '@/lib/materials/projectCodes';
import { normalizeCode } from '@/lib/codes';
import { fmtTH } from '@/utils/formatters';

/** สตริงค้นหา (lowercase) จากทุก field ที่ผู้ใช้อาจจำได้ — รหัส/แบรนด์/รุ่น/สี/variant/หมายเหตุ */
const buildKeywords = (...parts: (string | undefined)[]): string =>
  parts.filter(Boolean).join(' ').toLowerCase();

/** ชื่อรอง (subtitle) ของรายการ — แบรนด์ · รุ่น · สี (ไม่มี → หมายเหตุ) */
const buildSubtitle = (
  brand?: string,
  model?: string,
  color?: string,
  fallback?: string
): string | undefined => {
  const name = [brand, model, color].filter(Boolean).join(' · ');
  return name || fallback || undefined;
};

const EMPTY_DRAFTS: Record<string, never> = {};

/**
 * ตัวเลือกรหัส (code) สำหรับ CodePickerField ของทุกฟอร์มสินค้า — รวม 3 แหล่งและ dedup ด้วย normalizeCode:
 *   1) แค็ตตาล็อก/คลัง (useInventory: DB เมื่อออนไลน์ / favorites เมื่อออฟไลน์)  ← master, ขึ้นก่อน
 *   2) ฉบับร่างในเครื่อง (materialDrafts) — code + ราคาขายที่กรอกเอง
 *   3) รหัสที่ใช้ในงานปัจจุบัน (derive จาก rooms) — กัน "พิมพ์รหัสเดิมซ้ำที่จุดต่อไป"
 *
 * `data.default_price_per_m` = ราคาขาย → ตัว auto-fill เดิมของแต่ละฟอร์ม
 * (handleSelectFabric / handleWallpaperSelect / handleCodeChange) ทำงานต่อได้โดยไม่ต้องแก้.
 * NB: ใช้สำหรับ "ตัวเลือก" เท่านั้น — การเทียบราคากับคลัง (PriceStatusIndicator) ยังอิง useInventory ตรง ๆ.
 */
export const useCodeSuggestions = (category: string): SuggestionItem<InventoryItem>[] => {
  const { items: catalog } = useInventory(category);
  const drafts = useAppStore((s) => s.materialDrafts[category] || EMPTY_DRAFTS);
  const rooms = useAppStore((s) => s.rooms);

  return useMemo(() => {
    const out: SuggestionItem<InventoryItem>[] = [];
    const seen = new Set<string>();

    // 1) แค็ตตาล็อก/คลัง (master)
    for (const f of catalog) {
      const key = normalizeCode(f.code);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        label: f.code,
        value: f.code,
        desc:
          f.note || (f.default_price_per_m > 0 ? `฿${fmtTH(f.default_price_per_m)}` : undefined),
        data: f,
        source: 'catalog',
        keywords: buildKeywords(f.code, f.brand, f.model, f.color, f.variant, f.note),
        subtitle: buildSubtitle(f.brand, f.model, f.color, f.note),
        price: f.default_price_per_m > 0 ? f.default_price_per_m : undefined,
        cost: f.cost_per_yard > 0 ? f.cost_per_yard : undefined,
      });
    }

    // 2) ฉบับร่างในเครื่อง
    for (const d of Object.values(drafts)) {
      const key = normalizeCode(d.code);
      if (seen.has(key)) continue;
      seen.add(key);
      const price = d.sellPrice ?? 0;
      out.push({
        label: d.code,
        value: d.code,
        desc: price > 0 ? `ในเครื่อง · ฿${fmtTH(price)}` : 'ในเครื่อง',
        data: { id: `draft:${key}`, code: d.code, default_price_per_m: price },
        source: 'draft',
        keywords: buildKeywords(d.code),
        price: price > 0 ? price : undefined,
        cost: d.cost && d.cost > 0 ? d.cost : undefined,
      });
    }

    // 3) รหัสที่ใช้ในงานนี้
    for (const p of collectProjectCodes(rooms, category)) {
      const key = normalizeCode(p.code);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        label: p.code,
        value: p.code,
        desc: p.sellPrice > 0 ? `ใช้ในงานนี้ · ฿${fmtTH(p.sellPrice)}` : 'ใช้ในงานนี้',
        data: { id: `project:${key}`, code: p.code, default_price_per_m: p.sellPrice },
        source: 'project',
        keywords: buildKeywords(p.code),
        price: p.sellPrice > 0 ? p.sellPrice : undefined,
      });
    }

    return out;
  }, [catalog, drafts, rooms, category]);
};
