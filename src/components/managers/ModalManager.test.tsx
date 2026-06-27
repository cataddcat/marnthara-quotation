// src/components/managers/ModalManager.test.tsx
// modalPropsAs narrowing (pure) + ModalManager คืน null เมื่อไม่มี modal เปิด
// mock ?worker เพราะ import chain (FinancialDashboard → useCalculations → useAsyncCalculator) แตะ Vite worker import

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';

vi.mock('@/lib/pricing/pricing.worker?worker', () => ({ default: class {} }));

import { ModalManager } from './ModalManager';
import { modalPropsAs } from '@/store/slices/ModalSlice';
import { useAppStore } from '@/store/useAppStore';

describe('modalPropsAs — narrowing', () => {
  it('คืน props เมื่อ activeModal ตรง type', () => {
    expect(modalPropsAs('item', { roomId: 'r1' }, 'item')).toEqual({ roomId: 'r1' });
  });

  it('คืน undefined เมื่อ activeModal ไม่ตรง type', () => {
    expect(modalPropsAs('discount', { roomId: 'r1' }, 'item')).toBeUndefined();
  });

  it('คืน undefined เมื่อ activeModal เป็น null', () => {
    expect(modalPropsAs(null, undefined, 'item')).toBeUndefined();
  });
});

describe('ModalManager', () => {
  beforeEach(() => {
    useAppStore.setState({ activeModal: null, modalProps: undefined, modalStack: [] });
  });

  it('ไม่มี modal เปิด → render เป็น null (ไม่ mount modal ใดๆ)', () => {
    const { container } = render(<ModalManager />);
    expect(container.firstChild).toBeNull();
  });
});
