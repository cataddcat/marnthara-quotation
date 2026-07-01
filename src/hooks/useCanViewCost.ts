// src/hooks/useCanViewCost.ts
// Single source ของนโยบาย "ใครเห็นราคาทุน (ต้นทุน)" — ทุน/กำไร = ความลับร้าน จึงเห็นเฉพาะผู้ดูแล.
// ใช้ที่ทุกจุดที่โชว์ทุนอ้างอิง (code picker · คลังวัสดุ · รายละเอียดรหัส) → เปลี่ยนนโยบายที่จุดเดียว.
import { useRole } from './useRole';

export const useCanViewCost = (): boolean => useRole().isAdmin;
