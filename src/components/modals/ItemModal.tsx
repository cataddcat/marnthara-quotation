import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { OptionSheet } from '@/components/ui/OptionSheet';
import { Button } from '@/components/ui/Button';
import {
  AlignLeft, ScrollText, Scissors, Grid3X3, Blinds, Columns, Minimize2,
  Save, CheckCircle2, ChevronDown, Plus, Smartphone, Monitor,
} from 'lucide-react';
import { useHaptic } from '@/hooks/useHaptic';
import { useExperienceMode } from '@/hooks/useExperienceMode';
import { useAppStore } from '@/store/useAppStore';
import { useUIStore } from '@/store/useUIStore';

// --- [ARCHITECT] IMPORT FORMS FROM FEATURE DIRECTORIES ---
import { CurtainForm, CURTAIN_FORM_ID } from '@/features/curtains/components/CurtainForm';
import { WallpaperForm, WALLPAPER_FORM_ID } from '@/features/wallpapers/components/WallpaperForm';
import { RollerBlindsForm, ROLLER_BLINDS_FORM_ID } from '@/features/roller-blinds/components/RollerBlindsForm';
import { WoodenBlindsForm, WOODEN_BLINDS_FORM_ID } from '@/features/wooden-blinds/components/WoodenBlindsForm';
import { VerticalBlindsForm, VERTICAL_BLINDS_FORM_ID } from '@/features/vertical-blinds/components/VerticalBlindsForm';
import { PartitionForm, PARTITION_FORM_ID } from '@/features/partition/components/PartitionForm';
import { PleatedScreenForm, PLEATED_SCREEN_FORM_ID } from '@/features/pleated-screen/components/PleatedScreenForm';
import { RemovalForm, REMOVAL_FORM_ID } from '@/features/removal/components/RemovalForm';

import { ItemTypeKey, ItemData } from '@/types';
import { ITEM_CONFIG } from '@/config/constants';
import { ITEM_TYPES } from '@/config/enums';
import { hasMinimumItemData } from '@/lib/item-status';
import { cn } from '@/lib/utils';
// [ARCHITECT] Import Unified Theme System
import { getItemTheme } from '@/lib/theme-utils';

interface ItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId?: string;
  itemId?: string;
  itemType?: ItemTypeKey;
  initialData?: Partial<ItemData>;
  mode?: 'add' | 'edit';
  onSubmit?: (data: ItemData, isComplete?: boolean) => void;
}

const MENU_ITEMS = [
  { id: ITEM_TYPES.CURTAIN },
  { id: ITEM_TYPES.WOODEN_BLIND },
  { id: ITEM_TYPES.ROLLER_BLIND },
  { id: ITEM_TYPES.VERTICAL_BLIND },
  { id: ITEM_TYPES.PARTITION },
  { id: ITEM_TYPES.PLEATED_SCREEN },
  { id: ITEM_TYPES.WALLPAPER },
  { id: ITEM_TYPES.REMOVAL },
] as const;

const TYPE_ICON_MAP: Record<string, React.ElementType> = {
  [ITEM_TYPES.CURTAIN]: AlignLeft,
  [ITEM_TYPES.WALLPAPER]: ScrollText,
  [ITEM_TYPES.WOODEN_BLIND]: Blinds,
  [ITEM_TYPES.ROLLER_BLIND]: Minimize2,
  [ITEM_TYPES.VERTICAL_BLIND]: Columns,
  [ITEM_TYPES.ALUMINUM_BLIND]: Blinds,
  [ITEM_TYPES.PARTITION]: Grid3X3,
  [ITEM_TYPES.PLEATED_SCREEN]: Grid3X3,
  [ITEM_TYPES.REMOVAL]: Scissors,
};

// แต่ละประเภท → id ของ <form> เพื่อให้ปุ่มใน sticky footer สั่ง submit ได้
const FORM_ID_BY_TYPE: Partial<Record<ItemTypeKey, string>> = {
  [ITEM_TYPES.CURTAIN]: CURTAIN_FORM_ID,
  [ITEM_TYPES.WALLPAPER]: WALLPAPER_FORM_ID,
  [ITEM_TYPES.ROLLER_BLIND]: ROLLER_BLINDS_FORM_ID,
  [ITEM_TYPES.WOODEN_BLIND]: WOODEN_BLINDS_FORM_ID,
  [ITEM_TYPES.ALUMINUM_BLIND]: WOODEN_BLINDS_FORM_ID,
  [ITEM_TYPES.VERTICAL_BLIND]: VERTICAL_BLINDS_FORM_ID,
  [ITEM_TYPES.PARTITION]: PARTITION_FORM_ID,
  [ITEM_TYPES.PLEATED_SCREEN]: PLEATED_SCREEN_FORM_ID,
  [ITEM_TYPES.REMOVAL]: REMOVAL_FORM_ID,
};

export const ItemModal: React.FC<ItemModalProps> = ({
  isOpen,
  onClose,
  roomId,
  itemId,
  itemType: initialItemType = ITEM_TYPES.CURTAIN,
  initialData,
  mode = 'add',
  onSubmit: _onSubmitLegacy, // eslint-disable-line @typescript-eslint/no-unused-vars
}) => {
  const { trigger } = useHaptic();
  const { addItem, updateItem } = useAppStore();
  const addToast = useUIStore((s) => s.addToast);
  const { isLite, setMode } = useExperienceMode();

  // Tracks the ID of an item created via auto-save in add mode
  const autoCreatedIdRef = useRef<string | null>(null);
  // Intent of the next explicit submit ('next' = save & add another, 'close' = save & close)
  const submitIntentRef = useRef<'close' | 'next'>('close');

  const normalizeType = (t: string | ItemTypeKey): ItemTypeKey => {
    if (t === 'set') return ITEM_TYPES.CURTAIN;
    return t as ItemTypeKey;
  };

  const [activeType, setActiveType] = useState<ItemTypeKey>(normalizeType(initialItemType));
  const [typeSheetOpen, setTypeSheetOpen] = useState(false);
  const [autoSavedTick, setAutoSavedTick] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  // Remount key — bumping it resets the form (blank + autofocus) for "save & add next"
  const [formKey, setFormKey] = useState(0);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // ค่าฟอร์มล่าสุดที่ค้างใน debounce — เก็บไว้เพื่อ flush ตอนปิด/unmount (กันค่าช่องสุดท้าย เช่น "ความสูง" หาย)
  const pendingDataRef = useRef<Partial<ItemData> | null>(null);
  // ชี้ไปยัง flush ล่าสุด เพื่อให้ cleanup ตอน unmount เรียกเวอร์ชันปัจจุบันได้
  const flushRef = useRef<() => void>(() => {});

  // Reset state when modal opens — setState in effect is intentional for modal reset
  /* eslint-disable */
  useEffect(() => {
    if (isOpen) {
      autoCreatedIdRef.current = null;
      submitIntentRef.current = 'close';
      setSavedCount(0);
      setFormKey(0);
      setTypeSheetOpen(false);
      if (mode === 'add') {
        setActiveType(normalizeType(initialItemType));
      } else if (mode === 'edit' && initialData) {
        setActiveType(normalizeType(initialData.type || initialItemType));
      }
    }
  }, [isOpen, mode, initialItemType, initialData]);
  /* eslint-enable */

  // Flush ค่าที่ค้างใน auto-save ตอน unmount (กันค่าช่องสุดท้าย เช่น "ความสูง" หายถ้าปิดแบบไม่ผ่าน handleClose)
  useEffect(() => {
    return () => {
      flushRef.current();
    };
  }, []);

  // Hide auto-save indicator after 2.5s
  useEffect(() => {
    if (autoSavedTick === 0) return;
    const t = setTimeout(() => setAutoSavedTick(0), 2500);
    return () => clearTimeout(t);
  }, [autoSavedTick]);

  const handleSelectType = (typeId: ItemTypeKey) => {
    trigger('selection');
    // เปลี่ยนประเภทระหว่างเพิ่ม → เริ่ม draft ใหม่ของประเภทนั้น
    autoCreatedIdRef.current = null;
    setActiveType(typeId);
    setTypeSheetOpen(false);
    setFormKey((k) => k + 1);
  };

  const toggleMode = () => {
    trigger('selection');
    setMode(isLite ? 'full' : 'lite');
  };

  // ── Persist draft (immediate) — ใช้ร่วมทั้ง auto-save (หลัง debounce) และ flush ตอนปิด ──
  const persistDraft = useCallback(
    (data: Partial<ItemData>) => {
      if (!roomId) return;

      // EDIT mode — always update existing item
      if (mode === 'edit' && itemId) {
        updateItem(roomId, itemId, { ...data, type: activeType, id: itemId } as ItemData);
        setAutoSavedTick((n) => n + 1);
        return;
      }

      // ADD mode — create draft only after minimum data is present (per type)
      if (mode === 'add') {
        if (!hasMinimumItemData(activeType, data as Record<string, unknown>)) return;

        if (autoCreatedIdRef.current) {
          updateItem(
            roomId,
            autoCreatedIdRef.current,
            { ...data, type: activeType, id: autoCreatedIdRef.current } as ItemData
          );
        } else {
          const newId = `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          autoCreatedIdRef.current = newId;
          addItem(roomId, { ...data, type: activeType, id: newId } as ItemData);
        }
        setAutoSavedTick((n) => n + 1);
      }
    },
    [roomId, mode, itemId, activeType, addItem, updateItem]
  );

  // ── Auto-save เมื่อ formData เปลี่ยน (debounced 400ms; ADD + EDIT) ─────────
  const handleAutoSave = useCallback(
    (data: Partial<ItemData>) => {
      if (!roomId) return;
      pendingDataRef.current = data;
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = setTimeout(() => {
        autoSaveTimerRef.current = null;
        const pending = pendingDataRef.current;
        pendingDataRef.current = null;
        if (pending) persistDraft(pending);
      }, 400);
    },
    [roomId, persistDraft]
  );

  // ── Flush ค่าที่ค้างทันที (ตอนปิด/unmount) — กัน debounce ที่ยังไม่ยิงหาย ─────
  const flushAutoSave = useCallback(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    const pending = pendingDataRef.current;
    pendingDataRef.current = null;
    if (pending) persistDraft(pending);
  }, [persistDraft]);

  // เก็บ flush ล่าสุดไว้ใน ref เพื่อให้ cleanup ตอน unmount เรียกเวอร์ชันปัจจุบันได้
  useEffect(() => {
    flushRef.current = flushAutoSave;
  }, [flushAutoSave]);

  // ปิด modal: flush ค่าที่ค้างก่อนเสมอ (ทุกทางปิด — X / back / backdrop / Esc)
  const handleClose = useCallback(() => {
    flushAutoSave();
    onClose();
  }, [flushAutoSave, onClose]);

  // ── Explicit save — always saves, no validation gate (Save-First) ──────────
  const handleSubmit = useCallback(
    (data: Partial<ItemData>) => {
      if (!roomId) return;

      // Cancel any pending debounced auto-save so we don't double-save
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
      pendingDataRef.current = null;

      const intent = submitIntentRef.current;
      submitIntentRef.current = 'close'; // reset for next time

      // EDIT mode — update existing item then close
      if (mode === 'edit' && itemId) {
        updateItem(roomId, itemId, { ...data, type: activeType, id: itemId } as ItemData);
        addToast('success', 'บันทึกการแก้ไขเรียบร้อย');
        onClose();
        return;
      }

      // ADD + "เพิ่มถัดไป" — ต้องมีข้อมูลขั้นต่ำก่อน (กันสร้างรายการเปล่า)
      if (intent === 'next' && !hasMinimumItemData(activeType, data as Record<string, unknown>)) {
        addToast('warning', 'กรอกข้อมูลก่อนเพิ่มจุดถัดไป');
        return;
      }

      // ADD mode — create or update the draft item
      if (autoCreatedIdRef.current) {
        updateItem(roomId, autoCreatedIdRef.current, {
          ...data,
          type: activeType,
          id: autoCreatedIdRef.current,
        } as ItemData);
      } else {
        const newId = `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        autoCreatedIdRef.current = newId;
        addItem(roomId, { ...data, type: activeType, id: newId } as ItemData);
      }

      if (intent === 'next') {
        const n = savedCount + 1;
        setSavedCount(n);
        addToast('success', `บันทึกจุดที่ ${n} — กรอกจุดถัดไป`);
        autoCreatedIdRef.current = null; // ครั้งถัดไปสร้างรายการใหม่
        setFormKey((k) => k + 1); // remount → เคลียร์ฟอร์ม + โฟกัสช่องกว้าง
        return; // คงเปิด modal ไว้
      }

      addToast('success', 'บันทึกรายการเรียบร้อย');
      onClose();
    },
    [roomId, mode, itemId, activeType, addItem, updateItem, addToast, onClose, savedCount]
  );

  const itemName = ITEM_CONFIG[activeType]?.name || activeType;
  const title = mode === 'add' ? `เพิ่ม${itemName}` : `แก้ไข${itemName}`;
  const activeFormId = FORM_ID_BY_TYPE[activeType];
  // โหมด Full ทุกประเภทใช้ layout 2 คอลัมน์ → ต้องการ modal กว้างบนเดสก์ท็อป
  const wideTwoCol = !isLite;

  const typeOptions = MENU_ITEMS.map((item) => ({
    label: ITEM_CONFIG[item.id]?.name || item.id,
    value: item.id as ItemTypeKey,
    icon: TYPE_ICON_MAP[item.id],
  }));

  // ── Header: auto-saved badge + mode toggle ─────────────────────────────────
  const headerActions = (
    <div className="flex items-center gap-1.5">
      {autoSavedTick > 0 && (
        <span
          key={autoSavedTick}
          className={cn(
            'flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold',
            'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
            'dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/40',
            'animate-in fade-in zoom-in-95 duration-300'
          )}
        >
          <CheckCircle2 className="w-3 h-3" />
          บันทึกแล้ว
        </span>
      )}
      <button
        type="button"
        onClick={toggleMode}
        title={isLite ? 'โหมดเร็ว (แตะเพื่อโหมดเต็ม)' : 'โหมดเต็ม (แตะเพื่อโหมดเร็ว)'}
        aria-label="สลับโหมดการแสดงผล"
        className="flex items-center gap-1 px-2.5 h-9 rounded-full text-[11px] font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-95 transition-all"
      >
        {isLite ? <Smartphone className="w-3.5 h-3.5" /> : <Monitor className="w-3.5 h-3.5" />}
        {isLite ? 'เร็ว' : 'เต็ม'}
      </button>
    </div>
  );

  // ── Footer: sticky actions (ทุกประเภทสินค้า) ───────────────────────────────
  const footer = activeFormId ? (
    mode === 'edit' ? (
      <Button
        type="submit"
        form={activeFormId}
        size="md"
        className="w-full"
        onClick={() => (submitIntentRef.current = 'close')}
      >
        <Save className="w-4 h-4 mr-2" />
        บันทึกการแก้ไข
      </Button>
    ) : (
      // จัดข้างกันในแถวเดียวทุกอุปกรณ์ + ขอบบาง (md = 48px, px แคบ) ให้กิน footer น้อยลง
      <div className="flex gap-2">
        <Button
          type="submit"
          form={activeFormId}
          size="md"
          className="flex-[1.4] min-w-0 px-3 text-sm whitespace-normal leading-tight"
          onClick={() => (submitIntentRef.current = 'next')}
        >
          <Plus className="w-4 h-4 mr-1.5 shrink-0" />
          บันทึก &amp; เพิ่มจุดถัดไป
        </Button>
        <Button
          type="submit"
          form={activeFormId}
          variant="outline"
          size="md"
          className="flex-1 min-w-0 px-3 text-sm whitespace-normal leading-tight"
          onClick={() => (submitIntentRef.current = 'close')}
        >
          <Save className="w-4 h-4 mr-1.5 shrink-0" />
          บันทึก &amp; ปิด
        </Button>
      </div>
    )
  ) : undefined;

  const theme = getItemTheme(activeType);
  const TypeIcon = TYPE_ICON_MAP[activeType];

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      variant="fullscreen"
      maxWidth={wideTwoCol ? '5xl' : '2xl'}
      headerAction={headerActions}
      footer={footer}
    >
      <div className="animate-fade-in">
        {/* Type switcher (add mode) — แทน type picker เต็มจอเดิม */}
        {mode === 'add' && (
          <button
            type="button"
            onClick={() => setTypeSheetOpen(true)}
            className="w-full flex items-center justify-between gap-2 min-h-[56px] px-4 mb-3 rounded-2xl border border-border bg-card shadow-sm active:scale-[0.99] transition-transform"
          >
            <span className="flex items-center gap-2.5 min-w-0">
              <span className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', theme.iconWrapper)}>
                {TypeIcon && <TypeIcon className={cn('w-5 h-5', theme.icon)} />}
              </span>
              <span className="flex flex-col items-start min-w-0">
                <span className="text-[11px] text-muted-foreground leading-none">ประเภทสินค้า</span>
                <span className="font-bold text-foreground leading-tight truncate">{itemName}</span>
              </span>
            </span>
            <span className="flex items-center gap-1 text-xs font-semibold text-primary shrink-0">
              เปลี่ยน
              <ChevronDown className="w-4 h-4" />
            </span>
          </button>
        )}

        {/* ── Product Form ── */}
        {activeType === ITEM_TYPES.CURTAIN && (
          <CurtainForm
            key={formKey}
            initialData={initialData}
            onSubmit={handleSubmit}
            onCancel={handleClose}
            onAutoSave={handleAutoSave}
            mode={mode}
          />
        )}
        {activeType === ITEM_TYPES.WALLPAPER && (
          <WallpaperForm
            key={formKey}
            initialData={initialData}
            onSubmit={handleSubmit}
            onCancel={handleClose}
            onAutoSave={handleAutoSave}
          />
        )}
        {activeType === ITEM_TYPES.ROLLER_BLIND && (
          <RollerBlindsForm
            key={formKey}
            initialData={initialData}
            onSubmit={handleSubmit}
            onCancel={handleClose}
            onAutoSave={handleAutoSave}
          />
        )}
        {(activeType === ITEM_TYPES.WOODEN_BLIND ||
          activeType === ITEM_TYPES.ALUMINUM_BLIND) && (
          <WoodenBlindsForm
            key={formKey}
            itemType={activeType}
            initialData={initialData}
            onSubmit={handleSubmit}
            onCancel={handleClose}
            onAutoSave={handleAutoSave}
          />
        )}
        {activeType === ITEM_TYPES.VERTICAL_BLIND && (
          <VerticalBlindsForm
            key={formKey}
            initialData={initialData}
            onSubmit={handleSubmit}
            onCancel={handleClose}
            onAutoSave={handleAutoSave}
          />
        )}
        {activeType === ITEM_TYPES.PARTITION && (
          <PartitionForm
            key={formKey}
            initialData={initialData}
            onSubmit={handleSubmit}
            onCancel={handleClose}
            onAutoSave={handleAutoSave}
          />
        )}
        {activeType === ITEM_TYPES.PLEATED_SCREEN && (
          <PleatedScreenForm
            key={formKey}
            initialData={initialData}
            onSubmit={handleSubmit}
            onCancel={handleClose}
            onAutoSave={handleAutoSave}
          />
        )}
        {activeType === ITEM_TYPES.REMOVAL && (
          <RemovalForm
            key={formKey}
            initialData={initialData}
            onSubmit={handleSubmit}
            onCancel={handleClose}
            onAutoSave={handleAutoSave}
          />
        )}
      </div>

      {/* Type switcher sheet */}
      <OptionSheet<ItemTypeKey>
        isOpen={typeSheetOpen}
        onClose={() => setTypeSheetOpen(false)}
        title="เลือกประเภทสินค้า"
        options={typeOptions}
        value={activeType}
        onSelect={(v) => handleSelectType(v)}
      />
    </Modal>
  );
};
