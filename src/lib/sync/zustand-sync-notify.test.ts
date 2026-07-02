// src/lib/sync/zustand-sync-notify.test.ts
// ยึด invariant ที่ syncEngine.hydratePricing พึ่งพา: Zustand notify subscriber
// แบบ synchronous "ภายใน" setState → flag กัน echo (pricingHydrating) ที่เซ็ตก่อน/เคลียร์หลัง
// setState จึงยัง true ตอน subscriber ตรวจ. ถ้า zustand เปลี่ยนเป็น async/batched
// เทสต์นี้จะแดงก่อนที่การกัน echo จะพังเงียบ ๆ ใน production.

import { describe, it, expect } from 'vitest';
import { createStore } from 'zustand/vanilla';

describe('zustand notify invariant (syncEngine กัน echo พึ่งข้อนี้)', () => {
  it('subscriber ถูกเรียก synchronous ภายใน setState (flag ยัง true)', () => {
    const store = createStore<{ n: number }>(() => ({ n: 0 }));

    let flag = false;
    let flagSeenBySubscriber: boolean | null = null;
    store.subscribe(() => {
      flagSeenBySubscriber = flag;
    });

    flag = true;
    store.setState({ n: 1 });
    flag = false;

    expect(flagSeenBySubscriber, 'subscriber ต้องรันระหว่าง setState ไม่ใช่หลัง flag ถูกเคลียร์').toBe(
      true
    );
  });
});
