import { useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useUIStore } from '@/store/useUIStore';
import { useConfirm } from '@/hooks/useConfirm';
import { toNum, fmtTH } from '@/utils/formatters';

export type CatalogSaveAction = 'invalid' | 'noop' | 'add' | 'update';

/**
 * จัดประเภทการบันทึกราคาเข้าคลัง (pure → ทดสอบได้)
 * - invalid : ราคา <= 0
 * - add     : รหัสยังไม่มีในคลัง
 * - noop    : มีอยู่แล้วและราคาตรงกัน
 * - update  : มีอยู่แล้วแต่ราคาต่าง (ต้องยืนยันก่อนทับ)
 */
export const classifyCatalogSave = (
  existingPrice: number | undefined,
  newPrice: number
): CatalogSaveAction => {
  if (newPrice <= 0) return 'invalid';
  if (existingPrice === undefined) return 'add';
  if (Math.abs(existingPrice - newPrice) < 0.01) return 'noop';
  return 'update';
};

/**
 * Hook กลางสำหรับปุ่มดาว "บันทึกเข้าคลัง" — พฤติกรรมเดียวกันทุกฟอร์ม
 * จุดสำคัญ: ถ้ารหัสมีอยู่แล้วและราคาต่าง จะ **ยืนยันก่อนทับเสมอ** (กันเขียนทับราคาคลังโดยไม่ตั้งใจ)
 */
export const useSaveToCatalog = () => {
  const favorites = useAppStore((s) => s.favorites);
  const addFavorite = useAppStore((s) => s.addFavorite);
  const updateFavorite = useAppStore((s) => s.updateFavorite);
  const addToast = useUIStore((s) => s.addToast);
  const { confirm } = useConfirm();

  const isInCatalog = useCallback(
    (category: string, code: string | undefined): boolean =>
      !!code && (favorites[category] || []).some((f) => f.code === code),
    [favorites]
  );

  const saveToCatalog = useCallback(
    async (
      category: string,
      code: string | undefined,
      priceInput: string | number | undefined
    ): Promise<boolean> => {
      const trimmed = (code || '').trim();
      if (!trimmed) {
        addToast('warning', 'ระบุรหัสก่อนบันทึก');
        return false;
      }

      const price = toNum(priceInput);
      const existing = (favorites[category] || []).find((f) => f.code === trimmed);
      const action = classifyCatalogSave(existing?.default_price_per_m, price);

      switch (action) {
        case 'invalid':
          addToast('warning', 'ระบุราคาที่มากกว่า 0');
          return false;

        case 'noop':
          addToast('info', `${trimmed} ตรงกับคลังอยู่แล้ว`);
          return true;

        case 'add':
          addFavorite(category, {
            code: trimmed,
            default_price_per_m: price,
            note: 'บันทึกจากหน้างาน',
          });
          addToast('success', `เพิ่ม ${trimmed} ลงคลังแล้ว`);
          return true;

        case 'update': {
          const ok = await confirm({
            title: `อัปเดตราคา ${trimmed}?`,
            description: `ราคาเดิม ${fmtTH(existing!.default_price_per_m)} → ราคาใหม่ ${fmtTH(price)}`,
            confirmLabel: 'อัปเดต',
            cancelLabel: 'ยกเลิก',
          });
          if (!ok) return false;
          updateFavorite(category, existing!.id, { default_price_per_m: price });
          addToast('success', `อัปเดต ${trimmed} เป็น ${fmtTH(price)} แล้ว`);
          return true;
        }
      }
    },
    [favorites, addFavorite, updateFavorite, addToast, confirm]
  );

  return { saveToCatalog, isInCatalog };
};
