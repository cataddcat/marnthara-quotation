// src/components/modals/MainMenuModal.test.tsx
// MainMenuModal — render เมนู + แต่ละปุ่มเรียก callback ที่ถูกตัว

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MainMenuModal } from './MainMenuModal';

const makeProps = () => ({
  isOpen: true,
  onClose: vi.fn(),
  onOpenPdf: vi.fn(),
  onOpenCopySummary: vi.fn(),
  onOpenLookbook: vi.fn(),
  onOpenCustomer: vi.fn(),
  onOpenShopSettings: vi.fn(),
  onOpenDiscount: vi.fn(),
  onOpenData: vi.fn(),
  onOpenProductionSettings: vi.fn(),
  onOpenCostDashboard: vi.fn(),
  onOpenFormulaDocs: vi.fn(),
  onOpenMaterialSummary: vi.fn(),
});

describe('MainMenuModal', () => {
  it('render เมนูหลัก + ป้ายเมนูครบ', () => {
    render(<MainMenuModal {...makeProps()} />);
    ['ใบเสนอราคา', 'คัดลอกสรุป (LINE)', 'Lookbook', 'ลูกค้า', 'ตั้งค่าร้าน', 'ส่วนลด', 'สำรองข้อมูล', 'วิเคราะห์กำไร', 'คลังวัสดุ', 'ตั้งค่าต้นทุน', 'อธิบายสูตร'].forEach(
      (label) => expect(screen.getByText(label)).toBeInTheDocument()
    );
  });

  it.each([
    ['ใบเสนอราคา', 'onOpenPdf'],
    ['คัดลอกสรุป (LINE)', 'onOpenCopySummary'],
    ['Lookbook', 'onOpenLookbook'],
    ['ลูกค้า', 'onOpenCustomer'],
    ['ตั้งค่าร้าน', 'onOpenShopSettings'],
    ['ส่วนลด', 'onOpenDiscount'],
    ['สำรองข้อมูล', 'onOpenData'],
    ['วิเคราะห์กำไร', 'onOpenCostDashboard'],
    ['คลังวัสดุ', 'onOpenMaterialSummary'],
    ['ตั้งค่าต้นทุน', 'onOpenProductionSettings'],
    ['อธิบายสูตร', 'onOpenFormulaDocs'],
  ] as const)('คลิก "%s" → เรียก %s', (label, handler) => {
    const props = makeProps();
    render(<MainMenuModal {...props} />);
    fireEvent.click(screen.getByText(label));
    expect(props[handler]).toHaveBeenCalledTimes(1);
  });
});
