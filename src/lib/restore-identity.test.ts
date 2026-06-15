// src/lib/restore-identity.test.ts
// resolveRestoreIdentity (ชน/ไม่ชน + เทียบเวลา) · forkBundleId (UUID ใหม่, ฟิลด์อื่นคงเดิม)

import { describe, it, expect } from 'vitest';
import { resolveRestoreIdentity, forkBundleId } from '@/lib/restore-identity';
import { blankJob, BLANK_CUSTOMER, type JobBundle } from '@/lib/job-bundle';
import type { Customer } from '@/types';

const mk = (id: string, updatedAt: string): JobBundle => {
  const b = blankJob();
  b.id = id;
  b.customer = { ...b.customer, id, name: id };
  b.updatedAt = updatedAt;
  return b;
};

describe('resolveRestoreIdentity', () => {
  const jobs = [mk('A', '2026-06-10T00:00:00.000Z'), mk('B', '2026-06-12T00:00:00.000Z')];

  it('ไม่มี incomingId → ไม่ชน', () => {
    expect(resolveRestoreIdentity(undefined, jobs).collides).toBe(false);
  });

  it('id ไม่อยู่ในชั้นวาง → ไม่ชน', () => {
    expect(resolveRestoreIdentity('Z', jobs).collides).toBe(false);
  });

  it('id ตรงกับงานในชั้นวาง → ชน + คืน existing', () => {
    const r = resolveRestoreIdentity('B', jobs);
    expect(r.collides).toBe(true);
    expect(r.existing?.id).toBe('B');
  });

  it('ไฟล์เก่ากว่างานในเครื่อง → incomingOlder=true', () => {
    const r = resolveRestoreIdentity('B', jobs, '2026-06-01T00:00:00.000Z');
    expect(r.incomingOlder).toBe(true);
  });

  it('ไฟล์ใหม่กว่าหรือเท่ากัน → incomingOlder=false', () => {
    const r = resolveRestoreIdentity('B', jobs, '2026-06-20T00:00:00.000Z');
    expect(r.incomingOlder).toBe(false);
  });

  it('ไม่ให้ incomingDate → incomingOlder=undefined (เทียบไม่ได้)', () => {
    expect(resolveRestoreIdentity('B', jobs).incomingOlder).toBeUndefined();
  });
});

describe('forkBundleId', () => {
  it('เปลี่ยนเฉพาะ id (UUID ใหม่) · ฟิลด์อื่นคงเดิม', () => {
    const c: Customer = { ...BLANK_CUSTOMER, id: 'OLD', name: 'สมชาย', phone: '081' };
    const forked = forkBundleId(c);
    expect(forked.id).toBeTruthy();
    expect(forked.id).not.toBe('OLD');
    expect(forked.name).toBe('สมชาย');
    expect(forked.phone).toBe('081');
  });

  it('fork สองครั้ง → id ไม่ซ้ำกัน', () => {
    const c: Customer = { ...BLANK_CUSTOMER, id: 'OLD' };
    expect(forkBundleId(c).id).not.toBe(forkBundleId(c).id);
  });
});
