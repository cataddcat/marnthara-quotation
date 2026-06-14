import { describe, it, expect } from 'vitest';
import { migrateLegacyItem, migrateLegacyState, adoptCurrentJobIntoRegistry } from './migrations';
import { ITEM_TYPES, LAYER_MODES, JOB_STATUS } from '@/config/enums';

type Rec = Record<string, unknown>;
const asRec = (v: unknown): Rec => v as Rec;

describe('migrateLegacyItem', () => {
  it('แปลง type "set" → curtain + map ชื่อฟิลด์เก่า + เดา layer_mode=double จาก "ทึบ&โปร่ง"', () => {
    const out = asRec(
      migrateLegacyItem({
        type: 'set',
        fabric_variant: 'ทึบ&โปร่ง',
        fabric_code: 'YXC-20 สีฟ้า (2.8)',
        sheer_fabric_code: 'S-1',
        track_color: 'ขาว',
        price_per_m_raw: 1200,
        sheer_price_per_m: 1000,
        width_m: 2.75,
        height_m: 2.27,
      })
    );
    expect(out.type).toBe(ITEM_TYPES.CURTAIN);
    expect(out.layer_mode).toBe(LAYER_MODES.DOUBLE);
    expect(out.code).toBe('YXC-20 สีฟ้า (2.8)');
    expect(out.sheer_code).toBe('S-1');
    expect(out.rail_color).toBe('ขาว');
    // ขนาด number → string
    expect(out.width_m).toBe('2.75');
    expect(out.height_m).toBe('2.27');
    // ฟิลด์ราคาเดิมคงไว้
    expect(out.price_per_m_raw).toBe(1200);
  });

  it('layer_mode: "โปร่ง" → sheer, "ทึบ" → main', () => {
    expect(asRec(migrateLegacyItem({ type: 'set', fabric_variant: 'โปร่ง' })).layer_mode).toBe(
      LAYER_MODES.SHEER
    );
    expect(asRec(migrateLegacyItem({ type: 'set', fabric_variant: 'ทึบ' })).layer_mode).toBe(
      LAYER_MODES.MAIN
    );
  });

  it('ไม่ override ค่าที่มีอยู่แล้วใน set (code / layer_mode)', () => {
    const out = asRec(
      migrateLegacyItem({
        type: 'set',
        code: 'KEEP',
        layer_mode: LAYER_MODES.SHEER,
        fabric_variant: 'ทึบ&โปร่ง',
        fabric_code: 'OLD',
      })
    );
    expect(out.code).toBe('KEEP');
    expect(out.layer_mode).toBe(LAYER_MODES.SHEER);
  });

  it('idempotent — รายการ curtain ปัจจุบันไม่ถูกแตะ', () => {
    const cur = { type: 'curtain', code: 'A', layer_mode: 'main', width_m: '2', height_m: '2.5' };
    expect(migrateLegacyItem(cur)).toEqual(cur);
  });

  it('ทนต่อค่าที่ไม่ใช่ object', () => {
    expect(migrateLegacyItem(null)).toBeNull();
    expect(migrateLegacyItem('x')).toBe('x');
  });
});

describe('migrateLegacyState', () => {
  it('เดินทุกห้อง/ทุกรายการ และคงฟิลด์อื่นไว้', () => {
    const out = asRec(
      migrateLegacyState({
        rooms: [
          { id: 'r1', items: [{ type: 'set', fabric_variant: 'ทึบ' }, { type: 'wallpaper' }] },
        ],
        customer: { name: 'x' },
      })
    );
    const rooms = out.rooms as Array<{ items: Rec[] }>;
    expect(rooms[0].items[0].type).toBe(ITEM_TYPES.CURTAIN);
    expect(rooms[0].items[1].type).toBe('wallpaper');
    expect(out.customer).toEqual({ name: 'x' });
  });

  it('ทนต่อ state ที่ไม่มี rooms / เป็น null', () => {
    expect(migrateLegacyState({ customer: {} })).toEqual({ customer: {} });
    expect(migrateLegacyState(null)).toBeNull();
  });
});

describe('migrateShippingDefaults (v4→v5) — เติม key ค่าขนส่งให้ store เดิม', () => {
  it('serviceCosts ที่ persist ก่อนยุคขนส่ง → เติม shipping_per_job = 0 (คงค่าเดิมครบ)', () => {
    const out = asRec(
      migrateLegacyState({ serviceCosts: { install_point: 350, removal_per_point: 250 } })
    );
    expect(out.serviceCosts).toEqual({
      install_point: 350,
      removal_per_point: 250,
      shipping_per_job: 0,
    });
  });

  it('costInclude 3 key (รุ่นก่อนขนส่ง) → เติม shipping = false (ไม่แตะสวิตช์ที่ผู้ใช้ตั้ง)', () => {
    const out = asRec(
      migrateLegacyState({ costInclude: { labor: false, rail: true, service: true } })
    );
    expect(out.costInclude).toEqual({ labor: false, rail: true, service: true, shipping: false });
  });

  it('idempotent — key มีอยู่แล้วไม่ถูกทับ (อัตราที่ตั้งแล้ว + สวิตช์ที่เปิดแล้วคงเดิม)', () => {
    const state = {
      serviceCosts: { shipping_per_job: 800 },
      costInclude: { labor: true, rail: true, service: true, shipping: true },
    };
    expect(migrateLegacyState(state)).toEqual(state);
  });

  it('ไม่สร้าง object ใหม่เมื่อไม่มีทั้งก้อน (default จาก slice ครบอยู่แล้ว)', () => {
    const out = asRec(migrateLegacyState({ customer: { name: 'x' } }));
    expect(out.serviceCosts).toBeUndefined();
    expect(out.costInclude).toBeUndefined();
  });
});

describe('adoptCurrentJobIntoRegistry (v5→v6) — รับงานที่ค้างอยู่เข้าชั้นวางงาน', () => {
  it('มีงาน live (ชื่อลูกค้า) → jobs 1 ก้อน + currentJobId = customer.id', () => {
    const out = asRec(
      adoptCurrentJobIntoRegistry({
        customer: { id: 'C-1', name: 'สมชาย', code: 'C0007' },
        rooms: [],
        discount: { type: 'amount', value: 0, is_enabled: false },
        receipts: [],
        expenses: [],
      })
    );
    const jobs = out.jobs as Rec[];
    expect(jobs).toHaveLength(1);
    expect(jobs[0].id).toBe('C-1');
    expect(jobs[0].customerCode).toBe('C0007');
    expect(jobs[0].status).toBe(JOB_STATUS.LEAD);
    expect(out.currentJobId).toBe('C-1');
  });

  it('มีห้องแต่ไม่มีชื่อลูกค้า → ยัง adopt (ถือว่ามีเนื้อหา)', () => {
    const out = asRec(
      adoptCurrentJobIntoRegistry({
        customer: {},
        rooms: [{ id: 'r1', name: 'ห้อง', items: [], is_suspended: false }],
      })
    );
    expect(out.jobs as Rec[]).toHaveLength(1);
    expect(out.currentJobId).toBeTruthy();
  });

  it('ไม่มี customer.id → gen id ใหม่ให้ทั้งงานและ customer (ตรงกัน)', () => {
    const out = asRec(adoptCurrentJobIntoRegistry({ customer: { name: 'a' }, rooms: [] }));
    const jobs = out.jobs as Rec[];
    expect(jobs[0].id).toBeTruthy();
    expect((out.customer as Rec).id).toBe(jobs[0].id);
  });

  it('ว่างเปล่า (ไม่มีชื่อ/ไม่มีห้อง) → jobs=[], currentJobId=null', () => {
    const out = asRec(adoptCurrentJobIntoRegistry({ customer: { name: '' }, rooms: [] }));
    expect(out.jobs).toEqual([]);
    expect(out.currentJobId).toBeNull();
  });

  it('มี jobs อยู่แล้ว → ไม่แตะ (idempotent)', () => {
    const existing = { customer: {}, jobs: [{ id: 'x' }], currentJobId: 'x' };
    const out = asRec(adoptCurrentJobIntoRegistry(existing));
    expect(out.jobs).toBe(existing.jobs);
    expect(out.currentJobId).toBe('x');
  });
});
