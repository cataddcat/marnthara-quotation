// src/features/pleated-screen/schemas.ts

import { z } from 'zod';
import { ITEM_TYPES } from '@/config/enums';
import { buildAreaItemSchema } from '@/features/shared/schemas';

export const PleatedScreenSchema = buildAreaItemSchema(ITEM_TYPES.PLEATED_SCREEN);
export type PleatedScreenFormValues = z.infer<typeof PleatedScreenSchema>;
