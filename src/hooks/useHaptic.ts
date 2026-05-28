import { useCallback } from 'react';

type HapticType = 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error';

export const useHaptic = () => {
  const trigger = useCallback((type: HapticType = 'selection') => {
    // 1. เช็คว่ามี Hardware รองรับไหม (ป้องกัน Error)
    if (typeof navigator === 'undefined' || !navigator.vibrate) {
      console.warn('Vibration API not supported in this environment');
      return;
    }

    // 2. สั่งสั่น (เฉพาะ Android/Chrome ที่รองรับ)
    try {
      switch (type) {
        case 'light':
          navigator.vibrate(5);
          break;
        case 'medium':
          navigator.vibrate(10);
          break;
        case 'heavy':
          navigator.vibrate(15);
          break;
        case 'selection':
          navigator.vibrate(2); // สั้นสุดๆ สำหรับ Picker
          break;
        case 'success':
          navigator.vibrate([10, 30, 10]);
          break;
        case 'warning':
          navigator.vibrate([30, 50, 10]);
          break;
        case 'error':
          navigator.vibrate([50, 100, 50, 100]);
          break;
        default:
          navigator.vibrate(10); // fallback
      }
    } catch (e) {
      console.error('Failed to trigger haptic feedback:', e);
    }
  }, []);

  return { trigger };
};
