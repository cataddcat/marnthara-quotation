// src/lib/security/pin.ts
// ────────────────────────────────────────────────────────────────────────────
// แฮช PIN ผู้ดูแล (admin) ด้วย Web Crypto SHA-256 — ไม่เพิ่ม dependency
//
// ⚠️ บริบท: บัญชีร้าน "ใช้ร่วมกัน" (login เดียวหลายคน) → นี่คือการ์ด "กันพลาด/กันมือลั่น"
//    ฝั่งแอป ไม่ใช่ access control จริง. salt คงที่ + เทียบตรง ๆ ก็พอ (กัน rainbow พื้นฐาน) —
//    ไม่ต้อง per-user salt / constant-time เพราะไม่ได้กันผู้โจมตีที่ตั้งใจ.
// ────────────────────────────────────────────────────────────────────────────

const enc = new TextEncoder();
const SALT = 'marnthara.admin.pin.v1:';

const toHex = (buf: ArrayBuffer): string =>
  Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

/** SHA-256(salt + pin) → hex 64 ตัว */
export const hashPin = async (pin: string): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(SALT + pin));
  return toHex(digest);
};

/** เทียบ pin กับ hash ที่เก็บไว้ — false ถ้าฝั่งใดว่าง */
export const verifyPin = async (pin: string, hash: string): Promise<boolean> => {
  if (!pin || !hash) return false;
  return (await hashPin(pin)) === hash;
};

/** รูปแบบ PIN ที่ยอมรับ: ตัวเลขล้วน 4–6 หลัก */
export const isValidPin = (pin: string): boolean => /^\d{4,6}$/.test(pin);
