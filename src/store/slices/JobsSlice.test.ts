// src/store/slices/JobsSlice.test.ts
// JobsSlice — checkout model: save/switch/create/duplicate/delete + ความเป็นอิสระของงาน
// (jobSync() เป็น no-op ในเทสต์ — ไม่ต่อ Firestore)

import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '@/store/useAppStore';
import { DEFAULT_JOB_STATUS, JOB_STATUS } from '@/config/enums';
import { BLANK_CUSTOMER, BLANK_DISCOUNT, blankJob, type JobBundle } from '@/lib/job-bundle';

const reset = () =>
  useAppStore.setState({
    jobs: [],
    currentJobId: null,
    jobStatus: DEFAULT_JOB_STATUS,
    rooms: [],
    customer: { ...BLANK_CUSTOMER },
    discount: { ...BLANK_DISCOUNT },
    receipts: [],
    expenses: [],
    activeBaseUpdatedAt: '',
    activeDirty: false,
    conflict: null,
  });

/** สร้าง JobBundle เลียนแบบ "เวอร์ชันจากอีกเครื่อง" */
const mk = (id: string, name: string, updatedAt: string): JobBundle => {
  const b = blankJob();
  b.id = id;
  b.customer = { ...b.customer, id, name };
  b.status = JOB_STATUS.QUOTED;
  b.updatedAt = updatedAt;
  return b;
};

const s = () => useAppStore.getState();

describe('🗂️ JobsSlice — saveCurrentJob', () => {
  beforeEach(reset);

  it('งานเปล่า → ไม่ถูกเก็บลงชั้นวาง', () => {
    s().saveCurrentJob();
    expect(s().jobs).toHaveLength(0);
  });

  it('มีชื่อลูกค้า → เก็บลงชั้นวาง + ตั้ง currentJobId = id ของงาน', () => {
    s().setCustomer({ name: 'สมชาย' });
    s().saveCurrentJob();
    expect(s().jobs).toHaveLength(1);
    expect(s().jobs[0].customer.name).toBe('สมชาย');
    expect(s().currentJobId).toBe(s().jobs[0].id);
  });

  it('เซฟซ้ำ → upsert ทับงานเดิม (ไม่เพิ่มก้อนใหม่)', () => {
    s().setCustomer({ name: 'สมชาย' });
    s().saveCurrentJob();
    s().setCustomer({ name: 'สมชาย ทรัพย์ทวี' });
    s().saveCurrentJob();
    expect(s().jobs).toHaveLength(1);
    expect(s().jobs[0].customer.name).toBe('สมชาย ทรัพย์ทวี');
  });
});

describe('🗂️ JobsSlice — createJob / switchJob (ความเป็นอิสระของงาน)', () => {
  beforeEach(reset);

  it('createJob → เก็บงานเดิม + เปิดงานเปล่า (live ว่าง, currentJobId เปลี่ยน)', () => {
    s().setCustomer({ name: 'งานเอ' });
    s().addRoom('ห้อง1');
    s().saveCurrentJob();
    const firstId = s().currentJobId;

    s().createJob();
    expect(s().currentJobId).not.toBe(firstId);
    expect(s().customer.name).toBe('');
    expect(s().rooms).toHaveLength(0);
    expect(s().jobs.find((j) => j.id === firstId)?.customer.name).toBe('งานเอ');
  });

  it('switchJob → โหลดงานเป้าหมายเข้า live; ห้อง/ลูกค้าแต่ละงานแยกเด็ดขาด', () => {
    s().setCustomer({ name: 'A' });
    s().addRoom('ra');
    s().saveCurrentJob();
    const idA = s().currentJobId as string;

    s().createJob();
    s().setCustomer({ name: 'B' });
    s().addRoom('rb');
    s().saveCurrentJob();
    const idB = s().currentJobId as string;

    s().switchJob(idA);
    expect(s().currentJobId).toBe(idA);
    expect(s().customer.name).toBe('A');
    expect(s().rooms.map((r) => r.name)).toEqual(['ra']);

    s().switchJob(idB);
    expect(s().customer.name).toBe('B');
    expect(s().rooms.map((r) => r.name)).toEqual(['rb']);
  });

  it('createJob(fromCustomer) → autofill snapshot + ผูก customerCode', () => {
    s().createJob({ code: 'C0009', name: 'ลูกค้าใหม่', phone: '0812345678' });
    expect(s().customer.name).toBe('ลูกค้าใหม่');
    expect(s().customer.code).toBe('C0009');
    expect(s().currentJobId).toBe(s().customer.id);
    // มีชื่อ → เก็บลงชั้นวางทันที
    expect(s().jobs.find((j) => j.customerCode === 'C0009')).toBeTruthy();
  });
});

describe('🗂️ JobsSlice — setJobStatus', () => {
  beforeEach(reset);

  it('ตั้งสถานะงานปัจจุบัน → อัปเดตทั้ง live + ชั้นวาง', () => {
    s().setCustomer({ name: 'A' });
    s().saveCurrentJob();
    const id = s().currentJobId as string;
    s().setJobStatus(JOB_STATUS.CONFIRMED);
    expect(s().jobStatus).toBe(JOB_STATUS.CONFIRMED);
    expect(s().jobs.find((j) => j.id === id)?.status).toBe(JOB_STATUS.CONFIRMED);
  });

  it('ตั้งสถานะงานอื่นด้วย id → ไม่แตะ live ของงานปัจจุบัน', () => {
    s().setCustomer({ name: 'A' });
    s().saveCurrentJob();
    const idA = s().currentJobId as string;
    s().createJob();
    s().setCustomer({ name: 'B' });
    s().saveCurrentJob();

    s().setJobStatus(JOB_STATUS.DONE, idA);
    expect(s().jobs.find((j) => j.id === idA)?.status).toBe(JOB_STATUS.DONE);
    expect(s().jobStatus).not.toBe(JOB_STATUS.DONE); // live (B) คงเดิม
  });
});

describe('🗂️ JobsSlice — duplicateJob / deleteJob', () => {
  beforeEach(reset);

  it('duplicateJob → id ใหม่ · ล้างเงินจริง · รีเซ็ตสถานะ · ไม่สลับไป', () => {
    s().setCustomer({ name: 'A' });
    s().addReceipt({ label: 'มัดจำ', amount: 1000, date: '2026-06-14' });
    s().saveCurrentJob();
    const idA = s().currentJobId as string;
    s().setJobStatus(JOB_STATUS.DONE);

    s().duplicateJob(idA);
    const jobs = s().jobs;
    expect(jobs).toHaveLength(2);
    const copy = jobs.find((j) => j.id !== idA);
    expect(copy?.receipts).toHaveLength(0);
    expect(copy?.status).toBe(DEFAULT_JOB_STATUS);
    expect(copy?.customer.name).toContain('สำเนา');
    expect(s().currentJobId).toBe(idA); // ยังเปิดงานเดิม
  });

  it('deleteJob งานปัจจุบัน → สลับไปงานที่เหลือ', () => {
    s().setCustomer({ name: 'A' });
    s().saveCurrentJob();
    const idA = s().currentJobId as string;
    s().createJob();
    s().setCustomer({ name: 'B' });
    s().saveCurrentJob();
    const idB = s().currentJobId as string;

    s().deleteJob(idB);
    expect(s().jobs.find((j) => j.id === idB)).toBeUndefined();
    expect(s().currentJobId).toBe(idA);
    expect(s().customer.name).toBe('A');
  });

  it('deleteJob งานสุดท้าย → เปิดงานเปล่า', () => {
    s().setCustomer({ name: 'Only' });
    s().saveCurrentJob();
    const id = s().currentJobId as string;

    s().deleteJob(id);
    expect(s().jobs).toHaveLength(0);
    expect(s().customer.name).toBe('');
    expect(s().currentJobId).not.toBe(id);
  });
});

describe('🗂️ JobsSlice — conflict guard', () => {
  beforeEach(reset);

  it('saveCurrentJob → activeBaseUpdatedAt ตั้ง + activeDirty=false; markActiveDirty → true', () => {
    s().setCustomer({ name: 'A' });
    s().saveCurrentJob();
    expect(s().activeBaseUpdatedAt).not.toBe('');
    expect(s().activeDirty).toBe(false);
    s().markActiveDirty();
    expect(s().activeDirty).toBe(true);
  });

  it('applyRemoteToActive → live=remote · base=remote.updatedAt · ไม่ dirty', () => {
    s().setCustomer({ name: 'A' });
    s().saveCurrentJob();
    const id = s().currentJobId as string;
    s().markActiveDirty();

    s().applyRemoteToActive(mk(id, 'A-จากอีกเครื่อง', '2999-01-01T00:00:00.000Z'));
    expect(s().customer.name).toBe('A-จากอีกเครื่อง');
    expect(s().activeBaseUpdatedAt).toBe('2999-01-01T00:00:00.000Z');
    expect(s().activeDirty).toBe(false);
  });

  it("resolveConflict('load') → live=remote + เก็บของฉันเป็นสำเนา (ไม่หาย)", () => {
    s().setCustomer({ name: 'Mine' });
    s().addRoom('r1');
    s().saveCurrentJob();
    const id = s().currentJobId as string;
    s().markActiveDirty();
    s().setConflict(mk(id, 'Remote', '2999-01-01T00:00:00.000Z'));

    s().resolveConflict('load');
    expect(s().customer.name).toBe('Remote');
    expect(s().conflict).toBeNull();
    expect(s().jobs.some((j) => j.customer.name.includes('ของฉัน'))).toBe(true);
  });

  it("resolveConflict('keep') → live=ของฉัน + remote เก็บเป็นสำเนา (ไม่หาย)", () => {
    s().setCustomer({ name: 'Mine' });
    s().saveCurrentJob();
    const id = s().currentJobId as string;
    s().markActiveDirty();
    s().setConflict(mk(id, 'Remote', '2999-01-01T00:00:00.000Z'));

    s().resolveConflict('keep');
    expect(s().customer.name).toBe('Mine');
    expect(s().conflict).toBeNull();
    expect(s().jobs.some((j) => j.customer.name.includes('จากอีกเครื่อง'))).toBe(true);
  });
});
