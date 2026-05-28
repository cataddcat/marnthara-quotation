import { z } from 'zod';
import { ITEM_TYPES } from '@/config/enums';

const numericString = z.string().trim().refine((val) => {
    const num = parseFloat(val.replace(/,/g, ''));
    return !isNaN(num) && num > 0;
}, { message: "ระบุค่ามากกว่า 0" });

export const WallpaperSchema = z.object({
    type: z.literal(ITEM_TYPES.WALLPAPER).default(ITEM_TYPES.WALLPAPER),
    id: z.string().optional(),
    widths: z.array(z.string()).min(1, "ระบุความกว้างอย่างน้อย 1 ผนัง"),
    height_m: numericString,
    wallpaper_code: z.string().min(1, "ระบุรหัสวอลเปเปอร์"),
    price_per_roll: z.string(),
    install_cost_per_roll: z.string().optional(),
    notes: z.string().optional(),
    is_suspended: z.boolean().optional(),
    enable_set_price: z.boolean().optional(),
    set_price_override: z.any().optional(),
});

export type WallpaperFormValues = z.infer<typeof WallpaperSchema>;