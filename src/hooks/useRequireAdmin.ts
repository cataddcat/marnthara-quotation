// src/hooks/useRequireAdmin.ts
// ห่อ action ที่ต้องเป็นผู้ดูแล — ถ้าเป็น admin อยู่แล้ว: รันเลย; ถ้าเป็นพนักงาน: เด้ง AdminPinModal
// (ใส่ PIN ถูก → ปลดล็อกเครื่องนี้เป็น admin แล้วรัน action ต่อ)

import { useRole } from '@/hooks/useRole';
import { useAppStore } from '@/store/useAppStore';

export const useRequireAdmin = (): ((action: () => void) => void) => {
  const { isAdmin } = useRole();
  const openModal = useAppStore((s) => s.openModal);

  return (action: () => void) => {
    if (isAdmin) {
      action();
      return;
    }
    openModal('adminPin', { intent: 'unlock', onSuccess: action });
  };
};
