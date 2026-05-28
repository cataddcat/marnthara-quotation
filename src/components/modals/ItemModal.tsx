import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import {
  AlignLeft, ScrollText, Scissors, Grid3X3, Blinds, Columns, Minimize2, ChevronLeft, Save, CheckCircle2,
} from 'lucide-react';
import { useHaptic } from '@/hooks/useHaptic';
import { useAppStore } from '@/store/useAppStore';
import { useUIStore } from '@/store/useUIStore';

// --- [ARCHITECT] IMPORT FORMS FROM FEATURE DIRECTORIES ---
import { CurtainForm, CURTAIN_FORM_ID } from '@/features/curtains/components/CurtainForm';
import { WallpaperForm } from '@/features/wallpapers/components/WallpaperForm';
import { RollerBlindsForm } from '@/features/roller-blinds/components/RollerBlindsForm';
import { WoodenBlindsForm } from '@/features/wooden-blinds/components/WoodenBlindsForm';
import { VerticalBlindsForm } from '@/features/vertical-blinds/components/VerticalBlindsForm';
import { PartitionForm } from '@/features/partition/components/PartitionForm';
import { PleatedScreenForm } from '@/features/pleated-screen/components/PleatedScreenForm';
import { RemovalForm } from '@/features/removal/components/RemovalForm';

import { ItemTypeKey, ItemData } from '@/types';
import { ITEM_CONFIG } from '@/config/constants';
import { ITEM_TYPES } from '@/config/enums';
import { cn } from '@/lib/utils';
// [ARCHITECT] Import Unified Theme System
import { getItemTheme } from '@/lib/theme-utils';

// ✅ FIXED: Updated Props interface to match ModalManager
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

  // Tracks the ID of an item created via auto-save in add mode
  const autoCreatedIdRef = useRef<string | null>(null);

  const normalizeType = (t: string | ItemTypeKey): ItemTypeKey => {
    if (t === 'set') return ITEM_TYPES.CURTAIN;
    return t as ItemTypeKey;
  };

  const [activeType, setActiveType] = useState<ItemTypeKey>(normalizeType(initialItemType));
  const [menuOpen, setMenuOpen] = useState(true);
  const [autoSavedTick, setAutoSavedTick] = useState(0);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset state when modal opens — setState in effect is intentional for modal reset
  /* eslint-disable */
  useEffect(() => {
    if (isOpen) {
      autoCreatedIdRef.current = null;
      if (mode === 'add') {
        setMenuOpen(true);
        setActiveType(normalizeType(initialItemType));
      } else if (mode === 'edit' && initialData) {
        setMenuOpen(false);
        const typeToUse = initialData.type || initialItemType;
        setActiveType(normalizeType(typeToUse));
      }
    }
  }, [isOpen, mode, initialItemType, initialData]);
  /* eslint-enable */

  // Cancel pending auto-save on unmount/close
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, []);

  // Hide auto-save indicator after 2.5s
  useEffect(() => {
    if (autoSavedTick === 0) return;
    const t = setTimeout(() => setAutoSavedTick(0), 2500);
    return () => clearTimeout(t);
  }, [autoSavedTick]);

  const handleSelectType = (typeId: string) => {
    trigger('selection');
    setActiveType(typeId as ItemTypeKey);
    setMenuOpen(false);
  };

  // ── Auto-save on blur (debounced 400ms; ADD + EDIT modes) ─────────────────
  const handleAutoSave = useCallback(
    (data: Partial<ItemData>) => {
      if (!roomId) return;

      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

      autoSaveTimerRef.current = setTimeout(() => {
        // EDIT mode — always update existing item
        if (mode === 'edit' && itemId) {
          updateItem(roomId, itemId, { ...data, type: activeType, id: itemId } as ItemData);
          setAutoSavedTick((n) => n + 1);
          return;
        }

        // ADD mode — create draft only after minimum data is present
        if (mode === 'add') {
          const d = data as Partial<ItemData> & { width_m?: string | number };
          const widthOk = !!d.width_m && parseFloat(String(d.width_m).replace(/,/g, '')) > 0;
          if (!widthOk) return;

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
      }, 400);
    },
    [roomId, mode, itemId, activeType, addItem, updateItem]
  );

  // ── Explicit save (Save button) — always saves, no validation gate ─────────
  const handleSubmit = useCallback(
    (data: Partial<ItemData>) => {
      if (!roomId) return;

      // Flush any pending debounced auto-save so we don't double-save
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }

      if (mode === 'edit' && itemId) {
        updateItem(roomId, itemId, { ...data, type: activeType, id: itemId } as ItemData);
        addToast('success', 'บันทึกการแก้ไขเรียบร้อย');
        onClose();
        return;
      }

      // ADD mode
      if (autoCreatedIdRef.current) {
        // Item was already created via auto-save → update it
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
      addToast('success', 'เพิ่มรายการใหม่เรียบร้อย');
      onClose();
    },
    [roomId, mode, itemId, activeType, addItem, updateItem, addToast, onClose]
  );

  // Get title based on current state
  const getModalTitle = () => {
    if (menuOpen) return 'เลือกประเภทสินค้า';

    const itemName = ITEM_CONFIG[activeType]?.name || activeType;
    if (mode === 'add') return `เพิ่ม${itemName}`;
    return `แก้ไข${itemName}`;
  };

  // Map active type → form id (only forms that opted-in to header save button)
  const activeFormId =
    activeType === ITEM_TYPES.CURTAIN ? CURTAIN_FORM_ID : null;

  const headerActions = !menuOpen ? (
    <div className="flex items-center gap-1.5">
      {/* Auto-save indicator */}
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

      {mode === 'add' && (
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className={cn(
            'flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold transition-all',
            'bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-95'
          )}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          เปลี่ยน
        </button>
      )}
      {activeFormId && (
        <button
          type="submit"
          form={activeFormId}
          className={cn(
            'flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all',
            'bg-brand-curtain text-white hover:bg-brand-curtain/90 active:scale-95',
            'shadow-sm shadow-brand-curtain/30'
          )}
        >
          <Save className="w-3.5 h-3.5" />
          บันทึก
        </button>
      )}
    </div>
  ) : undefined;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={getModalTitle()}
      variant="fullscreen"
      headerAction={headerActions}
    >
      {menuOpen ? (
        /* ── Type Picker: bottom-anchored for thumb reach ── */
        <div className="min-h-full flex flex-col pb-safe-bottom">
          {/* Spacer pushes grid into the lower thumb zone */}
          <div className="flex-1" />

          <div className="space-y-3">
            <p className="text-xs text-muted-foreground text-center font-medium tracking-wide uppercase">
              เลือกประเภทสินค้า
            </p>

            <div className="grid grid-cols-2 gap-2.5">
              {MENU_ITEMS.map((item) => {
                const name = ITEM_CONFIG[item.id]?.name || item.id;
                const theme = getItemTheme(item.id);
                const Icon = TYPE_ICON_MAP[item.id];

                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectType(item.id)}
                    className={cn(
                      'group flex flex-col items-center justify-center gap-2 rounded-2xl border',
                      'h-20 px-3 transition-all duration-150 active:scale-[0.96]',
                      theme.container,
                      theme.hover
                    )}
                  >
                    {Icon && (
                      <div className={cn(
                        'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                        theme.iconWrapper
                      )}>
                        <Icon className={cn('w-5 h-5', theme.icon)} />
                      </div>
                    )}
                    <span className="text-[13px] font-semibold leading-tight text-center text-foreground">
                      {name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* ── Product Form ── */
        <div className="animate-fade-in">
          {activeType === ITEM_TYPES.CURTAIN && (
            <CurtainForm
              initialData={initialData}
              onSubmit={handleSubmit}
              onCancel={onClose}
              onAutoSave={handleAutoSave}
            />
          )}
          {activeType === ITEM_TYPES.WALLPAPER && (
            <WallpaperForm
              initialData={initialData}
              onSubmit={handleSubmit}
              onCancel={onClose}
              onAutoSave={handleAutoSave}
            />
          )}
          {activeType === ITEM_TYPES.ROLLER_BLIND && (
            <RollerBlindsForm
              initialData={initialData}
              onSubmit={handleSubmit}
              onCancel={onClose}
              onAutoSave={handleAutoSave}
            />
          )}
          {(activeType === ITEM_TYPES.WOODEN_BLIND ||
            activeType === ITEM_TYPES.ALUMINUM_BLIND) && (
            <WoodenBlindsForm
              itemType={activeType}
              initialData={initialData}
              onSubmit={handleSubmit}
              onCancel={onClose}
              onAutoSave={handleAutoSave}
            />
          )}
          {activeType === ITEM_TYPES.VERTICAL_BLIND && (
            <VerticalBlindsForm
              initialData={initialData}
              onSubmit={handleSubmit}
              onCancel={onClose}
              onAutoSave={handleAutoSave}
            />
          )}
          {activeType === ITEM_TYPES.PARTITION && (
            <PartitionForm
              initialData={initialData}
              onSubmit={handleSubmit}
              onCancel={onClose}
              onAutoSave={handleAutoSave}
            />
          )}
          {activeType === ITEM_TYPES.PLEATED_SCREEN && (
            <PleatedScreenForm
              initialData={initialData}
              onSubmit={handleSubmit}
              onCancel={onClose}
              onAutoSave={handleAutoSave}
            />
          )}
          {activeType === ITEM_TYPES.REMOVAL && (
            <RemovalForm
              initialData={initialData}
              onSubmit={handleSubmit}
              onCancel={onClose}
              onAutoSave={handleAutoSave}
            />
          )}
        </div>
      )}
    </Modal>
  );
};
