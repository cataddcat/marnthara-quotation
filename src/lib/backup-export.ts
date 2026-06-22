// src/lib/backup-export.ts
// ────────────────────────────────────────────────────────────────────────────
// สร้าง + ดาวน์โหลดไฟล์ Backup (.json) — คู่กับ backup.ts (ฝั่ง parse/restore)
// แยกจาก DataModal เพื่อใช้ซ้ำ: ปุ่ม Backup + auto-backup ก่อน factoryReset
// ────────────────────────────────────────────────────────────────────────────

import { buildDocFileBase, formatDocCode } from '@/lib/docName';
import { markBackupDone } from '@/lib/backup-reminder';
import type { AppState } from '@/store/useAppStore'; // type only — ไม่สร้าง runtime cycle

export interface DocIdentity {
  id: string;
  code?: string;
  seq: number;
}

/** ประกอบก้อนข้อมูล backup (งาน + ร้าน + ต้นทุนของร้าน) — pure, เทสต์ได้
 *  หมายเหตุ: product master (favorites + ทุนผ้า/วอลฯ/พื้นที่/ราง) = DB ภายนอก → ไม่อยู่ใน backup
 *  (ดึงจาก Firestore catalog, HANDOFF §11.8). backup เก็บเฉพาะ "ของร้านเอง": ค่าเย็บ/บริการ */
export function buildBackupObject(state: AppState): Record<string, unknown> {
  return {
    customer: state.customer,
    rooms: state.rooms,
    shopConfig: state.shopConfig,
    discount: state.discount,
    payments: { receipts: state.receipts, expenses: state.expenses },
    production: {
      laborCosts: state.laborCosts,
      serviceCosts: state.serviceCosts,
      accessoryCosts: state.accessoryCosts,
      costInclude: state.costInclude,
    },
    version: '1.0.0',
    exportDate: new Date().toISOString(),
  };
}

/**
 * สร้างไฟล์ + trigger ดาวน์โหลด — คืน true ถ้าสำเร็จ + stamp lastBackupAt
 * ชื่อไฟล์: <ประเภท>_<ลูกค้า>_<รหัส>_<YYYYMMDD>.json (สืบย้อนได้ — ผ่าน docName.ts)
 */
export function downloadBackup(state: AppState, ident: DocIdentity): boolean {
  try {
    const obj = buildBackupObject(state);
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const docCode = formatDocCode(ident);
    a.download = `${buildDocFileBase('mtr-backup', state.customer.name, docCode)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    markBackupDone();
    return true;
  } catch (e) {
    console.error('downloadBackup', e);
    return false;
  }
}
