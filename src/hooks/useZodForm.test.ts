// src/hooks/useZodForm.test.ts
// useZodForm — handleChange / handleNumberChange / Save-First handleSubmit / validate / dirty / reset

import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { z } from 'zod';
import { useZodForm } from './useZodForm';

const schema = z.object({
  name: z.string().min(1, 'ระบุชื่อ'),
  qty: z.string().refine((v) => parseFloat(v) > 0, 'ต้อง > 0'),
});
type Form = z.infer<typeof schema>;

const setup = (onSubmit = vi.fn(), initialData: Form = { name: 'a', qty: '5' }) =>
  renderHook(() => useZodForm({ schema, initialData, onSubmit }));

describe('useZodForm — handleChange', () => {
  it('อัปเดต formData', () => {
    const { result } = setup();
    act(() => result.current.handleChange('name', 'bob'));
    expect(result.current.formData.name).toBe('bob');
  });

  it('clear error ของ field นั้นทันทีที่แก้', () => {
    const { result } = setup(vi.fn(), { name: '', qty: '5' });
    act(() => result.current.validate());
    expect(result.current.errors.name).toBeTruthy();
    act(() => result.current.handleChange('name', 'x'));
    expect(result.current.errors.name).toBeUndefined();
  });
});

describe('useZodForm — handleNumberChange', () => {
  it('รับตัวเลข/ทศนิยม', () => {
    const { result } = setup();
    act(() => result.current.handleNumberChange('qty', '12.5'));
    expect(result.current.formData.qty).toBe('12.5');
  });

  it('ปฏิเสธ input ที่ไม่ใช่ตัวเลข (formData ไม่เปลี่ยน)', () => {
    const { result } = setup();
    act(() => result.current.handleNumberChange('qty', 'abc'));
    expect(result.current.formData.qty).toBe('5');
  });

  it('รับ empty string และ ค่าติดลบ', () => {
    const { result } = setup();
    act(() => result.current.handleNumberChange('qty', ''));
    expect(result.current.formData.qty).toBe('');
    act(() => result.current.handleNumberChange('qty', '-3'));
    expect(result.current.formData.qty).toBe('-3');
  });
});

describe('useZodForm — validate', () => {
  it('valid → true + ไม่มี errors', () => {
    const { result } = setup();
    let ok = false;
    act(() => {
      ok = result.current.validate();
    });
    expect(ok).toBe(true);
    expect(result.current.errors).toEqual({});
  });

  it('invalid → false + set errors', () => {
    const { result } = setup(vi.fn(), { name: '', qty: '0' });
    let ok = true;
    act(() => {
      ok = result.current.validate();
    });
    expect(ok).toBe(false);
    expect(result.current.errors.name).toBe('ระบุชื่อ');
    expect(result.current.errors.qty).toBe('ต้อง > 0');
  });
});

describe('useZodForm — handleSubmit (Save-First)', () => {
  it('valid → onSubmit ด้วย parsed data + isSubmitted true', () => {
    const onSubmit = vi.fn();
    const { result } = setup(onSubmit);
    act(() => result.current.handleSubmit());
    expect(onSubmit).toHaveBeenCalledWith({ name: 'a', qty: '5' });
    expect(result.current.isSubmitted).toBe(true);
  });

  it('invalid → ยังเรียก onSubmit (ไม่บล็อค) + populate error hints', () => {
    const onSubmit = vi.fn();
    const { result } = setup(onSubmit, { name: '', qty: '0' });
    act(() => result.current.handleSubmit());
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(result.current.errors.name).toBeTruthy();
  });
});

describe('useZodForm — normalize ขนาด ตอน submit (กัน race onBlur/บันทึก)', () => {
  const dimSchema = z.object({
    width_m: z.string(),
    height_m: z.string(),
    widths: z.array(z.string()).optional(),
  });
  type DimForm = z.infer<typeof dimSchema>;

  const setupDim = (onSubmit = vi.fn(), initialData: DimForm) =>
    renderHook(() => useZodForm({ schema: dimSchema, initialData, onSubmit }));

  it('แปลง width_m/height_m แบบ ซม.→ม. (234 → 2.34) แม้ยังไม่ blur', () => {
    const onSubmit = vi.fn();
    const { result } = setupDim(onSubmit, { width_m: '234', height_m: '272' });
    act(() => result.current.handleSubmit());
    expect(onSubmit).toHaveBeenCalledWith({ width_m: '2.34', height_m: '2.72' });
  });

  it('ค่าที่แปลงแล้ว (มีจุดทศนิยม) ไม่ถูกแปลงซ้ำ (idempotent)', () => {
    const onSubmit = vi.fn();
    const { result } = setupDim(onSubmit, { width_m: '2.34', height_m: '2.72' });
    act(() => result.current.handleSubmit());
    expect(onSubmit).toHaveBeenCalledWith({ width_m: '2.34', height_m: '2.72' });
  });

  it('normalize widths[] ของวอลเปเปอร์ด้วย', () => {
    const onSubmit = vi.fn();
    const { result } = setupDim(onSubmit, { width_m: '', height_m: '260', widths: ['300', '2.5'] });
    act(() => result.current.handleSubmit());
    expect(onSubmit).toHaveBeenCalledWith({
      width_m: '',
      height_m: '2.60',
      widths: ['3.00', '2.50'],
    });
  });
});

describe('useZodForm — dirty / reset', () => {
  it('isDirty false ตอนเริ่ม, true หลังแก้', () => {
    const { result } = setup();
    expect(result.current.isDirty).toBe(false);
    act(() => result.current.handleChange('name', 'changed'));
    expect(result.current.isDirty).toBe(true);
  });

  it('resetForm คืน initialData + ล้าง errors + isSubmitted', () => {
    const { result } = setup(vi.fn(), { name: '', qty: '0' });
    act(() => result.current.handleSubmit());
    act(() => result.current.resetForm());
    expect(result.current.formData).toEqual({ name: '', qty: '0' });
    expect(result.current.errors).toEqual({});
    expect(result.current.isSubmitted).toBe(false);
  });
});
