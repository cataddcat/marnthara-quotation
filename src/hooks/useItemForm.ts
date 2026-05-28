import { useState, useCallback, useMemo } from 'react';

// Helper: แปลงตัวเลขเป็น String พร้อม Comma
const formatNumberDisplay = (value: string | number | undefined): string => {
  if (value === '' || value === undefined || value === 0) return '';
  const num = Number(value);
  return isNaN(num) ? '' : num.toLocaleString('en-US');
};

// Helper: ล้าง Comma ออก
const cleanNumberString = (value: string): string => {
  return value.replace(/,/g, '');
};

// --- New Validation Types ---
export type ValidationLevel = 'error' | 'warning';

export interface ValidationResult {
  level: ValidationLevel;
  message: string;
}

// Validator คืนค่าเป็น Object หรือ null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Validator<T> = (value: any, formData: T) => ValidationResult | null;
export type ValidationSchema<T> = Partial<Record<keyof T, Validator<T>>>;

export const useItemForm = <T extends object>(
  initialData: T,
  validationSchema?: ValidationSchema<T>
) => {
  const [formData, setFormData] = useState<T>(initialData);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [warnings, setWarnings] = useState<Partial<Record<keyof T, string>>>({});

  const isDirty = useMemo(() => {
    return JSON.stringify(formData) !== JSON.stringify(initialData);
  }, [formData, initialData]);

  // 1. General Handler
  const handleChange = useCallback(
    (field: keyof T, value: T[keyof T]) => {
      setFormData((prev) => ({ ...prev, [field]: value }));

      // Clear status when user types
      if (validationSchema && validationSchema[field]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
        setWarnings((prev) => ({ ...prev, [field]: undefined }));
      }
    },
    [validationSchema]
  );

  // 2. Number Handler
  const handleNumberChange = useCallback(
    (field: keyof T, rawValue: string) => {
      const cleanValue = cleanNumberString(rawValue);
      if (/^\d*\.?\d*$/.test(cleanValue)) {
        setFormData((prev) => ({ ...prev, [field]: cleanValue as unknown as T[keyof T] }));

        // Clear status
        if (validationSchema && validationSchema[field]) {
          setErrors((prev) => ({ ...prev, [field]: undefined }));
          setWarnings((prev) => ({ ...prev, [field]: undefined }));
        }
      }
    },
    [validationSchema]
  );

  // 3. Smart Validation Function
  const validate = useCallback((): { isValid: boolean; hasWarnings: boolean } => {
    if (!validationSchema) return { isValid: true, hasWarnings: false };

    const newErrors: Partial<Record<keyof T, string>> = {};
    const newWarnings: Partial<Record<keyof T, string>> = {};
    let isValid = true;
    let hasWarnings = false;

    (Object.keys(validationSchema) as Array<keyof T>).forEach((field) => {
      const validator = validationSchema[field];
      if (validator) {
        const result = validator(formData[field], formData);
        if (result) {
          if (result.level === 'error') {
            newErrors[field] = result.message;
            isValid = false;
          } else if (result.level === 'warning') {
            newWarnings[field] = result.message;
            hasWarnings = true;
          }
        }
      }
    });

    setErrors(newErrors);
    setWarnings(newWarnings);

    return { isValid, hasWarnings };
  }, [formData, validationSchema]);

  // 4. Formatter Accessor - แก้ไขแล้ว
  const getFormattedNumber = useCallback(
    (field: keyof T) => {
      const val = formData[field];

      // ตรวจสอบ Type ก่อนส่งไป format
      if (typeof val === 'string' || typeof val === 'number') {
        return formatNumberDisplay(val);
      }
      return '';
    },
    [formData]
  );

  // 5. Reset Form
  const resetForm = useCallback(() => {
    setFormData(initialData);
    setErrors({});
    setWarnings({});
  }, [initialData]);

  return {
    formData,
    errors,
    warnings,
    isDirty,
    handleChange,
    handleNumberChange,
    getFormattedNumber,
    setFormData,
    validate,
    resetForm,
  };
};
