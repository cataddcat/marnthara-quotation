import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom'; // แก้จาก /vitest เป็นแบบปกติ เพื่อความชัวร์

// ล้างข้อมูลหลัง Test แต่ละเคสจบ (ป้องกัน Memory Leak)
afterEach(() => {
  cleanup();
});
