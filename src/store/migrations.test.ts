import { describe, it, expect } from 'vitest';
import { migrateLegacyItem, migrateLegacyState } from './migrations';
import { ITEM_TYPES, LAYER_MODES } from '@/config/enums';

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
