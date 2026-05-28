import { useCallback } from 'react';
import { useZodForm } from '@/hooks/useZodForm';
import { WallpaperSchema, WallpaperFormValues } from '../schemas';
import { ITEM_TYPES } from '@/config/enums';
import { WallpaperItemInput } from '@/types';
import { InventoryItem } from '@/store/slices/InventorySlice';

const DEFAULT_DATA: WallpaperFormValues = {
  type: ITEM_TYPES.WALLPAPER,
  id: '',
  widths: [''],
  height_m: '',
  wallpaper_code: '',
  price_per_roll: '',
  install_cost_per_roll: '',
  notes: '',
  is_suspended: false,
  enable_set_price: false,
  set_price_override: 0,
};

export const useWallpaperFormLogic = (
  initialData: Partial<WallpaperItemInput> | undefined,
  onSubmit: (data: WallpaperItemInput) => void
) => {
  const mergedData = { ...DEFAULT_DATA, ...initialData } as WallpaperFormValues;

  const form = useZodForm({
    schema: WallpaperSchema,
    initialData: mergedData,
    onSubmit: (validatedData) => {
      onSubmit(validatedData as WallpaperItemInput);
    },
  });

  // ── Width array helpers ────────────────────────────────────────────────────

  const handleWidthChange = useCallback(
    (index: number, value: string) => {
      const newWidths = [...form.formData.widths];
      newWidths[index] = value;
      form.setFieldValue('widths', newWidths as unknown as WallpaperFormValues['widths']);
    },
    [form]
  );

  const addWidthField = useCallback(() => {
    const newWidths = [...form.formData.widths, ''];
    form.setFieldValue('widths', newWidths as unknown as WallpaperFormValues['widths']);
  }, [form]);

  const removeWidthField = useCallback(
    (index: number) => {
      const newWidths = form.formData.widths.filter((_, i) => i !== index);
      form.setFieldValue(
        'widths',
        (newWidths.length > 0 ? newWidths : ['']) as unknown as WallpaperFormValues['widths']
      );
    },
    [form]
  );

  // ── Code change (for ComboboxInput onChange) ───────────────────────────────

  const handleCodeChange = useCallback(
    (value: string) => {
      form.setFieldValue(
        'wallpaper_code',
        value as unknown as WallpaperFormValues['wallpaper_code']
      );
    },
    [form]
  );

  // ── Inventory select (picks code + price from saved item) ─────────────────

  const handleWallpaperSelect = useCallback(
    (item: InventoryItem) => {
      form.setFieldValue(
        'wallpaper_code',
        item.code as unknown as WallpaperFormValues['wallpaper_code']
      );
      if (item.default_price_per_m > 0) {
        form.setFieldValue(
          'price_per_roll',
          item.default_price_per_m.toString() as unknown as WallpaperFormValues['price_per_roll']
        );
      }
    },
    [form]
  );

  return {
    ...form,
    handleWallpaperSelect,
    handleWidthChange,
    addWidthField,
    removeWidthField,
    handleCodeChange,
  };
};
