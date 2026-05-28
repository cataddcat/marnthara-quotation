// src/features/partition/schemas.ts

import { z } from 'zod';
import { ITEM_TYPES } from '@/config/enums';
import { buildAreaItemSchema } from '@/features/shared/schemas';

export const PartitionSchema = buildAreaItemSchema(ITEM_TYPES.PARTITION);
export type PartitionFormValues = z.infer<typeof PartitionSchema>;
