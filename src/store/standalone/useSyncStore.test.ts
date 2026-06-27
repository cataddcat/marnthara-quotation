// src/store/standalone/useSyncStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useSyncStore } from '@/store/standalone/useSyncStore';

const reset = () =>
  useSyncStore.setState({
    active: false,
    online: true,
    fromCache: false,
    pending: 0,
    lastSyncedAt: null,
    status: 'disabled',
  });

const s = () => useSyncStore.getState();

describe('useSyncStore — สถานะซิงค์', () => {
  beforeEach(reset);

  it('เริ่มต้น = disabled', () => {
    expect(s().status).toBe('disabled');
  });

  it('start + online + server + ไม่มี pending → synced (+ stamp lastSyncedAt)', () => {
    s().start();
    s().setOnline(true);
    s().setSnapshot(false, 0);
    expect(s().status).toBe('synced');
    expect(s().lastSyncedAt).not.toBeNull();
  });

  it('pending > 0 → pending', () => {
    s().start();
    s().setOnline(true);
    s().setSnapshot(false, 3);
    expect(s().status).toBe('pending');
    expect(s().pending).toBe(3);
  });

  it('offline (fromCache) ไม่มี pending → offline', () => {
    s().start();
    s().setOnline(false);
    s().setSnapshot(true, 0);
    expect(s().status).toBe('offline');
  });

  it('fromCache ไม่อัปเดต lastSyncedAt (ยังไม่ถึง server)', () => {
    s().start();
    s().setSnapshot(false, 0); // server
    const t1 = s().lastSyncedAt;
    s().setSnapshot(true, 0); // cache
    expect(s().lastSyncedAt).toBe(t1);
  });

  it('stop → disabled', () => {
    s().start();
    s().setSnapshot(false, 0);
    s().stop();
    expect(s().status).toBe('disabled');
  });
});
