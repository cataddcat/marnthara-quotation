// src/components/modals/CustomerModal.test.tsx
// CustomerModal — "รหัสลูกค้า" อ่านอย่างเดียว (รันจาก UUID/ทะเบียน), ฟิลด์อื่นยังแก้ได้

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CustomerModal } from './CustomerModal';
import { useAppStore } from '@/store/useAppStore';
import { BLANK_CUSTOMER } from '@/lib/job-bundle';

const store = () => useAppStore.getState();

beforeEach(() => {
  // id 'abcd1234' → customerToken = 'C' + 'ABCD' = 'CABCD'
  useAppStore.setState({ customer: { ...BLANK_CUSTOMER, id: 'abcd1234', code: '', name: 'X' } });
});

describe('CustomerModal — รหัสลูกค้าอ่านอย่างเดียว', () => {
  it('code ว่าง → โชว์รหัสอัตโนมัติจาก UUID + ป้าย "อัตโนมัติ" และไม่ใช่ช่องกรอก', () => {
    render(<CustomerModal isOpen onClose={vi.fn()} />);
    expect(screen.getByText('รหัสลูกค้า (Customer Code)')).toBeInTheDocument();
    expect(screen.getByText('CABCD')).toBeInTheDocument();
    expect(screen.getByText('อัตโนมัติ')).toBeInTheDocument();
    // อ่านอย่างเดียว = ไม่มี input ที่ถือค่านี้
    expect(screen.queryByDisplayValue('CABCD')).toBeNull();
  });

  it('code มีค่า → โชว์ค่านั้น (ยังอ่านอย่างเดียว)', () => {
    useAppStore.setState({ customer: { ...store().customer, code: 'C0007' } });
    render(<CustomerModal isOpen onClose={vi.fn()} />);
    expect(screen.getByText('C0007')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('C0007')).toBeNull();
  });

  it('ชื่อยังแก้ได้ → setCustomer อัปเดต store', () => {
    render(<CustomerModal isOpen onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/ชื่อลูกค้า/), { target: { value: 'สมชาย ใจดี' } });
    expect(store().customer.name).toBe('สมชาย ใจดี');
  });
});
