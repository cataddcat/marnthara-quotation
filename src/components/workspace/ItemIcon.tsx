import React from 'react';
import {
  AlignLeft, // Curtain
  ScrollText, // Wallpaper
  Scissors, // Removal
  Grid3X3, // Partition
  Blinds, // Blinds (Generic)
  Columns, // Vertical Blind
  Minimize2, // Roller Blind
  Box,
} from 'lucide-react';
import { ItemTypeKey } from '@/types';
import { ITEM_TYPES } from '@/config/enums'; // [NEW]
import { cn } from '@/lib/utils';

interface ItemIconProps {
  type: ItemTypeKey | string;
  className?: string;
}

export const ItemIcon: React.FC<ItemIconProps> = ({ type, className }) => {
  // Map item type to Lucide icon using Enums
  const iconMap: Record<string, React.ElementType> = {
    [ITEM_TYPES.CURTAIN]: AlignLeft,
    [ITEM_TYPES.WALLPAPER]: ScrollText,
    [ITEM_TYPES.REMOVAL]: Scissors,
    [ITEM_TYPES.WOODEN_BLIND]: Blinds,
    [ITEM_TYPES.ROLLER_BLIND]: Minimize2,
    [ITEM_TYPES.VERTICAL_BLIND]: Columns,
    [ITEM_TYPES.ALUMINUM_BLIND]: Blinds,
    [ITEM_TYPES.PARTITION]: Grid3X3,
    [ITEM_TYPES.PLEATED_SCREEN]: Grid3X3,
    // Legacy support
    set: AlignLeft,
  };

  const Icon = iconMap[type] || Box;

  return (
    <div className={cn('flex items-center justify-center', className)}>
      <Icon className="w-full h-full" />
    </div>
  );
};
