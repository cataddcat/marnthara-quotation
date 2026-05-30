// src/components/modals/DiscountModal.test.tsx
// DiscountModal — is_enabled gate, percent vs amount, save payload, VAT toggle
// mock useCalculations เพื่อเลี่ยง Worker + ตรึง grandTotal

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/hooks/useCalculations', () => ({
  useCalculations: () => ({
    grandTotal: 1000,
    discountAmount: 0,
    vatAmount: 0,
    finalTotal: 0,
    netTotal: 0,
    isCalculating: false,
  }),
}));

import { DiscountModal } from './DiscountModal';
import { useAppStore } from '@/store/useAppStore';

const store = () => useAppStore.getState();

beforeEach(() => {
  useAppStore.setState({ discount: { type: 'amount', value: 0, is_enabled: false } });
});

describe('DiscountModal', () => {
  it('เปิด+กรอกค่า แล้วบันทึก → setDiscount amount/enabled + onClose', () => {
    const onClose = vi.fn();
    render(<DiscountModal isOpen onClose={onClose} />);

    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '200' } });
    fireEvent.click(screen.getAllByRole('checkbox')[0]); // enable discount
    fireEvent.click(screen.getByText('บันทึกการตั้งค่า'));

    expect(store().discount).toEqual({ type: 'amount', value: 200, is_enabled: true });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('ไม่เปิด gate → บันทึกได้ค่า is_enabled = false', () => {
    render(<DiscountModal isOpen onClose={vi.fn()} />);
    fireEvent.click(screen.getByText('บันทึกการตั้งค่า'));
    expect(store().discount.is_enabled).toBe(false);
  });

  it('เริ่มจากส่วนลด percent → แสดง "%" และบันทึกคง type percent', () => {
    useAppStore.setState({ discount: { type: 'percent', value: 10, is_enabled: true } });
    render(<DiscountModal isOpen onClose={vi.fn()} />);

    expect(screen.getByText('%')).toBeInTheDocument();
    fireEvent.click(screen.getByText('บันทึกการตั้งค่า'));
    expect(store().discount).toMatchObject({ type: 'percent', value: 10, is_enabled: true });
  });

  it('VAT switch (checkbox ตัวที่ 2) ปิด → baseVatRate = 0', () => {
    useAppStore.setState({ shopConfig: { ...store().shopConfig, baseVatRate: 7 } });
    render(<DiscountModal isOpen onClose={vi.fn()} />);
    const vatSwitch = screen.getAllByRole('checkbox')[1];
    expect((vatSwitch as HTMLInputElement).checked).toBe(true); // ตั้งไว้ 7%
    fireEvent.click(vatSwitch);
    expect(store().shopConfig.baseVatRate).toBe(0);
  });
});
