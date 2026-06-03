import { useLayoutEffect, useRef } from 'react';

/**
 * บันทึกอัตโนมัติเมื่อ `formData` เปลี่ยน — แทนการผูก auto-save ไว้กับ `onBlur` ของฟอร์ม
 *
 * เหตุผล: `onBlur={() => onAutoSave(formData)}` อ่าน snapshot ของ formData ณ ตอน render
 * จึง (ก) พลาดค่าที่เพิ่งถูก smart-parse บน blur (เช่น "250" → "2.50") เพราะ setState ยังไม่ commit
 * และ (ข) พลาดค่าช่องสุดท้าย (มักเป็น "ความสูง") ถ้าผู้ใช้ปิด/บันทึกทันที
 * การยึดกับ `formData` ที่ commit แล้วทำให้จับทุกการเปลี่ยนแปลงครบ
 *
 * - ใช้ useLayoutEffect เพื่อให้ `onAutoSave` ได้รับค่าล่าสุด *ก่อน* event ถัดไป
 *   (เช่น การคลิกปุ่มปิด/บันทึก) — ผู้เรียกที่ flush ตอนปิดจะได้ค่าที่ถูกต้องเสมอ
 * - ข้าม render แรก (mount) เพื่อไม่ยิงบันทึกทั้งที่ผู้ใช้ยังไม่ได้แก้
 * - debounce จริงอยู่ฝั่งผู้เรียก (เช่น ItemModal.handleAutoSave) — hook นี้แค่ forward การเปลี่ยนแปลง
 *
 * หมายเหตุ: ใส่ `onAutoSave` ใน deps ได้ปลอดภัย เพราะ caller ส่งมาเป็น useCallback ที่ identity คงที่
 * (effect จึงยิงเฉพาะตอน `formData` เปลี่ยนจริง)
 */
export function useFormAutoSave<T>(formData: T, onAutoSave?: (data: T) => void): void {
  const mountedRef = useRef(false);

  useLayoutEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return; // ข้าม mount — ยังไม่มีการแก้ไขให้บันทึก
    }
    onAutoSave?.(formData);
  }, [formData, onAutoSave]);
}
