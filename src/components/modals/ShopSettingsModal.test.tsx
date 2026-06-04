// src/components/modals/ShopSettingsModal.test.tsx
// Regression: หลัง Restore backup (shopConfig เปลี่ยนใน store ระหว่างที่ modal ยัง mount อยู่)
// การเปิด ShopSettingsModal ต้องอ่านค่า "ใหม่" จาก store — ไม่ใช่ค่าเดิมที่ค้างใน local buffer
//
// สาเหตุเดิม: ModalManager ไม่ unmount modal เมื่อสลับผ่าน modalStack ทำให้ useState(shopConfig)
// ของ ShopSettingsModal ถูก seed แค่ครั้งแรก → ค่าโลโก้/ที่อยู่ที่ import มาไม่ขึ้น และถ้ากด "บันทึก"
// จะเขียนทับข้อมูลที่เพิ่ง import ด้วยค่าเดิม ทางแก้: ให้ ModalManager ใส่ key สลับ open/closed
// เพื่อบังคับ remount (เหมือน DiscountModal/FinancialDashboard) — เทสนี้จำลอง key นั้น

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ShopSettingsModal } from './ShopSettingsModal';
import { useAppStore } from '@/store/useAppStore';
import { DEFAULT_SHOP_CONFIG } from '@/config/constants';

const OLD_ADDRESS = 'ที่อยู่เก่า ก่อน import';
const NEW_ADDRESS = 'ที่อยู่ใหม่ จาก backup';

beforeEach(() => {
  useAppStore.setState({
    shopConfig: { ...DEFAULT_SHOP_CONFIG, address: OLD_ADDRESS, logoUrl: '' },
  });
});

describe('ShopSettingsModal — sync หลัง import', () => {
  it('remount (key เปลี่ยน) → อ่าน shopConfig ใหม่จาก store แทนค่าเดิมที่ค้างใน buffer', () => {
    // 1. mount ตอน modal "ปิด" (key='shop-closed') — local buffer ถูก seed ด้วยค่าเก่า
    const { rerender } = render(
      <ShopSettingsModal key="shop-closed" isOpen={false} onClose={() => {}} />
    );

    // 2. จำลอง Restore backup: shopConfig ใน store เปลี่ยนระหว่างที่ modal ยัง mount อยู่
    useAppStore.setState({
      shopConfig: { ...DEFAULT_SHOP_CONFIG, address: NEW_ADDRESS, logoUrl: '' },
    });

    // 3. เปิด modal — ModalManager สลับ key เป็น 'shop-open' → React remount → useState อ่านค่าใหม่
    rerender(<ShopSettingsModal key="shop-open" isOpen onClose={() => {}} />);

    // ที่อยู่ใหม่ที่ import มาต้องแสดง (ไม่ใช่ค่าเก่า)
    expect(screen.getByDisplayValue(NEW_ADDRESS)).toBeInTheDocument();
    expect(screen.queryByDisplayValue(OLD_ADDRESS)).not.toBeInTheDocument();
  });

  it('ค่าเริ่มต้นจาก store ขึ้นถูกต้องเมื่อเปิด', () => {
    render(<ShopSettingsModal key="shop-open" isOpen onClose={() => {}} />);
    expect(screen.getByDisplayValue(OLD_ADDRESS)).toBeInTheDocument();
  });
});
