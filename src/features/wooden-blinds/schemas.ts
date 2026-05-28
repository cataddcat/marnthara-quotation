// src/features/wooden-blinds/schemas.ts

import { z } from 'zod';
import { ITEM_TYPES } from '@/config/enums';
import { buildAreaItemSchema } from '@/features/shared/schemas';

export const WoodenBlindsSchema = buildAreaItemSchema(ITEM_TYPES.WOODEN_BLIND);
export type WoodenBlindsFormValues = z.infer<typeof WoodenBlindsSchema>;
