import React, { useMemo, useState, useCallback } from 'react';
import { CurtainItemInput } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { useUIStore } from '@/store/useUIStore';
import { useSaveToCatalog } from '@/hooks/useSaveToCatalog';
import { ComboboxInput, SuggestionItem } from '@/components/ui/ComboboxInput';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { FormSection } from '@/components/ui/FormSection';
import { FAVORITE_CATEGORIES, LAYER_MODES } from '@/config/enums';
import { Moon, Sun, AlertTriangle, RefreshCw, Check, Star, Book, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toNum, fmtTH } from '@/utils/formatters';
import { LayerSelector } from './LayerSelector';
import { InventoryItem } from '@/store/slices/InventorySlice';

// --- Helper Hook ---
const useInventory = (category: string) => {
  const { favorites } = useAppStore();
  return favorites[category] || [];
};

// --- 🤏 Mini Component: Price Status Indicator ---
interface PriceStatusIndicatorProps {
  status: 'synced' | 'empty' | 'no_master' | 'mismatch' | 'none' | 'found';
  masterPrice: number;
  onSync: () => void;
}

const PriceStatusIndicator = ({ status, masterPrice, onSync }: PriceStatusIndicatorProps) => {
  if (status === 'synced' || status === 'empty' || status === 'no_master') return null;

  return (
    <div className="mt-1.5 flex items-center justify-between gap-2 animate-fade-in">
      <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 px-2 py-1 rounded-md border border-amber-200/60 flex items-center gap-1">
        <AlertTriangle className="w-3 h-3" />
        คลัง: {fmtTH(masterPrice)}
      </span>
      <button
        type="button"
        onClick={onSync}
        className="text-[11px] font-bold flex items-center gap-1 text-foreground bg-muted hover:bg-muted/70 border border-border px-2.5 py-1 rounded-md transition-colors active:scale-95"
      >
        <RefreshCw className="w-3 h-3" strokeWidth={1.5} /> ดึงราคา
      </button>
    </div>
  );
};

interface FabricSectionProps {
  data: CurtainItemInput;
  onChange: (field: keyof CurtainItemInput, val: string | number | boolean) => void;
  onNumberChange: (field: keyof CurtainItemInput, val: string) => void;
  onMainFabricSelect: (item: InventoryItem) => void;
  onSheerFabricSelect: (item: InventoryItem) => void;
  errors: Partial<Record<keyof CurtainItemInput, string>>;
  warnings: Partial<Record<keyof CurtainItemInput, string>>;
  /** แสดงเครื่องมือคลัง (ปุ่มจัดการรายการ / ปุ่มดาวบันทึก / ตัวบอก sync) — ซ่อนในโหมด Lite */
  showCatalogTools?: boolean;
  /** โหมด Lite: วางรหัสผ้า + ราคา คนละบรรทัด (ไม่แบ่ง 2 คอลัมน์) ให้กดง่ายบนจอแคบ */
  stack?: boolean;
}

export const FabricSection: React.FC<FabricSectionProps> = ({
  data,
  onChange,
  onNumberChange,
  onMainFabricSelect,
  onSheerFabricSelect,
  errors,
  warnings,
  showCatalogTools = true,
  stack = false,
}) => {
  const { openModal } = useAppStore();
  const addToast = useUIStore((state) => state.addToast);
  const { saveToCatalog } = useSaveToCatalog();

  const mainFabrics = useInventory(FAVORITE_CATEGORIES.CURTAIN_MAIN);
  const sheerFabrics = useInventory(FAVORITE_CATEGORIES.CURTAIN_SHEER);

  // State สำหรับแสดงเครื่องหมายถูกเมื่อบันทึกสำเร็จ
  const [justSaved, setJustSaved] = useState<string | null>(null);

  // ✅ Cast Array เป็น string[] และใช้ layerMode ที่มี default
  const layerMode = data.layer_mode || LAYER_MODES.MAIN;
  const showMain = ([LAYER_MODES.MAIN, LAYER_MODES.DOUBLE] as string[]).includes(layerMode);
  const showSheer = ([LAYER_MODES.SHEER, LAYER_MODES.DOUBLE] as string[]).includes(layerMode);

  // ม่านแป๊บ (สอดราง) ทำ 2 ชั้นไม่ได้ → เหลือผ้าชั้นเดียว (ทึบ/โปร่ง) รหัสเดียว
  const allowedLayerModes =
    data.style === 'แป๊บ'
      ? [LAYER_MODES.MAIN, LAYER_MODES.SHEER]
      : [LAYER_MODES.MAIN, LAYER_MODES.SHEER, LAYER_MODES.DOUBLE];

  // 🧠 Logic: ค้นหาราคากลางจากคลัง
  const findMasterPrice = useCallback((code: string | undefined, isSheer: boolean) => {
    const list = isSheer ? sheerFabrics : mainFabrics;
    if (!code) return { status: 'none' as const, masterItem: null, masterPrice: 0 };

    const masterItem = list.find((i) => i.code === code);
    const masterPrice = masterItem?.default_price_per_m || 0;
    return { status: 'found' as const, masterItem, masterPrice };
  }, [mainFabrics, sheerFabrics]);

  // 🧠 Logic: ตรวจสอบว่าราคาตรงกับคลังหรือไม่
  const checkPriceSync = useCallback((currentPrice: string | number | undefined, masterPrice: number) => {
    const current = toNum(currentPrice);
    if (current === 0) return 'empty';
    if (masterPrice === 0) return 'no_master';
    return Math.abs(current - masterPrice) < 0.01 ? 'synced' : 'mismatch';
  }, []);

  const mainMaster = useMemo(
    () => findMasterPrice(data.code, false),
    [data.code, findMasterPrice]
  );

  const sheerMaster = useMemo(
    () => findMasterPrice(data.sheer_code, true),
    [data.sheer_code, findMasterPrice]
  );

  const mainSyncStatus = checkPriceSync(data.price_per_m_raw, mainMaster.masterPrice);
  const sheerSyncStatus = checkPriceSync(data.sheer_price_per_m, sheerMaster.masterPrice);

  // ⚡ Action: ดึงราคาจากคลัง
  const handleSyncPrice = (isSheer = false) => {
    const { masterItem } = isSheer ? sheerMaster : mainMaster;
    if (masterItem) {
      const field = isSheer ? 'sheer_price_per_m' : 'price_per_m_raw';
      onNumberChange(field, masterItem.default_price_per_m.toString());
      addToast('success', `ดึงราคา ${masterItem.code} เรียบร้อย`);
    }
  };

  // 🔧 Handler: เมื่อเลือกรหัสผ้า
  const handleSelectFabric = (
    item: SuggestionItem<InventoryItem>,
    codeField: keyof CurtainItemInput,
    priceField: keyof CurtainItemInput
  ) => {
    const code = typeof item === 'string' ? item : item.value;
    onChange(codeField, code);

    // Auto-fill price ถ้าพบในคลัง
    const found = typeof item === 'string' ? undefined : item?.data;
    if (found?.default_price_per_m && found.default_price_per_m > 0 && !data[priceField]) {
      onNumberChange(priceField, found.default_price_per_m.toString());
    }
  };

  // 💾 Action: บันทึกราคาลงคลัง
  // 💾 Action: บันทึกราคาลงคลัง (ใช้ hook กลาง — ยืนยันก่อนทับเสมอ)
  const handleSaveToCatalog = async (
    code: string | undefined,
    price: string | number | undefined,
    category: string
  ) => {
    const ok = await saveToCatalog(category, code, price);
    if (ok) {
      // แสดง animation เครื่องหมายถูกชั่วคราว
      setJustSaved(category);
      setTimeout(() => setJustSaved(null), 2000);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. ✅ Layer Mode Selector */}
      <FormSection icon={Layers} iconClass="text-foreground" title="เลือกประเภทม่าน">
        {/* ✅ ใส่ Default Value กันตาย (Fallback) */}
        <LayerSelector
          value={layerMode}
          onChange={(val) => onChange('layer_mode', val)}
          allowedModes={allowedLayerModes}
        />
      </FormSection>

      {/* 2. ส่วนเลือกผ้า (แสดงตาม Mode) */}
      <FormSection>
        {/* --- MAIN FABRIC INPUT --- */}
        {showMain && (
          <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center justify-between border-b border-border/40 pb-2 mb-2">
              <div className="flex items-center gap-2 text-orange-500 font-bold">
                <Moon className="w-4 h-4" />
                <span>ผ้าทึบ (Main)</span>
              </div>
              {showCatalogTools && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 gap-1 text-muted-foreground hover:text-orange-500"
                onClick={() =>
                  openModal('materialSummary', {
                    initialTab: 'catalog',
                    initialCategory: FAVORITE_CATEGORIES.CURTAIN_MAIN,
                  })
                }
              >
                <Book className="w-3.5 h-3.5" />
                <span className="text-xs">จัดการรายการ</span>
              </Button>
              )}
            </div>
            
            {/* Responsive grid: 7/5 split — give price column more room for xx,xxx */}
            <div className="grid grid-cols-12 gap-3 items-start">
              {/* Code Selection */}
              <div className={cn('col-span-12', !stack && 'sm:col-span-7')}>
                <ComboboxInput<InventoryItem>
                  label="รหัสผ้าทึบ"
                  placeholder="ค้นหาหรือพิมพ์รหัส..."
                  value={data.code || ''}
                  onChange={(val) => onChange('code', val)}
                  onSelect={(item) => {
                    handleSelectFabric(
                      item as SuggestionItem<InventoryItem>,
                      'code',
                      'price_per_m_raw'
                    );
                    if (typeof item !== 'string' && item.data) {
                      onMainFabricSelect(item.data);
                    }
                  }}
                  options={mainFabrics.map((f) => ({
                    label: f.code,
                    value: f.code,
                    desc:
                      f.note ||
                      (f.default_price_per_m > 0
                        ? `฿${fmtTH(f.default_price_per_m)}`
                        : undefined),
                    data: f,
                  }))}
                  error={errors.code}
                  warning={warnings.code}
                />
              </div>

              {/* Price Input + Save Button */}
              <div className={cn('col-span-12', !stack && 'sm:col-span-5')}>
                <div className="flex gap-2 items-end">
                  <div className="flex-1 min-w-0">
                    <Input
                      label="ราคา / ม."
                      placeholder="0"
                      value={data.price_per_m_raw || ''}
                      onChange={(e) => onNumberChange('price_per_m_raw', e.target.value)}
                      type="number"
                      inputMode="decimal"
                      suffix="฿"
                      className={cn(
                        'w-full text-right font-mono transition-all',
                        mainSyncStatus === 'mismatch'
                          ? 'text-amber-600 bg-amber-50 border-amber-200 focus:ring-amber-500'
                          : errors.price_per_m_raw
                            ? 'border-destructive'
                            : 'border-border'
                      )}
                      error={errors.price_per_m_raw}
                    />
                  </div>

                  {/* Save Button */}
                  {showCatalogTools && data.code && toNum(data.price_per_m_raw) > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        'h-[42px] w-[42px] p-0 shrink-0 border-dashed transition-all',
                        mainSyncStatus === 'mismatch'
                          ? 'border-amber-400 text-amber-500 hover:bg-amber-50'
                          : 'border-border text-muted-foreground hover:text-orange-500'
                      )}
                      onClick={() =>
                        handleSaveToCatalog(
                          data.code,
                          data.price_per_m_raw,
                          FAVORITE_CATEGORIES.CURTAIN_MAIN
                        )
                      }
                      title="บันทึกราคานี้เป็นมาตรฐานใหม่"
                    >
                      {justSaved === FAVORITE_CATEGORIES.CURTAIN_MAIN ? (
                        <Check className="w-5 h-5 text-green-600 animate-in zoom-in" />
                      ) : (
                        <Star
                          className={cn(
                            'w-5 h-5',
                            mainSyncStatus === 'mismatch' && 'fill-amber-100 animate-pulse'
                          )}
                        />
                      )}
                    </Button>
                  )}
                </div>

                {/* Sync Indicator — placed below input row, full width */}
                {showCatalogTools && (
                  <PriceStatusIndicator
                    status={mainSyncStatus}
                    masterPrice={mainMaster.masterPrice}
                    onSync={() => handleSyncPrice(false)}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* --- SHEER FABRIC INPUT --- */}
        {showSheer && (
          <div className={cn(
            "space-y-3 animate-in fade-in slide-in-from-top-2 duration-300",
            showMain && "pt-4 border-t border-dashed border-border"
          )}>
            <div className="flex items-center justify-between border-b border-border/40 pb-2 mb-2">
              <div className="flex items-center gap-2 text-orange-400 font-bold">
                <Sun className="w-4 h-4" />
                <span>ผ้าโปร่ง (Sheer)</span>
              </div>
              {showCatalogTools && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 gap-1 text-muted-foreground hover:text-orange-400"
                onClick={() =>
                  openModal('materialSummary', {
                    initialTab: 'catalog',
                    initialCategory: FAVORITE_CATEGORIES.CURTAIN_SHEER,
                  })
                }
              >
                <Book className="w-3.5 h-3.5" />
                <span className="text-xs">จัดการรายการ</span>
              </Button>
              )}
            </div>

            {/* Responsive grid: 7/5 split */}
            <div className="grid grid-cols-12 gap-3 items-start">
              {/* Code Selection */}
              <div className={cn('col-span-12', !stack && 'sm:col-span-7')}>
                <ComboboxInput<InventoryItem>
                  label="รหัสผ้าโปร่ง"
                  placeholder="ค้นหา..."
                  value={data.sheer_code || ''}
                  onChange={(val) => onChange('sheer_code', val)}
                  onSelect={(item) => {
                    handleSelectFabric(
                      item as SuggestionItem<InventoryItem>,
                      'sheer_code',
                      'sheer_price_per_m'
                    );
                    if (typeof item !== 'string' && item.data) {
                      onSheerFabricSelect(item.data);
                    }
                  }}
                  options={sheerFabrics.map((f) => ({
                    label: f.code,
                    value: f.code,
                    desc:
                      f.note ||
                      (f.default_price_per_m > 0
                        ? `฿${fmtTH(f.default_price_per_m)}`
                        : undefined),
                    data: f,
                  }))}
                  error={errors.sheer_code}
                  warning={warnings.sheer_code}
                />
              </div>

              {/* Price Input + Save Button */}
              <div className={cn('col-span-12', !stack && 'sm:col-span-5')}>
                <div className="flex gap-2 items-end">
                  <div className="flex-1 min-w-0">
                    <Input
                      label="ราคา / ม."
                      placeholder="0"
                      value={data.sheer_price_per_m || ''}
                      onChange={(e) => onNumberChange('sheer_price_per_m', e.target.value)}
                      type="number"
                      inputMode="decimal"
                      suffix="฿"
                      className={cn(
                        'w-full text-right font-mono transition-all',
                        sheerSyncStatus === 'mismatch'
                          ? 'text-amber-600 bg-amber-50 border-amber-200 focus:ring-amber-500'
                          : errors.sheer_price_per_m
                            ? 'border-destructive'
                            : 'border-border'
                      )}
                      error={errors.sheer_price_per_m}
                    />
                  </div>

                  {/* Save Button */}
                  {showCatalogTools && data.sheer_code && toNum(data.sheer_price_per_m) > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        'h-[42px] w-[42px] p-0 shrink-0 border-dashed transition-all',
                        sheerSyncStatus === 'mismatch'
                          ? 'border-amber-400 text-amber-500 hover:bg-amber-50'
                          : 'border-border text-muted-foreground hover:text-orange-400'
                      )}
                      onClick={() =>
                        handleSaveToCatalog(
                          data.sheer_code,
                          data.sheer_price_per_m,
                          FAVORITE_CATEGORIES.CURTAIN_SHEER
                        )
                      }
                      title="บันทึกราคานี้เป็นมาตรฐานใหม่"
                    >
                      {justSaved === FAVORITE_CATEGORIES.CURTAIN_SHEER ? (
                        <Check className="w-5 h-5 text-green-600 animate-in zoom-in" />
                      ) : (
                        <Star
                          className={cn(
                            'w-5 h-5',
                            sheerSyncStatus === 'mismatch' && 'fill-amber-100 animate-pulse'
                          )}
                        />
                      )}
                    </Button>
                  )}
                </div>

                {/* Sync Indicator — placed below input row */}
                {showCatalogTools && (
                  <PriceStatusIndicator
                    status={sheerSyncStatus}
                    masterPrice={sheerMaster.masterPrice}
                    onSync={() => handleSyncPrice(true)}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </FormSection>
    </div>
  );
};