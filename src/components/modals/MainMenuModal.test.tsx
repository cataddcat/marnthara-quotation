// src/components/modals/MainMenuModal.test.tsx
// MainMenuModal — render เมนู + แต่ละปุ่มเรียก callback ที่ถูกตัว

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MainMenuModal } from './MainMenuModal';

const makeProps = () => ({
  isOpen: true,
  onClose: vi.fn(),
  onOpenJobs: vi.fn(),
  onOpenSignIn: vi.fn(),
  onOpenCustomerDirectory: vi.fn(),
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
    ['งานทั้งหมด', 'ใบเสนอราคา', 'คัดลอกสรุป', 'Lookbook', 'ฐานลูกค้า', 'ลูกค้างานนี้', 'ตั้งค่าร้านค้า', 'จัดการส่วนลด', 'สำรองข้อมูล', 'การเงินของงาน', 'สินค้า & ราคา', 'โครงสร้างต้นทุน', 'อธิบายสูตร'].forEach(
      (label) => expect(screen.getByText(label)).toBeInTheDocument()
    );
  });

  it.each([
    ['งานทั้งหมด', 'onOpenJobs'],
    ['ใบเสนอราคา', 'onOpenPdf'],
    ['คัดลอกสรุป', 'onOpenCopySummary'],
    ['Lookbook', 'onOpenLookbook'],
    ['ฐานลูกค้า', 'onOpenCustomerDirectory'],
    ['ลูกค้างานนี้', 'onOpenCustomer'],
    ['ตั้งค่าร้านค้า', 'onOpenShopSettings'],
    ['จัดการส่วนลด', 'onOpenDiscount'],
    ['สำรองข้อมูล', 'onOpenData'],
    ['การเงินของงาน', 'onOpenCostDashboard'],
    ['สินค้า & ราคา', 'onOpenMaterialSummary'],
    ['โครงสร้างต้นทุน', 'onOpenProductionSettings'],
    ['อธิบายสูตร', 'onOpenFormulaDocs'],
  ] as const)('คลิก "%s" → เรียก %s', (label, handler) => {
    const props = makeProps();
    render(<MainMenuModal {...props} />);
    fireEvent.click(screen.getByText(label));
    expect(props[handler]).toHaveBeenCalledTimes(1);
  });
});
