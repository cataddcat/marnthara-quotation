import { useCallback } from 'react';
import { useZodForm } from '@/hooks/useZodForm';
import { CurtainSchema, CurtainFormValues } from '../schemas';
import { LAYER_MODES, ITEM_TYPES } from '@/config/enums';
import { CurtainItemInput } from '@/types';
import { InventoryItem } from '@/store/slices/InventorySlice';

// Default Data: ค่าเริ่มต้นเมื่อเปิดฟอร์มเปล่าๆ
const DEFAULT_DATA: CurtainFormValues = {
  type: ITEM_TYPES.CURTAIN,
  id: '',
  width_m: '',
  height_m: '',
  style: 'ลอน',
  opening_style: '', // ไม่มีค่าตั้งต้น — ผู้ใช้ต้องเลือกเอง (การ์ดจะเตือนถ้ายังไม่เลือก)
  layer_mode: LAYER_MODES.MAIN,
  fabric_variant: 'ทึบ',
  
  // Optional Fields
  code: '',
  price_per_m_raw: '',
  sheer_code: '',
  sheer_price_per_m: '',
  rail_code: '',
  rail_color: '',
  bracket_color: '',
  hook_type: 'short',
  chain_position: 'right',
  eyelet_color: '',
  pleat_distance: '',
  button_spacing: '14.5',
  notes: '',
  
  // Toggles
  is_suspended: false,
  enable_set_price: false,
  set_price_override: 0,
};

export const useCurtainFormLogic = (
  initialData: Partial<CurtainItemInput> | undefined,
  onSubmit: (data: CurtainItemInput) => void
) => {
  // 1. Prepare Initial State
  // Merge Default + Initial Data (Type casting เพื่อความเข้ากันได้ระหว่าง Type เก่ากับ Zod Type)
  const mergedData = { ...DEFAULT_DATA, ...initialData } as CurtainFormValues;

  // 2. Initialize Zod Form
  const form = useZodForm({
    schema: CurtainSchema,
    initialData: mergedData,
    onSubmit: (validatedData) => {
      // 3. Success Callback
      // validatedData คือข้อมูลที่ผ่านการตรวจสอบจาก Zod แล้ว 100%
      // เรา Cast กลับเป็น CurtainItemInput เพื่อส่งให้ App Store (เพราะ Store ยังใช้ Type เดิมอยู่)
      onSubmit(validatedData as unknown as CurtainItemInput);
    },
  });

  // 🧠 SMART LOGIC: Auto-fill Price from Inventory
  // ใช้ Type 'InventoryItem' แทน 'any' เพื่อความปลอดภัย (Zero Any Rule)
  const handleMainFabricSelect = useCallback((item: InventoryItem) => {
    form.setFieldValue('code', item.code);
    
    // ถ้าใน Inventory มีราคาขายมาตรฐาน -> ดึงมาใส่ให้เลย (User แก้ทีหลังได้)
    if (item.default_price_per_m > 0) {
      form.setFieldValue('price_per_m_raw', item.default_price_per_m.toString());
    }
    
    // Future: อาจจะดึง Note หรือ Spec อื่นๆ มาด้วยได้
  }, [form]);

  const handleSheerFabricSelect = useCallback((item: InventoryItem) => {
    form.setFieldValue('sheer_code', item.code);
    
    if (item.default_price_per_m > 0) {
      form.setFieldValue('sheer_price_per_m', item.default_price_per_m.toString());
    }
  }, [form]);

  return {
    ...form,
    // Export specific handlers
    handleMainFabricSelect,
    handleSheerFabricSelect,
  };
};