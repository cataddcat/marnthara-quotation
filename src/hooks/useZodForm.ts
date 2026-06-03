// src/hooks/useZodForm.ts

import { useState, useCallback, useMemo } from 'react';
import { z } from 'zod';
import { normalizeDimension } from '@/utils/formatters';

// [FIX] Use z.ZodType<T> directly. This matches the schema structure for type T
// and implicitly handles Def and Input types safely, removing 'any' and 'unknown' issues.
export type ZodSchema<T> = z.ZodType<T>;

// ฟิลด์ที่เป็น "ขนาด (เมตร)" — ใช้ heuristic ซม.→ม. (เช่น 234 → 2.34)
const DIMENSION_FIELDS = ['width_m', 'height_m'] as const;

/**
 * Normalize ค่าขนาด (ซม.→ม.) ตอนกดบันทึก เพื่อกัน race ระหว่าง onBlur ของ Input
 * (ที่แปลงค่าให้) กับการกดปุ่มบันทึก (ที่อ่าน state เดิมก่อน setState จาก blur จะ commit)
 * — idempotent กับค่าที่แปลงแล้ว ("2.34" → "2.34"), ปลอดภัยกับฟอร์มที่ไม่มีฟิลด์ขนาด
 */
function normalizeDimensionFields<T extends Record<string, unknown>>(data: T): T {
  let changed = false;
  const out: Record<string, unknown> = { ...data };

  for (const key of DIMENSION_FIELDS) {
    const v = out[key];
    if (typeof v === 'string' && v.trim() !== '') {
      const n = normalizeDimension(v);
      if (n !== v) {
        out[key] = n;
        changed = true;
      }
    }
  }

  // วอลเปเปอร์: widths เป็น array ความกว้างของผนัง
  if (Array.isArray(out.widths)) {
    let arrChanged = false;
    const next = (out.widths as unknown[]).map((w) => {
      if (typeof w === 'string' && w.trim() !== '') {
        const n = normalizeDimension(w);
        if (n !== w) arrChanged = true;
        return n;
      }
      return w;
    });
    if (arrChanged) {
      out.widths = next;
      changed = true;
    }
  }

  return changed ? (out as T) : data;
}

interface UseZodFormProps<T> {
  schema: ZodSchema<T>;
  initialData: T;
  onSubmit: (data: T) => void;
}

export const useZodForm = <T extends Record<string, unknown>>({
  schema,
  initialData,
  onSubmit,
}: UseZodFormProps<T>) => {
  const [formData, setFormData] = useState<T>(initialData);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  
  // [FIX] ESLint: Removed unused 'setWarnings'.
  // Kept 'warnings' state to maintain API shape (returns empty object).
  const [warnings] = useState<Partial<Record<keyof T, string>>>({});
  
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Check Dirty State
  const isDirty = useMemo(() => {
    return JSON.stringify(formData) !== JSON.stringify(initialData);
  }, [formData, initialData]);

  // 1. Handle Change (Generic)
  const handleChange = useCallback((field: keyof T, value: T[keyof T]) => {
    setFormData((prev) => {
      return { ...prev, [field]: value };
    });
    
    // Clear error for this field immediately for better UX
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  // 2. Handle Number Input (Specific for string-based numbers)
  const handleNumberChange = useCallback((field: keyof T, value: string) => {
    // Allow numbers, dots, and empty string (allow negative numbers too)
    if (/^-?\d*\.?\d*$/.test(value)) {
      handleChange(field, value as T[keyof T]);
    }
  }, [handleChange]);

  // 3. Validation Logic (Full form validation)
  const validate = useCallback(() => {
    // [FIX] schema.safeParse returns SafeParseReturnType<T, T> because schema is ZodType<T>
    const result = schema.safeParse(formData);
    
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof T, string>> = {};
      
      result.error.issues.forEach((issue) => {
        // [FIX] issue.path[0] is strictly typed as string | number key
        const path = issue.path[0];
        if (path && !fieldErrors[path as keyof T]) {
          fieldErrors[path as keyof T] = issue.message;
        }
      });
      
      setErrors(fieldErrors);
      return false;
    }
    
    setErrors({});
    return true;
  }, [formData, schema]);

  // 4. Handle Submit — always saves, validation is feedback-only (not a gate)
  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      setIsSubmitted(true);

      // กัน race onBlur(แปลง ซม.→ม.) / กดบันทึก: normalize ขนาดก่อนตรวจ+บันทึกเสมอ
      const data = normalizeDimensionFields(formData);

      // populate inline error hints จากข้อมูลที่ normalize แล้ว
      const result = schema.safeParse(data);
      if (!result.success) {
        const fieldErrors: Partial<Record<keyof T, string>> = {};
        result.error.issues.forEach((issue) => {
          const path = issue.path[0];
          if (path && !fieldErrors[path as keyof T]) {
            fieldErrors[path as keyof T] = issue.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        setErrors({});
      }

      // Save with parsed data when valid, normalized formData as fallback
      onSubmit((result.success ? result.data : data) as T);
    },
    [formData, onSubmit, schema]
  );

  // 5. Reset form
  const resetForm = useCallback(() => {
    setFormData(initialData);
    setErrors({});
    setIsSubmitted(false);
  }, [initialData]);

  // 6. Set field value (manual update)
  const setFieldValue = useCallback((field: keyof T, value: T[keyof T]) => {
    handleChange(field, value);
  }, [handleChange]);

  return {
    // State
    formData,
    errors,
    warnings,
    isDirty,
    isSubmitted,
    
    // Handlers
    handleChange,
    handleNumberChange,
    handleSubmit,
    validate,
    resetForm,
    setFieldValue,
    
    // State setters (for advanced usage)
    setFormData,
    setErrors,
  };
};