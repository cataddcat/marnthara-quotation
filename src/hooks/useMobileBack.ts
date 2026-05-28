import { useEffect } from 'react';

/**
 * Hook สำหรับจัดการปุ่ม Back บน Android/iOS
 * เมื่อ Modal เปิดอยู่ การกด Back จะเป็นการปิด Modal แทนการเปลี่ยนหน้า
 */
export const useMobileBack = (isOpen: boolean, onClose: () => void) => {
  useEffect(() => {
    if (isOpen) {
      // 1. Push state หลอกๆ เข้าไปใน History Stack
      window.history.pushState({ modalOpen: true }, '', window.location.href);

      // 2. ดักจับ event เมื่อ User กดปุ่ม Back
      const handlePopState = (event: PopStateEvent) => {
        // ป้องกัน default behavior และสั่งปิด Modal
        event.preventDefault();
        onClose();
      };

      window.addEventListener('popstate', handlePopState);

      // Cleanup
      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [isOpen, onClose]);
};
