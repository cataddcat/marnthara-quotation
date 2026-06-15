// src/lib/backup-reminder.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { markBackupDone, daysSinceBackup, shouldRemindBackup } from '@/lib/backup-reminder';

const KEY = 'marnthara.lastBackupAt';

describe('backup-reminder', () => {
  beforeEach(() => localStorage.removeItem(KEY));

  it('ไม่เคย backup → null + ควรเตือน', () => {
    expect(daysSinceBackup()).toBeNull();
    expect(shouldRemindBackup(7)).toBe(true);
  });

  it('markBackupDone → ~0 วัน + ไม่เตือน', () => {
    markBackupDone();
    const d = daysSinceBackup();
    expect(d).not.toBeNull();
    expect(d as number).toBeLessThan(1);
    expect(shouldRemindBackup(7)).toBe(false);
  });

  it('เกิน threshold วัน → เตือน', () => {
    localStorage.setItem(KEY, new Date(Date.now() - 10 * 86_400_000).toISOString());
    expect(shouldRemindBackup(7)).toBe(true);
    expect(daysSinceBackup() as number).toBeGreaterThan(9);
  });

  it('ค่าเสีย (parse ไม่ได้) → null', () => {
    localStorage.setItem(KEY, 'ไม่ใช่วันที่');
    expect(daysSinceBackup()).toBeNull();
  });
});
