// src/test/a11y.test.ts
// Accessibility (axe-core) บน critical modals — render → axe → ไม่มี violation
// หมายเหตุ: ปิด color-contrast (jsdom ไม่มี layout/สีจริง คำนวณไม่ได้) → เช็คบน E2E แทน
// Modal ใช้ Headless UI Dialog (center variant บน jsdom) ซึ่ง render เข้า portal ที่ document.body
// จึงรัน axe บน document.body ไม่ใช่ container

import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { createElement } from 'react';
import { axe } from 'vitest-axe';

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

import { DiscountModal } from '@/components/modals/DiscountModal';
import { MainMenuModal } from '@/components/modals/MainMenuModal';

const AXE_OPTS = {
  rules: {
    'color-contrast': { enabled: false }, // jsdom ไม่มีสี/layout จริง
  },
};

const checkNoViolations = async () => {
  const results = await axe(document.body, AXE_OPTS);
  // assert ตรงๆ บน violations (เลี่ยง custom matcher) — แสดง rule id ที่ fail ชัดเจน
  const ids = (results.violations as { id: string }[]).map((v) => v.id);
  expect(ids).toEqual([]);
};

const mainMenuProps = {
  isOpen: true,
  onClose: vi.fn(),
  onOpenPdf: vi.fn(),
  onOpenLookbook: vi.fn(),
  onOpenCustomer: vi.fn(),
  onOpenShopSettings: vi.fn(),
  onOpenDiscount: vi.fn(),
  onOpenData: vi.fn(),
  onOpenProductionSettings: vi.fn(),
  onOpenCostDashboard: vi.fn(),
  onOpenFormulaDocs: vi.fn(),
  onOpenMaterialSummary: vi.fn(),
};

describe('a11y — DiscountModal', () => {
  it('ไม่มี accessibility violation', async () => {
    render(createElement(DiscountModal, { isOpen: true, onClose: vi.fn() }));
    await checkNoViolations();
  });
});

describe('a11y — MainMenuModal', () => {
  it('ไม่มี accessibility violation', async () => {
    render(createElement(MainMenuModal, mainMenuProps));
    await checkNoViolations();
  });
});
