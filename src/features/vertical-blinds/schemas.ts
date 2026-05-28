// src/features/vertical-blinds/schemas.ts

import { z } from 'zod';
import { ITEM_TYPES } from '@/config/enums';
import { buildAreaItemSchema } from '@/features/shared/schemas';

export const VerticalBlindsSchema = buildAreaItemSchema(ITEM_TYPES.VERTICAL_BLIND);
export type VerticalBlindsFormValues = z.infer<typeof VerticalBlindsSchema>;
