// src/hooks/useSyncStatus.ts
// แปลงสถานะซิงค์ (useSyncStore) → ข้อความ/สีพร้อมใช้ใน UI (header dot · เมนู · JobsModal)
import { useSyncStore } from '@/store/useSyncStore';

export interface SyncStatusView {
  /** ซ่อน (ยังไม่ sign-in / ไม่ตั้ง Firebase) */
  hidden: boolean;
  dotClass: string; // สีจุดสถานะ
  label: string; // ข้อความเต็ม
  short: string; // ข้อความสั้น (header)
}

export const useSyncStatus = (): SyncStatusView => {
  const status = useSyncStore((s) => s.status);
  const online = useSyncStore((s) => s.online);
  const pending = useSyncStore((s) => s.pending);

  switch (status) {
    case 'disabled':
      return { hidden: true, dotClass: '', label: '', short: '' };
    case 'pending':
      return {
        hidden: false,
        dotClass: 'bg-amber-500',
        label: online ? `กำลังซิงค์… (${pending})` : `ออฟไลน์ — รอซิงค์ ${pending} งาน`,
        short: online ? 'กำลังซิงค์' : `รอซิงค์ ${pending}`,
      };
    case 'offline':
      return {
        hidden: false,
        dotClass: 'bg-muted-foreground/50',
        label: 'ออฟไลน์',
        short: 'ออฟไลน์',
      };
    default: // synced
      return {
        hidden: false,
        dotClass: 'bg-emerald-500',
        label: 'ซิงค์แล้ว',
        short: 'ซิงค์แล้ว',
      };
  }
};
