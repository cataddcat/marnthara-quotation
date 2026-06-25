// src/components/modals/CustomerDirectoryModal.test.tsx
// CustomerDirectoryModal — มุมมอง "อ่านอย่างเดียว": ไม่มีปุ่มเพิ่ม/นำเข้า/แก้/ลบ/เปิดงาน,
// แตะการ์ดกางเห็นทุกฟิลด์รวม UUID, ค้นหากรองได้

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CustomerDirectoryModal } from './CustomerDirectoryModal';
import { useAppStore } from '@/store/useAppStore';

const CUSTOMERS = [
  {
    id: 'uuid-A',
    code: 'C1',
    name: 'ลูกค้า A',
    phone: '0811111111',
    taxId: 'TX1',
    address: 'addr A',
    installationAddress: '',
    note: 'note A',
    updated_at: '2026-06-20',
  },
  { id: 'uuid-B', code: 'C2', name: 'ลูกค้า B', phone: '0822222222' },
];

beforeEach(() => {
  useAppStore.setState({ customerRegistry: CUSTOMERS });
});

describe('CustomerDirectoryModal — อ่านอย่างเดียว', () => {
  it('title "ฐานข้อมูลลูกค้า" + ไม่มีปุ่มแก้ไข (เพิ่ม/นำเข้า/แก้/ลบ/เปิดงาน)', () => {
    render(<CustomerDirectoryModal isOpen onClose={vi.fn()} />);
    expect(screen.getByText('ฐานข้อมูลลูกค้า')).toBeInTheDocument();
    expect(screen.queryByText('เพิ่มลูกค้า')).toBeNull();
    expect(screen.queryByText('นำเข้า')).toBeNull();
    expect(screen.queryByText('เปิดงานใหม่')).toBeNull();
    expect(screen.queryByLabelText('แก้ไข')).toBeNull();
    expect(screen.queryByLabelText('ลบ')).toBeNull();
  });

  it('แตะการ์ด → กางเห็น UUID + รหัส (read-only)', () => {
    render(<CustomerDirectoryModal isOpen onClose={vi.fn()} />);
    expect(screen.queryByText('uuid-A')).toBeNull(); // ย่ออยู่ตอนเริ่ม
    fireEvent.click(screen.getByRole('button', { name: /ลูกค้า A/ }));
    expect(screen.getByText('uuid-A')).toBeInTheDocument();
    expect(screen.getByText('UUID')).toBeInTheDocument();
    expect(screen.getByText('C1')).toBeInTheDocument(); // dd รหัสลูกค้า (บรรทัดย่อเป็น "C1 · เบอร์")
  });

  it('ค้นหา → กรองรายการ', async () => {
    render(<CustomerDirectoryModal isOpen onClose={vi.fn()} />);
    expect(screen.getByText('ลูกค้า A')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('ค้นชื่อ / รหัส / เบอร์'), {
      target: { value: 'C2' },
    });
    await waitFor(() => expect(screen.queryByText('ลูกค้า A')).toBeNull());
    expect(screen.getByText('ลูกค้า B')).toBeInTheDocument();
  });
});
