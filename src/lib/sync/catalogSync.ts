// src/lib/sync/catalogSync.ts
// ════════════════════════════════════════════════════════════════════════════
// ดึงแค็ตตาล็อกสินค้า + ราคาทุนจาก DB ภายนอก (Firestore shops/{uid}/catalog) → useCatalogStore
// ────────────────────────────────────────────────────────────────────────────
// • read-only: แอปไม่เขียน catalog (pipeline ภายนอกเป็นเจ้าของ — ดู firestore.rules + HANDOFF §11.8)
// • 1 doc / SKU (สเกลหลักร้อย–พัน) → validate ต่อ doc ด้วย CatalogEntrySchema (ข้าม doc ที่เสีย)
// • offline ผ่าน Firestore persistentLocalCache (เหมือน jobs/customers)
// • เปิด/ปิดใน startSync/stopSync (syncEngine) ตามสถานะ auth
// ════════════════════════════════════════════════════════════════════════════

import { collection, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { db } from '@/lib/firebase/app';
import { CatalogEntrySchema, type CatalogEntry } from '@/lib/catalog/contract';
import { useCatalogStore } from '@/store/useCatalogStore';

const catalogCol = (uid: string) => collection(db!, 'shops', uid, 'catalog');

let unsub: Unsubscribe | null = null;
let activeUid: string | null = null;

/** เริ่มดึง catalog (idempotent — uid เดิม = no-op). no-op ถ้า Firebase ไม่ตั้งค่า (local-only) */
export function subscribeCatalog(uid: string): void {
  if (!db || activeUid === uid) return;
  if (activeUid) unsubscribeCatalog();
  activeUid = uid;
  useCatalogStore.getState().setLoading();

  unsub = onSnapshot(
    catalogCol(uid),
    (snap) => {
      const entries: CatalogEntry[] = [];
      let skipped = 0;
      snap.forEach((d) => {
        const parsed = CatalogEntrySchema.safeParse(d.data());
        if (parsed.success) entries.push(parsed.data);
        else skipped++;
      });
      if (skipped > 0) {
        // doc ที่ pipeline เขียนผิด schema — ข้าม (แอปไม่แก้ catalog เอง) แต่เตือน dev
        console.warn(`catalogSync: ข้าม ${skipped} doc ที่ไม่ตรง CatalogEntrySchema`);
      }
      useCatalogStore.getState().setCatalog(entries, snap.metadata.fromCache);
    },
    (err) => console.error('catalogSync', err)
  );
}

/** หยุดดึง + ล้าง store (กลับสู่ fallback persisted vault เดิม) */
export function unsubscribeCatalog(): void {
  unsub?.();
  unsub = null;
  activeUid = null;
  useCatalogStore.getState().reset();
}
