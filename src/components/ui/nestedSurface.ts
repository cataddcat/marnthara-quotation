import { createContext, useContext } from 'react';

/**
 * "กฎข้อ 4" (anti card-in-card) — true = component นี้อยู่ในพื้นที่ที่ "มีกรอบ/การ์ดอยู่แล้ว"
 * (เช่นในเนื้อหาของ `CollapsibleSection`). Section ข้างใน (`FormSection`) อ่านค่านี้เพื่อ
 * **ไม่วาดกรอบ/พื้นของตัวเองซ้ำ** → เลี่ยงการ์ดซ้อนการ์ด แสดงข้อมูลโล่งขึ้น.
 *
 * นโยบายว่า "flatten เมื่อไหร่" อยู่ฝั่งผู้บริโภค (FormSection ปัจจุบัน gate เฉพาะธีม EEERT) —
 * context นี้บอกแค่ "โครงสร้างซ้อนอยู่หรือเปล่า" ล้วน ๆ.
 */
export const NestedSurfaceContext = createContext(false);

export const useNestedSurface = () => useContext(NestedSurfaceContext);
