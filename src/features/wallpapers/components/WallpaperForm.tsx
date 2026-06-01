import React, { useMemo } from 'react';
import { WallpaperItemInput } from '@/types';
import { ITEM_TYPES, FAVORITE_CATEGORIES } from '@/config/enums';
import { PricingEngine } from '@/lib/pricing/PricingEngine';
import { toNum, fmtTH } from '@/utils/formatters';
import { Input } from '@/components/ui/Input';
import { ComboboxInput } from '@/components/ui/ComboboxInput';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { Tag, ScrollText, Ruler, PaintRoller, Star, Book, Plus, Trash2 } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useSaveToCatalog } from '@/hooks/useSaveToCatalog';
import { cn } from '@/lib/utils';
import { useWallpaperFormLogic } from '../hooks/useWallpaperFormLogic';
import { InventoryItem } from '@/store/slices/InventorySlice';
import { SuggestionItem } from '@/components/ui/ComboboxInput';

export const WALLPAPER_FORM_ID = 'wallpaper-edit-form';

interface WallpaperFormProps {
  initialData?: Partial<WallpaperItemInput>;
  onSubmit: (data: WallpaperItemInput) => void;
  onCancel: () => void;
  onAutoSave?: (data: Partial<WallpaperItemInput>) => void;
}

export const WallpaperForm: React.FC<WallpaperFormProps> = ({
  initialData,
  onSubmit,
  onAutoSave,
}) => {
  const {
    formData,
    errors,
    warnings,
    handleChange,
    handleNumberChange,
    handleSubmit,
    handleWidthChange,
    addWidthField,
    removeWidthField,
    handleCodeChange,
    handleWallpaperSelect,
  } = useWallpaperFormLogic(initialData, onSubmit);

  const { favorites, openModal } = useAppStore();
  const { saveToCatalog, isInCatalog } = useSaveToCatalog();

  // ── Inventory suggestions from favorites ──────────────────────────────────
  const rawSuggestions = useMemo(
    () => favorites[FAVORITE_CATEGORIES.WALLPAPER] || [],
    [favorites]
  );

  // Convert InventoryItem[] → SuggestionItem<InventoryItem>[] for ComboboxInput
  const suggestions = useMemo<SuggestionItem<InventoryItem>[]>(
    () =>
      rawSuggestions.map((item) => ({
        label: item.code,
        value: item.code,
        desc: item.note || undefined,
        data: item,
      })),
    [rawSuggestions]
  );

  // ── Price preview ─────────────────────────────────────────────────────────
  const pricePreview = useMemo(() => {
    const previewItem = { ...formData, type: ITEM_TYPES.WALLPAPER, id: 'preview' };
    return PricingEngine.calculateDetailedPrice(
      previewItem as unknown as import('@/types').ItemData
    );
  }, [formData]);

  // ── Blur → auto-save ──────────────────────────────────────────────────────
  const handleFormBlur = () => {
    onAutoSave?.(formData);
  };

  return (
    <form id={WALLPAPER_FORM_ID} onSubmit={handleSubmit} onBlur={handleFormBlur} className="space-y-6">
      {/* 1. Dimensions */}
      <div className="bg-card p-4 rounded-2xl border border-border shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-foreground font-bold">
          <Ruler className="w-5 h-5 text-sky-500" />
          <h2>ขนาดพื้นที่</h2>
        </div>
        <div className="space-y-3">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground ml-1">
              ความกว้างผนัง (ม.)
            </label>
            {formData.widths.map((w, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  placeholder={`ผนังที่ ${i + 1}`}
                  value={w}
                  onChange={(e) => handleWidthChange(i, e.target.value)}
                  isDimension
                  className={cn('text-sky-600 dark:text-sky-400 bg-sky-500/10', errors.widths && 'border-red-300 bg-red-50')}
                />
                {formData.widths.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeWidthField(i)}
                    className="p-3 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addWidthField}
              className="text-sm text-indigo-600 font-medium flex items-center gap-1 px-1 hover:underline"
            >
              <Plus className="w-4 h-4" /> เพิ่มผนัง
            </button>
          </div>

          <Input
            label="ความสูง (เมตร)"
            placeholder="0.00"
            value={formData.height_m}
            onChange={(e) => handleNumberChange('height_m', e.target.value)}
            isDimension
            className="text-sky-600 dark:text-sky-400 bg-sky-500/10"
            error={errors.height_m}
          />
        </div>
      </div>

      {/* 2. Specification */}
      <div className="bg-muted/50 p-4 rounded-xl border border-border space-y-4">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-sm font-bold text-foreground flex items-center gap-2">
              <ScrollText className="w-4 h-4 text-muted-foreground" /> รหัสวอลเปเปอร์
            </label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 gap-1 text-muted-foreground hover:text-orange-500"
              onClick={() => openModal('materialSummary', { initialTab: 'catalog', initialCategory: FAVORITE_CATEGORIES.WALLPAPER })}
            >
              <Book className="w-3.5 h-3.5" />
              <span className="text-xs">จัดการรายการ</span>
            </Button>
          </div>

          <ComboboxInput<InventoryItem>
            placeholder="ค้นหารหัส..."
            value={formData.wallpaper_code || ''}
            onChange={handleCodeChange}
            onSelect={(s) => s.data && handleWallpaperSelect(s.data)}
            options={suggestions}
            warning={warnings.wallpaper_code}
          />

          <div className="relative">
            <Input
              placeholder="ราคา (บาท/ม้วน)"
              inputMode="decimal"
              value={formData.price_per_roll || ''}
              onChange={(e) => handleNumberChange('price_per_roll', e.target.value)}
              prefix={<Tag className="w-4 h-4 text-muted-foreground" />}
            />
            {formData.wallpaper_code && toNum(formData.price_per_roll) > 0 && (
              <button
                type="button"
                onClick={() =>
                  saveToCatalog(
                    FAVORITE_CATEGORIES.WALLPAPER,
                    formData.wallpaper_code,
                    formData.price_per_roll
                  )
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 z-10 hover:scale-110 transition-transform"
              >
                <Star
                  className={cn(
                    'w-5 h-5 transition-colors',
                    isInCatalog(FAVORITE_CATEGORIES.WALLPAPER, formData.wallpaper_code)
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-muted-foreground hover:text-amber-400'
                  )}
                />
              </button>
            )}
          </div>

          <Input
            label="ค่าติดตั้ง (บาท/ม้วน)"
            placeholder="0"
            inputMode="decimal"
            value={formData.install_cost_per_roll || ''}
            onChange={(e) => handleNumberChange('install_cost_per_roll', e.target.value)}
            prefix={<PaintRoller className="w-4 h-4 text-muted-foreground" />}
          />
        </div>
      </div>

      {/* 3. Price Summary */}
      <div className="bg-card border border-border p-5 rounded-2xl shadow-sm space-y-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

        <div className="space-y-3 text-sm">
          <div className="flex justify-between border-b border-border pb-2">
            <span className="text-muted-foreground">ใช้จริง (ม้วน):</span>
            <span className="tabular-nums text-orange-500 text-lg font-bold">
              {pricePreview.breakdown?.rolls ?? 0} ม้วน
            </span>
          </div>

          <div className="flex justify-between items-end pt-2 border-t border-border mt-2">
            <span className="text-muted-foreground pb-1">ราคาสุทธิ</span>
            <span className="text-2xl font-bold tabular-nums text-emerald-500 dark:text-emerald-400">
              {fmtTH(pricePreview.total)}
            </span>
          </div>

          <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Switch
                checked={formData.enable_set_price || false}
                onCheckedChange={(c) => handleChange('enable_set_price', c)}
                className="data-[state=checked]:bg-emerald-500"
              />
              <span className="text-sm text-muted-foreground">กำหนดราคาเอง</span>
            </div>
            {formData.enable_set_price && (
              <div className="w-32">
                <input
                  type="text"
                  inputMode="decimal"
                  value={formData.set_price_override || ''}
                  onChange={(e) => handleNumberChange('set_price_override', e.target.value)}
                  className="w-full bg-background text-foreground border border-border rounded-lg px-3 py-1.5 text-right font-mono text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Notes + Actions */}
      <div className="pt-2 space-y-4">
        <Input
          label="หมายเหตุ"
          value={formData.notes || ''}
          onChange={(e) => handleChange('notes', e.target.value)}
          className="bg-muted/50 border-transparent focus:bg-background"
        />
      </div>
    </form>
  );
};
