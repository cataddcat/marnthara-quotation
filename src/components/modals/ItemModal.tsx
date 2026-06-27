import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { CheckCircle2, ChevronDown } from 'lucide-react';
import { useHaptic } from '@/hooks/useHaptic';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useAppStore } from '@/store/useAppStore';
import { useNotificationStore } from '@/store/standalone/useNotificationStore';

import { CurtainForm, CURTAIN_FORM_ID } from '@/features/curtains/components/CurtainForm';
import { WallpaperForm, WALLPAPER_FORM_ID } from '@/features/wallpapers/components/WallpaperForm';
import {
  RollerBlindsForm,
  ROLLER_BLINDS_FORM_ID,
} from '@/features/roller-blinds/components/RollerBlindsForm';
import {
  WoodenBlindsForm,
  WOODEN_BLINDS_FORM_ID,
} from '@/features/wooden-blinds/components/WoodenBlindsForm';
import {
  VerticalBlindsForm,
  VERTICAL_BLINDS_FORM_ID,
} from '@/features/vertical-blinds/components/VerticalBlindsForm';
import { PartitionForm, PARTITION_FORM_ID } from '@/features/partition/components/PartitionForm';
import {
  PleatedScreenForm,
  PLEATED_SCREEN_FORM_ID,
} from '@/features/pleated-screen/components/PleatedScreenForm';
import { RemovalForm, REMOVAL_FORM_ID } from '@/features/removal/components/RemovalForm';

import { ItemTypeKey, ItemData } from '@/types';
import { ITEM_CONFIG } from '@/config/constants';
import { ITEM_TYPES } from '@/config/enums';
import { hasMinimumItemData } from '@/lib/item-status';
import { normalizeDimensionFields } from '@/utils/formatters';
import { cn } from '@/lib/utils';

interface ItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId?: string;
  itemId?: string;
  itemType?: ItemTypeKey;
  initialData?: Partial<ItemData>;
  mode?: 'add' | 'edit';
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

// ไทล์เลือกประเภท — "สีประจำชนิด" (brand): พื้น tint อ่อน + ตัวอักษร + ขอบ hue เดียวกัน.
// คลาส static literal เท่านั้น (Tailwind JIT สแกนเจอ — แพทเทิร์นเดียวกับ TYPE_CHIP_PLATE ใน ItemCard;
// ห้ามประกอบจาก template var ดู memory tailwind-dynamic-class-gotcha). token --brand-* จูน AA ครบ 5 ธีม.
const TYPE_TILE_CLASS: Partial<Record<ItemTypeKey, string>> = {
  [ITEM_TYPES.CURTAIN]: 'bg-brand-curtain/10 text-brand-curtain-ink border-brand-curtain/30',
  [ITEM_TYPES.WALLPAPER]: 'bg-brand-wallpaper/10 text-brand-wallpaper-ink border-brand-wallpaper/30',
  [ITEM_TYPES.WOODEN_BLIND]: 'bg-brand-wood/10 text-brand-wood-ink border-brand-wood/30',
  [ITEM_TYPES.ALUMINUM_BLIND]: 'bg-brand-alum/10 text-brand-alum-ink border-brand-alum/30',
  [ITEM_TYPES.ROLLER_BLIND]: 'bg-brand-roller/10 text-brand-roller-ink border-brand-roller/30',
  [ITEM_TYPES.VERTICAL_BLIND]: 'bg-brand-vertical/10 text-brand-vertical-ink border-brand-vertical/30',
  [ITEM_TYPES.PARTITION]: 'bg-brand-partition/10 text-brand-partition-ink border-brand-partition/30',
  [ITEM_TYPES.PLEATED_SCREEN]: 'bg-brand-screen/10 text-brand-screen-ink border-brand-screen/30',
  [ITEM_TYPES.REMOVAL]: 'bg-brand-removal/10 text-brand-removal-ink border-brand-removal/30',
};

export const ItemModal: React.FC<ItemModalProps> = ({
  isOpen,
  onClose,
  roomId,
  itemId,
  itemType: initialItemType = ITEM_TYPES.CURTAIN,
  initialData,
  mode = 'add',
}) => {
  const { trigger } = useHaptic();
  const { addItem, updateItem } = useAppStore();
  const addToast = useNotificationStore((s) => s.addToast);
  const isMobile = useIsMobile();
  // ชื่อห้องปัจจุบัน — แสดงด้านบน Modal กันผู้ใช้สับสนว่ากำลังเพิ่ม/แก้ไขในห้องไหน
  const roomName = useAppStore((s) => s.rooms.find((r) => r.id === roomId)?.name);

  // Tracks the ID of an item created via auto-save in add mode
  const autoCreatedIdRef = useRef<string | null>(null);
  // Intent of the next explicit submit ('next' = save & add another, 'close' = save & close)
  const submitIntentRef = useRef<'close' | 'next'>('close');
  // ค่า re-hydrate ฟอร์มตอน "เปลี่ยน → เลือกประเภทเดิมซ้ำ": อ่าน draft ที่ autosave ไว้มาใส่เป็น initialData
  // ตอน mount ใหม่ (ฟอร์มกลับมาพร้อมค่าที่กรอก ไม่เห็นฟอร์มเปล่า). null = ใช้ initialData ปกติ.
  // เป็น state (ไม่ใช่ ref) เพราะต้องอ่านตอน render เพื่อส่งเป็น initialData ของฟอร์ม
  const [hydrateData, setHydrateData] = useState<Partial<ItemData> | null>(null);

  const normalizeType = (t: string | ItemTypeKey): ItemTypeKey => {
    if (t === 'set') return ITEM_TYPES.CURTAIN;
    return t as ItemTypeKey;
  };

  const [activeType, setActiveType] = useState<ItemTypeKey>(normalizeType(initialItemType));
  // โหมด add: ต้อง "เลือกประเภทสินค้าก่อน" จึงจะ mount ฟอร์ม (typeConfirmed=false → แสดงกริดเลือกประเภท).
  // "เปลี่ยน" ก็สลับกลับ false เพื่อกลับมากริดเดิม — กริดเป็น picker ทางเดียว (ไม่มี sheet ซ้อน).
  // โหมด edit ถือว่ายืนยันประเภทแล้วเสมอ
  const [typeConfirmed, setTypeConfirmed] = useState(false);
  const [autoSavedTick, setAutoSavedTick] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  // Remount key — bumping it resets the form (blank + autofocus) for "save & add next"
  const [formKey, setFormKey] = useState(0);
  // ฟอร์มยังว่าง (ไม่มีข้อมูลขั้นต่ำ) → ซ่อน footer ปุ่มบันทึก (กันสร้างรายการเปล่า; ปิดด้วย ✕ หัว modal)
  const [isFormEmpty, setIsFormEmpty] = useState(true);
  // ฟอร์มถูกแก้แล้วหรือยัง (dirty) — footer ปุ่มบันทึกโผล่เฉพาะหลังผู้ใช้แก้จริง
  // (edit: เปิดรายการเดิมมาเฉย ๆ ยังไม่แก้ → ไม่โชว์ปุ่ม เหลือแค่ ✕)
  const [isDirty, setIsDirty] = useState(false);
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
      setHydrateData(null);
      submitIntentRef.current = 'close';
      setSavedCount(0);
      setFormKey(0);
      setIsDirty(false); // เปิดใหม่ → ยังไม่ถูกแก้ (edit: ซ่อนปุ่มบันทึกจนกว่าจะแก้)
      // add → เริ่มที่หน้าเลือกประเภท (ยังไม่ mount ฟอร์ม); edit → เข้าฟอร์มทันที
      setTypeConfirmed(mode === 'edit');
      if (mode === 'add') {
        setActiveType(normalizeType(initialItemType));
      } else if (mode === 'edit' && initialData) {
        setActiveType(normalizeType(initialData.type || initialItemType));
      }
      // ฟอร์มเริ่ม: add = ว่าง; edit = ดูจากข้อมูลเดิม
      setIsFormEmpty(
        mode === 'edit' && initialData
          ? !hasMinimumItemData(
              normalizeType(initialData.type || initialItemType),
              initialData as Record<string, unknown>
            )
          : true
      );
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
    setIsDirty(false); // ฟอร์ม mount ใหม่ (resume/เปลี่ยนประเภท) → ยังไม่ถูกแก้
    // เลือกประเภทเดิม (กด "เปลี่ยน" แล้วเปลี่ยนใจ) → กลับเข้าฟอร์มเดิม + re-hydrate ค่าจาก draft ที่ autosave ไว้
    // (ฟอร์มกลับมาพร้อมค่าที่กรอก ไม่เห็นฟอร์มเปล่า; draft id เดิมยังอยู่ กันสร้างรายการซ้ำ)
    if (typeId === activeType) {
      const draft = (
        autoCreatedIdRef.current
          ? useAppStore
              .getState()
              .rooms.find((r) => r.id === roomId)
              ?.items.find((it) => it.id === autoCreatedIdRef.current)
          : undefined
      ) as Partial<ItemData> | undefined;
      setHydrateData(draft ?? null);
      setTypeConfirmed(true);
      setIsFormEmpty(draft ? !hasMinimumItemData(typeId, draft as Record<string, unknown>) : true);
      return;
    }
    // เปลี่ยนเป็นประเภทอื่นจริง → เริ่ม draft ใหม่ของประเภทนั้น (ฟอร์มเปล่า ไม่ re-hydrate)
    // (Save-First: รายการประเภทเดิมที่กรอกถึงขั้นต่ำแล้วยังถูกบันทึกไว้ในห้อง)
    setHydrateData(null);
    autoCreatedIdRef.current = null;
    setActiveType(typeId);
    setTypeConfirmed(true);
    setFormKey((k) => k + 1);
    setIsFormEmpty(true); // ฟอร์มประเภทใหม่ว่าง → ซ่อน footer จนกว่าจะกรอก
  };

  // ── Persist draft (immediate) — ใช้ร่วมทั้ง auto-save (หลัง debounce) และ flush ตอนปิด ──
  const persistDraft = useCallback(
    (raw: Partial<ItemData>) => {
      if (!roomId) return;

      // Normalize ขนาด (ซม.→ม.) ให้ทุกเส้นทางบันทึก (autosave/flush ตอนปิด) ได้ค่าเดียวกับ
      // explicit submit — กันค่าดิบ "278" ค้างเมื่อปิดโดยไม่กดบันทึก (idempotent)
      const data = normalizeDimensionFields(raw as Record<string, unknown>) as Partial<ItemData>;

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
          updateItem(roomId, autoCreatedIdRef.current, {
            ...data,
            type: activeType,
            id: autoCreatedIdRef.current,
          } as ItemData);
        } else {
          // ให้ store gen id แล้วเก็บ id จริงไว้ — update รอบถัดไป (เช่นกรอก "ความสูง") จะตรงรายการเดิม
          autoCreatedIdRef.current = addItem(roomId, { ...data, type: activeType } as ItemData);
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
      setIsDirty(true); // ผู้ใช้แก้ฟอร์มแล้ว (useFormAutoSave ยิงเฉพาะตอนแก้จริง ไม่ยิงตอน mount)
      // ติดตามสถานะ "ฟอร์มว่าง" ทันที (ไม่รอ debounce) เพื่อแสดง/ซ่อน footer ปุ่มบันทึก
      const empty = !hasMinimumItemData(activeType, data as Record<string, unknown>);
      setIsFormEmpty((prev) => (prev === empty ? prev : empty));
      pendingDataRef.current = data;
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = setTimeout(() => {
        autoSaveTimerRef.current = null;
        const pending = pendingDataRef.current;
        pendingDataRef.current = null;
        if (pending) persistDraft(pending);
      }, 400);
    },
    [roomId, persistDraft, activeType]
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

      // ADD + ปิด ทั้งที่ยังว่าง → ปิดเฉย ๆ ไม่สร้างรายการเปล่า (กันทั้งปุ่มและ Enter-submit)
      if (intent === 'close' && !hasMinimumItemData(activeType, data as Record<string, unknown>)) {
        onClose();
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
        // ให้ store gen id แล้วเก็บ id จริงไว้ (กัน id ไม่ตรงทำให้ค่าที่แก้รอบถัดไปหาย)
        autoCreatedIdRef.current = addItem(roomId, { ...data, type: activeType } as ItemData);
      }

      if (intent === 'next') {
        const n = savedCount + 1;
        setSavedCount(n);
        addToast('success', `บันทึกจุดที่ ${n} — กรอกจุดถัดไป`);
        autoCreatedIdRef.current = null; // ครั้งถัดไปสร้างรายการใหม่
        setHydrateData(null); // ฟอร์มใหม่ไม่ re-hydrate
        setFormKey((k) => k + 1); // remount → เคลียร์ฟอร์ม + โฟกัสช่องกว้าง
        setIsFormEmpty(true); // ฟอร์มใหม่ว่าง → ซ่อน footer จนกว่าจะกรอก
        setIsDirty(false); // ฟอร์มใหม่ยังไม่ถูกแก้
        return; // คงเปิด modal ไว้
      }

      addToast('success', 'บันทึกรายการเรียบร้อย');
      onClose();
    },
    [roomId, mode, itemId, activeType, addItem, updateItem, addToast, onClose, savedCount]
  );

  const itemName = ITEM_CONFIG[activeType]?.name || activeType;
  // add: แสดงฟอร์มหลังเลือกประเภทแล้วเท่านั้น; edit: แสดงฟอร์มทันที
  const showForm = mode === 'edit' || typeConfirmed;
  const title =
    mode === 'add'
      ? typeConfirmed
        ? `เพิ่ม${itemName}`
        : 'เลือกประเภทสินค้า'
      : `แก้ไข${itemName}`;
  const activeFormId = FORM_ID_BY_TYPE[activeType];
  // initialData ที่ส่งให้ฟอร์ม: ปกติ = prop; ถ้า resume ประเภทเดิม → re-hydrate จาก draft (hydrateData)
  const formInitialData = hydrateData ?? initialData;
  // จอกว้าง (desktop) ทุกประเภทใช้ layout 2 คอลัมน์ → ต้องการ modal กว้าง (ถัง Layout — ไม่ใช่โหมดงาน)
  const wideTwoCol = !isMobile;

  const typeOptions = MENU_ITEMS.map((item) => ({
    label: ITEM_CONFIG[item.id]?.name || item.id,
    value: item.id as ItemTypeKey,
  }));

  // ── Header: auto-saved badge (ตัวสลับโหมดหน้างาน/ละเอียดอยู่ header แอป + เมนูหลัก — ไม่เบียดปุ่มปิด) ──
  const headerActions = (
    <div className="flex items-center gap-1.5">
      {autoSavedTick > 0 && (
        <span
          key={autoSavedTick}
          className={cn(
            'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold',
            'bg-emerald-50 text-emerald-700 eeert:text-emerald-800 border border-emerald-200/60',
            'dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/40',
            'animate-in fade-in zoom-in-95 duration-300'
          )}
        >
          <CheckCircle2 className="w-3 h-3" />
          บันทึกแล้ว
        </span>
      )}
    </div>
  );

  // ── Footer = ปุ่ม "ลอย" ชิดขวาล่าง (Modal footerFloating; ไม่มีแถบ). ยังไม่แก้/ฟอร์มว่าง = ไม่มีปุ่ม
  //    (เปิด edit มาเฉย ๆ เห็นแค่ ✕). แก้แล้ว+ข้อมูลครบ → add: [บันทึก & เพิ่ม][บันทึก] · edit: [บันทึก] เดียว.
  //    ยกเลิก/ปิดใช้ปุ่ม ✕ หัว modal (Save-First: draft autosave ยังอยู่ ไม่ทำลาย) ──
  const footer =
    showForm && activeFormId && isDirty && !isFormEmpty ? (
      <div className="flex items-center justify-end gap-2.5">
        {mode === 'add' && (
          <Button
            type="submit"
            form={activeFormId}
            variant="secondary"
            size="md"
            className="rounded-full px-5"
            onClick={() => (submitIntentRef.current = 'next')}
          >
            บันทึก & เพิ่ม
          </Button>
        )}
        <Button
          type="submit"
          form={activeFormId}
          size="md"
          className="rounded-full px-6"
          onClick={() => (submitIntentRef.current = 'close')}
        >
          บันทึก
        </Button>
      </div>
    ) : undefined;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      description={roomName ? `📍 ห้อง: ${roomName}` : undefined}
      variant="fullscreen"
      maxWidth={wideTwoCol ? '5xl' : '2xl'}
      headerAction={headerActions}
      footer={footer}
      footerFloating={!!footer}
      contentFill={mode === 'add' && !typeConfirmed}
    >
      {mode === 'add' && !typeConfirmed ? (
        // เลือกประเภท — ไทล์ "สีประจำชนิด" (brand); มือถือ: กริด flex-1 + auto-rows-fr ให้ไทล์ "ขยายเติมเต็มจอ"
        // พอดีกับจำนวนรายการ (ไม่เหลือช่องว่างโล่งด้านบน) + อยู่โซนล่างแตะถึง. เดสก์ท็อป: กริดปกติ content-sized (68px)
        // (Modal contentFill ทำ content wrapper เป็น flex-col ตอน fullscreen).
        <div className="animate-fade-in flex flex-1 flex-col">
          <p className="px-1 pt-1 pb-3 text-sm text-muted-foreground">เลือกสิ่งที่จะเพิ่มในห้องนี้</p>
          <div className="mx-auto grid w-full max-w-md flex-1 auto-rows-fr grid-cols-2 gap-2.5 pb-safe-bottom-min">
            {typeOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelectType(opt.value)}
                className={cn(
                  'flex min-h-[68px] items-center justify-center rounded-2xl border px-3 text-center text-base font-bold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card',
                  TYPE_TILE_CLASS[opt.value] ?? 'border-border bg-card text-foreground'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="animate-fade-in">
          <>
            {/* Type switcher (add mode) — แตะเพื่อกลับไปกริดเลือกประเภท (picker ทางเดียว) */}
            {mode === 'add' && (
              <button
                type="button"
                onClick={() => setTypeConfirmed(false)}
                className="w-full flex items-center justify-between gap-2 min-h-[56px] px-4 mb-3 rounded-xl border border-border bg-card active:scale-[0.99] transition-transform"
              >
                <span className="flex flex-col items-start min-w-0">
                  <span className="text-xs text-muted-foreground leading-none">ประเภทสินค้า</span>
                  <span className="font-bold text-foreground leading-tight truncate">{itemName}</span>
                </span>
                <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground shrink-0">
                  เปลี่ยน
                  <ChevronDown className="w-4 h-4" strokeWidth={1.5} />
                </span>
              </button>
            )}

            {/* ── Product Form ── */}
            {activeType === ITEM_TYPES.CURTAIN && (
              <CurtainForm
                key={formKey}
                initialData={formInitialData}
                onSubmit={handleSubmit}
                onAutoSave={handleAutoSave}
                mode={mode}
              />
            )}
            {activeType === ITEM_TYPES.WALLPAPER && (
              <WallpaperForm
                key={formKey}
                initialData={formInitialData}
                onSubmit={handleSubmit}
                onAutoSave={handleAutoSave}
              />
            )}
            {activeType === ITEM_TYPES.ROLLER_BLIND && (
              <RollerBlindsForm
                key={formKey}
                initialData={formInitialData}
                onSubmit={handleSubmit}
                onAutoSave={handleAutoSave}
              />
            )}
            {(activeType === ITEM_TYPES.WOODEN_BLIND ||
              activeType === ITEM_TYPES.ALUMINUM_BLIND) && (
              <WoodenBlindsForm
                key={formKey}
                itemType={activeType}
                initialData={formInitialData}
                onSubmit={handleSubmit}
                onAutoSave={handleAutoSave}
              />
            )}
            {activeType === ITEM_TYPES.VERTICAL_BLIND && (
              <VerticalBlindsForm
                key={formKey}
                initialData={formInitialData}
                onSubmit={handleSubmit}
                onAutoSave={handleAutoSave}
              />
            )}
            {activeType === ITEM_TYPES.PARTITION && (
              <PartitionForm
                key={formKey}
                initialData={formInitialData}
                onSubmit={handleSubmit}
                onAutoSave={handleAutoSave}
              />
            )}
            {activeType === ITEM_TYPES.PLEATED_SCREEN && (
              <PleatedScreenForm
                key={formKey}
                initialData={formInitialData}
                onSubmit={handleSubmit}
                onAutoSave={handleAutoSave}
              />
            )}
            {activeType === ITEM_TYPES.REMOVAL && (
              <RemovalForm
                key={formKey}
                initialData={formInitialData}
                onSubmit={handleSubmit}
                onAutoSave={handleAutoSave}
              />
            )}
          </>
        </div>
      )}
    </Modal>
  );
};
