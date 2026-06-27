// src/store/slices/properties.test.ts
// Property-based store invariants (fast-check):
//   - addItem N ครั้ง → items.length เพิ่ม N
//   - openModal* → closeModal* → activeModal ย้อนกลับตาม stack (LIFO)
//   - undo* → redo* → state เท่าเดิม (zundo round-trip)

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { useAppStore } from '@/store/useAppStore';
import type { ModalType } from '@/store/slices/ModalSlice';
import { asItemData, makeCurtain } from '@/test/factories';

const RUN = { numRuns: 100, seed: 42 } as const;
const store = () => useAppStore.getState();
const temporal = () => useAppStore.temporal.getState();

// modal ที่ไม่รับ props ผ่าน store → openModal(type) อย่างเดียว
const NO_PROP_MODALS: ModalType[] = [
  'costDashboard',
  'customer',
  'pdf',
  'shopSettings',
  'discount',
  'data',
  'lookbook',
  'mainMenu',
  'productionSettings',
  'formulaDocs',
];

describe('ProjectSlice — property invariants', () => {
  it('forall N → addItem N ครั้งทำให้ items.length เพิ่มขึ้น N', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 30 }), (n) => {
        useAppStore.setState({ rooms: [] });
        store().addRoom('A');
        const roomId = store().rooms[0].id;
        for (let i = 0; i < n; i++) {
          store().addItem(roomId, asItemData(makeCurtain()));
        }
        expect(store().rooms[0].items).toHaveLength(n);
      }),
      RUN
    );
  });
});

describe('ModalSlice — modal stack invariant', () => {
  it('forall distinct modal sequence → closeModal ย้อนกลับ activeModal ทีละชั้นจน null', () => {
    const open = store().openModal as (t: ModalType) => void;
    fc.assert(
      fc.property(fc.shuffledSubarray(NO_PROP_MODALS, { minLength: 1 }), (types) => {
        useAppStore.setState({ activeModal: null, modalProps: undefined, modalStack: [] });

        types.forEach((t) => open(t));
        // เปิดครบ → activeModal = ตัวสุดท้าย
        expect(store().activeModal).toBe(types[types.length - 1]);

        // ปิดทีละชั้น → ย้อนกลับตามลำดับ
        for (let i = types.length - 1; i >= 0; i--) {
          expect(store().activeModal).toBe(types[i]);
          store().closeModal();
        }
        expect(store().activeModal).toBeNull();
        expect(store().modalStack).toHaveLength(0);
      }),
      RUN
    );
  });
});

describe('zundo — undo/redo round-trip invariant', () => {
  it('forall N addRoom → undo×N กลับว่าง, redo×N ได้ state เดิมเป๊ะ', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 8 }), (n) => {
        useAppStore.setState({ rooms: [] });
        temporal().clear();

        for (let i = 0; i < n; i++) store().addRoom(`R${i}`);
        const snapshot = JSON.stringify(store().rooms);
        expect(store().rooms).toHaveLength(n);

        for (let i = 0; i < n; i++) temporal().undo();
        expect(store().rooms).toHaveLength(0);

        for (let i = 0; i < n; i++) temporal().redo();
        expect(JSON.stringify(store().rooms)).toBe(snapshot);
      }),
      RUN
    );
  });
});
