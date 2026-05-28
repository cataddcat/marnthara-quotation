// src/features/roller-blinds/schemas.ts

import { z } from 'zod';
import { ITEM_TYPES } from '@/config/enums';
import { buildAreaItemSchema } from '@/features/shared/schemas';

export const RollerBlindsSchema = buildAreaItemSchema(ITEM_TYPES.ROLLER_BLIND);
export type RollerBlindsFormValues = z.infer<typeof RollerBlindsSchema>;
