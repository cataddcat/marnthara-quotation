// src/features/removal/schemas.ts

import { z } from 'zod';
import { ITEM_TYPES } from '@/config/enums';
import { positiveNumeric, requiredString } from '@/features/shared/schemas';

export const RemovalSchema = z.object({
  type: z.literal(ITEM_TYPES.REMOVAL).default(ITEM_TYPES.REMOVAL),
  id: z.string().optional(),

  description: requiredString.refine((val) => val.length > 0, {
    message: 'ระบุรายการ',
  }),
  quantity: positiveNumeric,
  price_per_item: positiveNumeric,

  notes: z.string().optional(),
  is_suspended: z.boolean().default(false),

  // Pricing override (Removal ก็มี enable_set_price เหมือนกัน)
  enable_set_price: z.boolean().default(false),
  set_price_override: z.union([z.string(), z.number()]).default(0),
});

export type RemovalFormValues = z.infer<typeof RemovalSchema>;
