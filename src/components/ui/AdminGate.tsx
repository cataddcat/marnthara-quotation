import React from 'react';
import { useRole } from '@/hooks/useRole';

interface AdminGateProps {
  /** สิ่งที่พนักงานเห็นแทน (default = ซ่อน) */
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Primitive เชิงประกาศสำหรับการ์ดบทบาท (admin/พนักงาน) — แม่แบบเดียวกับ ModeGate
 * แสดง children เฉพาะผู้ดูแล; พนักงานเห็น fallback (ปกติซ่อน — เช่น เมนูต้นทุน/กำไร)
 * @example <AdminGate>...เฉพาะผู้ดูแล...</AdminGate>
 */
export const AdminGate: React.FC<AdminGateProps> = ({ fallback = null, children }) => {
  const { isAdmin } = useRole();
  return <>{isAdmin ? children : fallback}</>;
};
