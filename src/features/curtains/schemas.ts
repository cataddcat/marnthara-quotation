// src/features/curtains/schemas.ts

import { z } from 'zod';
import { LAYER_MODES, ITEM_TYPES } from '@/config/enums';
import { CURTAIN_STYLE_FEATURES } from '@/config/constants';
import { toNum } from '@/utils/formatters';

// --- 1. Reusable Validators ---

// กฎ: ต้องเป็นตัวเลข > 0 (รับเป็น String แล้วเช็ค)
const numericString = z.string().trim().refine((val) => {
    const num = parseFloat(val.replace(/,/g, ''));
    return !isNaN(num) && num > 0;
}, { message: "ระบุค่ามากกว่า 0" });

// กฎ: ข้อความต้องไม่ว่าง
const requiredString = z.string().trim().min(1, "จำเป็นต้องระบุข้อมูล");

// --- 2. The Main Schema ---

export const CurtainSchema = z.object({
    // --- Identity ---
    type: z.literal(ITEM_TYPES.CURTAIN).default(ITEM_TYPES.CURTAIN),
    id: z.string().optional(),

    // --- Dimensions ---
    width_m: numericString,
    height_m: numericString,

    // --- Configuration ---
    style: requiredString, // ลอน, จีบ, ตาไก่...
    opening_style: z.string().optional(), // แยกกลาง, เก็บขวา
    
    layer_mode: z.enum([LAYER_MODES.MAIN, LAYER_MODES.SHEER, LAYER_MODES.DOUBLE]),
    
    // --- Fabrics (Optional base on Logic) ---
    // เราใช้ z.string() ธรรมดาไปก่อน แล้วค่อยไป validate ใน superRefine ว่าต้องมีค่าไหม
    code: z.string().optional(), 
    price_per_m_raw: z.union([z.string(), z.number()]).optional(),
    
    sheer_code: z.string().optional(),
    sheer_price_per_m: z.union([z.string(), z.number()]).optional(),

    fabric_variant: z.string().optional(), // ทึบ / โปร่ง (Auto generated usually)

    // --- Accessories ---
    rail_color: z.string().optional(),
    bracket_color: z.string().optional(),

    // --- Hardware Metadata (production reference, no price impact) ---
    hook_type: z.enum(['short', 'long']).optional(),
    chain_position: z.enum(['left', 'right']).optional(),
    eyelet_color: z.string().optional(),
    pleat_distance: z.string().optional(),
    button_spacing: z.enum(['14.5', '16']).optional(), // ระยะกระดุม (ลอน เท่านั้น)

    // --- Additional Options ---
    is_suspended: z.boolean().default(false),
    notes: z.string().optional(),
    
    // --- Pricing Overrides ---
    enable_set_price: z.boolean().default(false),
    set_price_override: z.union([z.string(), z.number()]).default(0),

    // --- Pro Mode Fields (Optional) ---
    _is_pro_mode: z.boolean().optional(),
})
.superRefine((data, ctx) => {
    // 🧠 Intelligent Logic Section: กฎที่ซับซ้อนจะอยู่ที่นี่

    const { layer_mode, style, enable_set_price } = data;
    
    // ถ้า "กำหนดราคาเอง" ไม่จำเป็นต้องเช็คราคาผ้าละเอียดก็ได้ (แล้วแต่ Business Logic)
    // แต่ปกติเราควรเช็คเพื่อให้ Spec ครบถ้วน
    const skipPriceCheck = enable_set_price; 

    // ✅ วิธีที่ 1: ใช้การ type assertion เพื่อให้ TypeScript รู้ว่าเป็น string[]
    const mainLayerModes = [LAYER_MODES.MAIN, LAYER_MODES.DOUBLE] as string[];
    const sheerLayerModes = [LAYER_MODES.SHEER, LAYER_MODES.DOUBLE] as string[];
    
    const hasMain = mainLayerModes.includes(layer_mode);
    const hasSheer = sheerLayerModes.includes(layer_mode);
    
    // ✅ วิธีที่ 2: ใช้การตรวจสอบโดยตรง (ทางเลือก)
    // const hasMain = layer_mode === LAYER_MODES.MAIN || layer_mode === LAYER_MODES.DOUBLE;
    // const hasSheer = layer_mode === LAYER_MODES.SHEER || layer_mode === LAYER_MODES.DOUBLE;

    // Rule 1: เช็คผ้าทึบ
    if (hasMain) {
        if (!data.code) {
            ctx.addIssue({ path: ['code'], code: z.ZodIssueCode.custom, message: "ระบุรหัสผ้าทึบ" });
        }
        // ถ้าไม่ Override ราคา -> ต้องใส่ราคาต่อเมตร
        if (!skipPriceCheck && toNum(data.price_per_m_raw) <= 0) {
            ctx.addIssue({ path: ['price_per_m_raw'], code: z.ZodIssueCode.custom, message: "ระบุราคาผ้า" });
        }
    }

    // Rule 2: เช็คผ้าโปร่ง
    if (hasSheer) {
        if (!data.sheer_code) {
            ctx.addIssue({ path: ['sheer_code'], code: z.ZodIssueCode.custom, message: "ระบุรหัสผ้าโปร่ง" });
        }
        if (!skipPriceCheck && toNum(data.sheer_price_per_m) <= 0) {
            ctx.addIssue({ path: ['sheer_price_per_m'], code: z.ZodIssueCode.custom, message: "ระบุราคาผ้าโปร่ง" });
        }
    }

    // Rule 3: เช็คสีราง (ตรวจสอบจาก Config Feature)
    const features = CURTAIN_STYLE_FEATURES[style];
    // ถ้าสไตล์นี้ต้องใช้ราง และยังไม่ได้เลือกสี
    if (features?.hasRail && !data.rail_color) {
        ctx.addIssue({ path: ['rail_color'], code: z.ZodIssueCode.custom, message: "ระบุสีราง/อุปกรณ์" });
    }
});

// Auto-generated Type (มั่นใจได้ว่าตรงกับ Schema 100%)
export type CurtainFormValues = z.infer<typeof CurtainSchema>;