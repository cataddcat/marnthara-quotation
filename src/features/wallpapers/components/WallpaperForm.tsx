import React, { useMemo } from 'react';
import { WallpaperItemInput } from '@/types';
import { ITEM_TYPES, FAVORITE_CATEGORIES } from '@/config/enums';
import { PricingEngine } from '@/lib/pricing/PricingEngine';
import { toNum } from '@/utils/formatters';
import { Input } from '@/components/ui/Input';
import { ComboboxInput } from '@/components/ui/ComboboxInput';
import { Button } from '@/components/ui/Button';
import { Tag, ScrollText, Ruler, PaintRoller, Star, Book, Plus, Trash2 } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useSaveToCatalog } from '@/hooks/useSaveToCatalog';
import { useExperienceMode, useTierSize } from '@/hooks/useExperienceMode';
import { useCostStatus } from '@/hooks/useCostStatus';
import { FormTwoColumn } from '@/components/ui/FormTwoColumn';
import { FormSection } from '@/components/ui/FormSection';
import { ItemSummaryCard } from '@/components/ui/ItemSummaryCard';
import { CostReadout } from '@/components/ui/CostReadout';
import { getItemTheme } from '@/lib/theme-utils';
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
  const { isFull } = useExperienceMode();
  const { control } = useTierSize();
  const theme = getItemTheme(ITEM_TYPES.WALLPAPER);

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
  const previewItem = useMemo(
    () =>
      ({ ...formData, type: ITEM_TYPES.WALLPAPER, id: 'preview' } as unknown as import('@/types').ItemData),
    [formData]
  );
  const pricePreview = useMemo(
    () => PricingEngine.calculateDetailedPrice(previewItem),
    [previewItem]
  );
  const analysis = useCostStatus(previewItem);

  // ── Blur → auto-save ──────────────────────────────────────────────────────
  const handleFormBlur = () => {
    onAutoSave?.(formData);
  };

  const summaryPanel = (
    <ItemSummaryCard
      accentClass={theme.bgSoft}
      title="สรุปรายการคำนวณ"
      titleIcon={Tag}
      rows={[
        {
          label: 'ใช้จริง (ม้วน):',
          value: `${pricePreview.breakdown?.rolls ?? 0} ม้วน`,
          valueClass: cn(theme.text, 'text-lg font-bold'),
        },
      ]}
      total={pricePreview.total}
      enableSetPrice={formData.enable_set_price || false}
      onToggleSetPrice={(c) => handleChange('enable_set_price', c)}
      setPriceValue={formData.set_price_override}
      onSetPriceChange={(v) => handleNumberChange('set_price_override', v)}
      status={analysis?.status}
      showStatus={isFull && (analysis?.totalCost ?? 0) > 0}
      proSlot={
        isFull && analysis && analysis.totalCost > 0 ? (
          <CostReadout analysis={analysis} />
        ) : null
      }
    />
  );

  return (
    <form id={WALLPAPER_FORM_ID} onSubmit={handleSubmit} onBlur={handleFormBlur}>
      <FormTwoColumn full={isFull} right={summaryPanel}>
      {/* 1. Dimensions */}
      <FormSection icon={Ruler} title="ขนาดพื้นที่">
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
                  size={control}
                  className={cn('text-lg font-bold text-sky-600 dark:text-sky-400 bg-sky-500/10', errors.widths && 'border-red-300 bg-red-50')}
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
            size={control}
            className="text-lg font-bold text-sky-600 dark:text-sky-400 bg-sky-500/10"
            error={errors.height_m}
          />
        </div>
      </FormSection>

      {/* 2. Specification */}
      <FormSection
        icon={ScrollText}
        iconClass={theme.icon}
        title="รหัสวอลเปเปอร์"
        headerRight={
          isFull && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 gap-1 text-muted-foreground hover:text-foreground"
              onClick={() => openModal('materialSummary', { initialTab: 'catalog', initialCategory: FAVORITE_CATEGORIES.WALLPAPER })}
            >
              <Book className="w-3.5 h-3.5" />
              <span className="text-xs">จัดการรายการ</span>
            </Button>
          )
        }
      >
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
          {isFull && formData.wallpaper_code && toNum(formData.price_per_roll) > 0 && (
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
      </FormSection>

      {/* 4. Notes + Actions */}
      <Input
        label="หมายเหตุ"
        value={formData.notes || ''}
        onChange={(e) => handleChange('notes', e.target.value)}
        className="bg-muted/50 border-transparent focus:bg-background"
      />
      </FormTwoColumn>
    </form>
  );
};
