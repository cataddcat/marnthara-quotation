// src/lib/jobs/job-bundle.test.ts
// job-bundle — extract/apply round-trip, blankJob, isBundleEmpty, customerFromRegistry

import { describe, it, expect } from 'vitest';
import {
  extractJobBundle,
  bundleToLiveFields,
  blankJob,
  isBundleEmpty,
  customerFromRegistry,
  BLANK_CUSTOMER,
  BLANK_DISCOUNT,
  type JobSource,
} from '@/lib/jobs/job-bundle';
import { DEFAULT_JOB_STATUS, JOB_STATUS } from '@/config/enums';
import type { Customer, Room } from '@/types';

const customer = (over: Partial<Customer> = {}): Customer => ({ ...BLANK_CUSTOMER, ...over });
const room = (id: string): Room => ({ id, name: id, items: [], is_suspended: false });
const source = (over: Partial<JobSource> = {}): JobSource => ({
  customer: customer(),
  rooms: [],
  discount: { ...BLANK_DISCOUNT },
  receipts: [],
  expenses: [],
  jobStatus: DEFAULT_JOB_STATUS,
  ...over,
});

describe('extractJobBundle', () => {
  it('id=customer.id · customerCode=code · status=jobStatus · field ตรง', () => {
    const src = source({
      customer: customer({ id: 'C-1', code: 'C0007', name: 'สมชาย' }),
      rooms: [room('r1')],
      jobStatus: JOB_STATUS.QUOTED,
    });
    const b = extractJobBundle(src, '2026-06-14T00:00:00.000Z');
    expect(b.id).toBe('C-1');
    expect(b.customerCode).toBe('C0007');
    expect(b.status).toBe(JOB_STATUS.QUOTED);
    expect(b.rooms).toHaveLength(1);
    expect(b.createdAt).toBe('2026-06-14T00:00:00.000Z');
    expect(b.updatedAt).toBe('2026-06-14T00:00:00.000Z');
  });

  it('ไม่มี customer.id → gen id ใหม่', () => {
    const b = extractJobBundle(source({ customer: customer({ name: 'x' }) }));
    expect(b.id).toBeTruthy();
  });
});

describe('round-trip extract ↔ bundleToLiveFields', () => {
  it('คืน field live เดิม (customer/rooms/jobStatus)', () => {
    const src = source({
      customer: customer({ id: 'C-1', name: 'a' }),
      rooms: [room('r1')],
      jobStatus: JOB_STATUS.CONFIRMED,
    });
    const live = bundleToLiveFields(extractJobBundle(src));
    expect(live.customer).toEqual(src.customer);
    expect(live.rooms).toEqual(src.rooms);
    expect(live.jobStatus).toBe(JOB_STATUS.CONFIRMED);
  });
});

describe('blankJob / isBundleEmpty', () => {
  it('blankJob → id===customer.id · สถานะเริ่มต้น · ว่างทุก array · ถือว่าเปล่า', () => {
    const b = blankJob();
    expect(b.id).toBe(b.customer.id);
    expect(b.status).toBe(DEFAULT_JOB_STATUS);
    expect(b.rooms).toEqual([]);
    expect(b.receipts).toEqual([]);
    expect(isBundleEmpty(b)).toBe(true);
  });

  it('isBundleEmpty → false เมื่อมีชื่อลูกค้า หรือมีห้อง', () => {
    expect(isBundleEmpty({ ...blankJob(), customer: customer({ name: 'ก' }) })).toBe(false);
    expect(isBundleEmpty({ ...blankJob(), rooms: [room('r1')] })).toBe(false);
  });
});

describe('customerFromRegistry', () => {
  it('map ฟิลด์ + code + id ใหม่ · useSameAddress=true เมื่อไม่มีที่อยู่ติดตั้ง', () => {
    const c = customerFromRegistry({ code: 'C0007', name: 'สมหญิง', phone: '08x' });
    expect(c.code).toBe('C0007');
    expect(c.name).toBe('สมหญิง');
    expect(c.phone).toBe('08x');
    expect(c.id).toBeTruthy();
    expect(c.useSameAddress).toBe(true);
  });

  it('มี installationAddress → useSameAddress=false', () => {
    const c = customerFromRegistry({ code: 'C1', name: 'a', installationAddress: 'site' });
    expect(c.useSameAddress).toBe(false);
    expect(c.installationAddress).toBe('site');
  });
});
