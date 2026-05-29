// src/test/demo-validation.test.ts
// ตรวจว่า JSON files ใน test-data/ มี shape ตรงกับ schemas จริง
// ถ้า refactor schemas แล้ว demo JSON ไม่ตรง → test fail ทันที (ป้องกัน demo rot)

import { describe, it, expect } from 'vitest';

// JSON imports — cast เป็น generic record เพื่อเลี่ยง TypeScript narrowing ที่ขัดแย้งกัน
// JSON ในตัวเองเป็น single source of truth สำหรับ shape
import demoFullRaw from '../../test-data/demo-full-coverage.json';
import demoFavOnlyRaw from '../../test-data/demo-favorites-only.json';
import demoCostsOnlyRaw from '../../test-data/demo-costs-only.json';
import demoMinimalRaw from '../../test-data/demo-minimal.json';

import { CurtainSchema } from '@/features/curtains/schemas';
import { WallpaperSchema } from '@/features/wallpapers/schemas';
import { WoodenBlindsSchema } from '@/features/wooden-blinds/schemas';
import { RollerBlindsSchema } from '@/features/roller-blinds/schemas';
import { VerticalBlindsSchema } from '@/features/vertical-blinds/schemas';
import { PartitionSchema } from '@/features/partition/schemas';
import { PleatedScreenSchema } from '@/features/pleated-screen/schemas';
import { RemovalSchema } from '@/features/removal/schemas';
import { ITEM_TYPES } from '@/config/enums';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;
const demoFull = demoFullRaw as AnyRecord;
const demoFavOnly = demoFavOnlyRaw as AnyRecord;
const demoCostsOnly = demoCostsOnlyRaw as AnyRecord;
const demoMinimal = demoMinimalRaw as AnyRecord;

const schemaForType = (type: string) => {
  switch (type) {
    case ITEM_TYPES.CURTAIN:
      return CurtainSchema;
    case ITEM_TYPES.WALLPAPER:
      return WallpaperSchema;
    case ITEM_TYPES.WOODEN_BLIND:
      return WoodenBlindsSchema;
    case ITEM_TYPES.ROLLER_BLIND:
      return RollerBlindsSchema;
    case ITEM_TYPES.VERTICAL_BLIND:
      return VerticalBlindsSchema;
    case ITEM_TYPES.PARTITION:
      return PartitionSchema;
    case ITEM_TYPES.PLEATED_SCREEN:
      return PleatedScreenSchema;
    case ITEM_TYPES.REMOVAL:
      return RemovalSchema;
    // aluminum_blind: ใช้ AreaItemInput pattern แต่ยังไม่มี schema (HANDOFF flag เป็น tech debt)
    default:
      return null;
  }
};

describe('Demo JSON validation', () => {
  describe('demo-full-coverage.json', () => {
    it('มี top-level fields ครบ', () => {
      expect(demoFull).toHaveProperty('customer');
      expect(demoFull).toHaveProperty('shopConfig');
      expect(demoFull).toHaveProperty('discount');
      expect(demoFull).toHaveProperty('rooms');
      expect(demoFull).toHaveProperty('favorites');
      expect(demoFull).toHaveProperty('production');
    });

    it('Customer มี fields ครบ', () => {
      const c = demoFull.customer;
      expect(c).toHaveProperty('name');
      expect(c).toHaveProperty('phone');
      expect(c).toHaveProperty('address');
      expect(typeof c.useSameAddress).toBe('boolean');
    });

    it('ShopConfig มี baseVatRate = 7 (Thai law) + bankAccount + pdf', () => {
      const s = demoFull.shopConfig;
      expect(s.baseVatRate).toBe(7);
      expect(s.bankAccount).toHaveProperty('isEnabled');
      expect(Array.isArray(s.pdf.notes)).toBe(true);
    });

    it('Discount enabled', () => {
      expect(demoFull.discount.is_enabled).toBe(true);
      expect(demoFull.discount.type).toBe('percent');
    });

    it('มี 5 rooms (รวม suspended)', () => {
      expect(demoFull.rooms).toHaveLength(5);
      const suspendedRoom = demoFull.rooms.find((r: AnyRecord) => r.id === 'room-suspended');
      expect(suspendedRoom?.is_suspended).toBe(true);
    });

    it('ทุก item parse ผ่าน schema ตรงตาม type', () => {
      const errors: string[] = [];
      let totalItems = 0;
      let validated = 0;
      let skipped = 0;

      for (const room of demoFull.rooms as AnyRecord[]) {
        for (const item of room.items as AnyRecord[]) {
          totalItems++;
          const schema = schemaForType(item.type);
          if (!schema) {
            skipped++;
            continue;
          }
          const result = schema.safeParse(item);
          if (!result.success) {
            errors.push(
              `[${room.name} / ${item.id}] (${item.type}): ${result.error.issues
                .map((i) => `${i.path.join('.')}: ${i.message}`)
                .join(', ')}`
            );
          } else {
            validated++;
          }
        }
      }

      if (errors.length > 0) {
        console.error('Schema validation errors:\n' + errors.join('\n'));
      }
      expect(errors).toEqual([]);
      expect(totalItems).toBeGreaterThanOrEqual(15);
      expect(validated + skipped).toBe(totalItems);
    });

    it('มี item ที่ตั้งใจให้ trigger edge cases', () => {
      const allItems = (demoFull.rooms as AnyRecord[]).flatMap(
        (r) => (r.items as AnyRecord[]) ?? []
      );

      // 1. DOUBLE curtain
      const doubleCurtain = allItems.find(
        (i) => i.type === 'curtain' && i.layer_mode === 'double'
      );
      expect(doubleCurtain).toBeDefined();

      // 2. Pro Mode override
      const proMode = allItems.find((i) => i._is_pro_mode === true);
      expect(proMode).toBeDefined();

      // 3. enable_set_price
      const setPrice = allItems.find((i) => i.enable_set_price === true);
      expect(setPrice).toBeDefined();

      // 4. UNKNOWN-CODE
      const unknownCode = allItems.find((i) => i.code === 'UNKNOWN-CODE');
      expect(unknownCode).toBeDefined();

      // 5. Wallpaper height > 10m (height_m เป็น string จาก form input)
      const tallWallpaper = allItems.find(
        (i) => i.type === 'wallpaper' && parseFloat(String(i.height_m)) > 10
      );
      expect(tallWallpaper).toBeDefined();

      // 6. Suspended item ใน active room
      const susItem = allItems.find((i) => i.is_suspended === true);
      expect(susItem).toBeDefined();

      // 7. Removal item
      const removal = allItems.find((i) => i.type === 'removal');
      expect(removal).toBeDefined();
    });

    it('Favorites ครอบทั้ง 9 categories + อย่างน้อย 15 entries', () => {
      const f = demoFull.favorites;
      const categories = [
        'curtain_main',
        'curtain_sheer',
        'wallpaper',
        'wooden_blind',
        'roller_blind',
        'vertical_blind',
        'aluminum_blind',
        'partition',
        'pleated_screen',
      ];
      categories.forEach((cat) => expect(f).toHaveProperty(cat));

      const totalEntries = categories.reduce<number>(
        (sum, cat) => sum + (Array.isArray(f[cat]) ? f[cat].length : 0),
        0
      );
      expect(totalEntries).toBeGreaterThanOrEqual(15);
    });

    it('Production มี labor (7 keys including ผ้าโปร่ง) + accessory + cost vaults', () => {
      const p = demoFull.production;
      expect(Object.keys(p.laborCosts)).toHaveLength(7);
      expect(p.laborCosts).toHaveProperty('ผ้าโปร่ง');

      ['rail_wave', 'rail_pleated', 'rail_eyelet', 'rail_roman', 'rail_rod', 'rail_louis'].forEach(
        (k) => expect(p.accessoryCosts).toHaveProperty(k)
      );

      expect(p).toHaveProperty('fabricCosts');
      expect(p).toHaveProperty('wallpaperCosts');
      expect(p).toHaveProperty('areaCosts');
    });

    it('Fabric codes ใน items มีอยู่ใน fabricCosts (ยกเว้น UNKNOWN-CODE)', () => {
      const allItems = (demoFull.rooms as AnyRecord[]).flatMap(
        (r) => (r.items as AnyRecord[]) ?? []
      );
      const codes = allItems
        .map((i) => i.code)
        .filter((c): c is string => typeof c === 'string' && c.length > 0);

      const missing = codes.filter((c) => !(c in demoFull.production.fabricCosts));
      expect(missing).toEqual(['UNKNOWN-CODE']);
    });
  });

  describe('demo-favorites-only.json', () => {
    it('มีเฉพาะ favorites + ไม่มี rooms/customer', () => {
      expect(demoFavOnly).toHaveProperty('favorites');
      expect(demoFavOnly).not.toHaveProperty('rooms');
      expect(demoFavOnly).not.toHaveProperty('customer');
    });
  });

  describe('demo-costs-only.json', () => {
    it('มีเฉพาะ production + ไม่มี favorites/rooms', () => {
      expect(demoCostsOnly).toHaveProperty('production');
      expect(demoCostsOnly).not.toHaveProperty('rooms');
      expect(demoCostsOnly).not.toHaveProperty('favorites');
    });
  });

  describe('demo-minimal.json', () => {
    it('rooms มี 1 ห้อง items ว่าง + customer.name ว่าง + discount disabled', () => {
      expect(demoMinimal.rooms).toHaveLength(1);
      expect(demoMinimal.rooms[0].items).toHaveLength(0);
      expect(demoMinimal.customer.name).toBe('');
      expect(demoMinimal.discount.is_enabled).toBe(false);
    });
  });
});
