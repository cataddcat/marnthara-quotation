// src/components/modals/JobsModal.test.tsx
// JobsModal — ปุ่ม "งานใหม่" เป็นไอคอนล้วน, เมนูการ์ด = รายละเอียดลูกค้า/ลบงาน (ไม่มี "ทำสำเนา"),
// กด "รายละเอียดลูกค้า" → สลับงาน (no-op ถ้าปัจจุบัน) + เปิด customer modal

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { JobsModal } from './JobsModal';
import { useAppStore } from '@/store/useAppStore';
import { blankJob } from '@/lib/jobs/job-bundle';

const store = () => useAppStore.getState();

beforeEach(() => {
  const job = blankJob();
  job.customer = { ...job.customer, name: 'ลูกค้า A', code: 'C1' };
  useAppStore.setState({
    jobs: [job],
    currentJobId: job.id,
    customer: job.customer,
    rooms: [],
    discount: job.discount,
    receipts: [],
    expenses: [],
    jobStatus: job.status,
    activeModal: null,
  });
});

describe('JobsModal', () => {
  it('ปุ่ม "งานใหม่" เป็นไอคอนล้วน (aria-label, ไม่มีข้อความ)', () => {
    render(<JobsModal isOpen onClose={vi.fn()} />);
    const btn = screen.getByRole('button', { name: 'งานใหม่' });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveTextContent(''); // ไอคอน Plus อย่างเดียว
  });

  it('เมนู ••• = รายละเอียดลูกค้า + ลบงาน (ไม่มี "ทำสำเนา")', () => {
    render(<JobsModal isOpen onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'ตัวเลือกงาน' }));
    expect(screen.getByText('รายละเอียดลูกค้า')).toBeInTheDocument();
    expect(screen.getByText('ลบงาน')).toBeInTheDocument();
    expect(screen.queryByText('ทำสำเนา')).toBeNull();
  });

  it('กด "รายละเอียดลูกค้า" → เปิด customer modal + เรียก onClose', () => {
    const onClose = vi.fn();
    render(<JobsModal isOpen onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'ตัวเลือกงาน' }));
    fireEvent.click(screen.getByText('รายละเอียดลูกค้า'));
    expect(store().activeModal).toBe('customer');
    expect(onClose).toHaveBeenCalled();
  });
});
