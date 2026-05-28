import React, { useState, useRef, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useAppStore } from '@/store/useAppStore';
import { useInventory, HydratedInventoryItem } from '@/hooks/useInventory';
import {
  Save,
  Search,
  Pencil,
  MoreHorizontal,
  Plus,
  DownloadCloud,
  Upload,
  ChevronRight,
  X,
} from 'lucide-react';
import { fmtTH, toNum } from '@/utils/formatters';
import { FAVORITE_CATEGORIES } from '@/config/enums';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/Input';
import { Menu, MenuButton, MenuItem, MenuItems, Transition } from '@headlessui/react';
import { useUIStore } from '@/store/useUIStore';
import { useIsMobile } from '@/hooks/useIsMobile';
import { modalPropsAs } from '@/store/slices/UISlice';

interface InventoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Interface สำหรับข้อมูลฟอร์ม
interface FormData {
  code: string;
  price: string;
  cost_per_yard: string;
  note: string;
}

// --- W3C & Mobile Optimized Components ---

// 1. Mobile Card Item (สำหรับแสดงผล)
const MobileInventoryCard = ({
  item,
  onClick,
}: {
  item: HydratedInventoryItem;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="w-full text-left bg-card p-4 rounded-xl border border-border shadow-sm active:scale-[0.98] transition-all flex justify-between items-center group relative overflow-hidden"
    aria-label={`แก้ไขรายการ ${item.code}`}
  >
    {/* Left Side: Code & Note */}
    <div className="flex-1 min-w-0 pr-4 flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="font-mono font-bold text-base text-foreground truncate">{item.code}</span>
        {item.note && (
          <span className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground truncate max-w-[120px]">
            {item.note}
          </span>
        )}
      </div>
      {/* Smart Price Layout */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          {/* ✅ FIXED: ใช้ default_price_per_m แทน price */}
          <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
            {fmtTH(item.default_price_per_m)}
          </span>
        </div>
        {toNum(item.cost_per_yard) > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground/70">
            (ทุน {fmtTH(item.cost_per_yard)})
          </div>
        )}
      </div>
    </div>

    {/* Right Side: Arrow & Edit Hint */}
    <div className="flex flex-col items-end justify-center h-full text-muted-foreground/30 group-hover:text-primary transition-colors">
      <ChevronRight className="w-5 h-5" />
    </div>
  </button>
);

// 2. Focused Edit Form (เมื่อกด Card จะขยายเป็น Form นี้)
const FocusedMobileForm = ({
  data,
  setData,
  onSave,
  onCancel,
  isEdit,
}: {
  data: FormData;
  setData: React.Dispatch<React.SetStateAction<FormData>>;
  onSave: () => void;
  onCancel: () => void;
  isEdit: boolean;
  hasCost?: boolean;
}) => {
  const isMobile = useIsMobile();

  return (
    <div
      className={cn(
        'bg-card border border-border rounded-xl shadow-lg animate-in zoom-in-95 duration-200',
        isMobile ? 'p-4' : 'p-6'
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-bold text-foreground flex items-center gap-2">
          <Pencil className="w-4 h-4 text-primary" />
          {isEdit ? 'แก้ไขรายการ' : 'เพิ่มรายการใหม่'}
        </div>
        {isMobile && (
          <button onClick={onCancel} className="p-1 rounded-full hover:bg-muted" aria-label="ปิด">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="space-y-4">
        <Input
          label="รหัสสินค้า (Code)"
          value={data.code}
          onChange={(e) => setData({ ...data, code: e.target.value })}
          className="font-mono text-lg font-bold"
          autoFocus={!isEdit}
          placeholder="ตัวอย่าง: C1001"
        />

        <div className={cn('grid gap-3', isMobile ? 'grid-cols-1' : 'grid-cols-2')}>
          <Input
            label="ราคาขาย (Default Price)"
            type="number"
            value={data.price}
            onChange={(e) => setData({ ...data, price: e.target.value })}
            className="text-emerald-600 font-bold"
            placeholder="0.00"
          />
          <Input
            label="ราคาทุน (Cost)"
            type="number"
            value={data.cost_per_yard}
            onChange={(e) => setData({ ...data, cost_per_yard: e.target.value })}
            placeholder="0.00"
            className="text-rose-600"
          />
        </div>

        <Input
          label="หมายเหตุ (Note)"
          value={data.note}
          onChange={(e) => setData({ ...data, note: e.target.value })}
          placeholder="เพิ่มหมายเหตุ (ถ้ามี)"
        />

        <div className={cn('flex gap-2 pt-4', isMobile ? 'flex-col' : 'flex-row')}>
          <Button variant="ghost" className={isMobile ? 'w-full' : 'flex-1'} onClick={onCancel}>
            ยกเลิก
          </Button>
          <Button className={isMobile ? 'w-full' : 'flex-1'} onClick={onSave}>
            <Save className="w-4 h-4 mr-2" /> บันทึก
          </Button>
        </div>
      </div>
    </div>
  );
};

export const InventoryManagerModal: React.FC<InventoryManagerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { addFavorite, updateFavorite, importFavorites, updateUnifiedCost, favorites, activeModal, modalProps } = useAppStore();
  const invProps = modalPropsAs(activeModal, modalProps, 'inventoryManager');
  const addToast = useUIStore((state) => state.addToast);
  const isMobile = useIsMobile();

  // State
  const [activeCategory, setActiveCategory] = useState<string>(FAVORITE_CATEGORIES.CURTAIN_MAIN);
  
  // ✅ Initialize Search + Tab + Auto-prefill from Props (Smart Jump)
  const [searchQuery, setSearchQuery] = useState('');
  // ใช้ ref เพื่อป้องกัน auto-create trigger ซ้ำหลังผู้ใช้ปิดฟอร์มเอง
  const pendingPrefillRef = useRef<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const search = invProps?.initialSearch || '';
      setSearchQuery(search);
      if (invProps?.initialTab) setActiveCategory(invProps.initialTab);

      // ถ้า jump มาพร้อม prefillCode → เก็บไว้รอ check ว่ารหัสมีอยู่แล้วหรือเปล่า
      pendingPrefillRef.current = invProps?.prefillCode || null;

      // Reset form state เมื่อเปิดใหม่
      setIsCreating(false);
      setEditingId(null);
    }
  }, [isOpen, invProps]);

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editData, setEditData] = useState<FormData>({
    code: '',
    price: '',
    cost_per_yard: '',
    note: ''
  });

  // Scroll Ref
  const listRef = useRef<HTMLDivElement>(null);

  // ✅ FIXED: Destructure items ออกมาจาก object ที่ Hook return
  const { items: currentItems } = useInventory(activeCategory);

  const filteredItems = (currentItems || []).filter(
    (item) =>
      item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.note?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ถ้า jump มาพร้อมรหัสที่ยังไม่มีในคลัง → เปิดฟอร์มเพิ่มใหม่พร้อม pre-fill รหัสนั้น
  useEffect(() => {
    const code = pendingPrefillRef.current;
    if (!isOpen || !code) return;
    if (filteredItems.length === 0 && !isCreating && !editingId) {
      pendingPrefillRef.current = null; // ป้องกัน trigger ซ้ำ
      setIsCreating(true);
      setEditingId(null);
      setEditData({ code, price: '', cost_per_yard: '', note: '' });
      if (listRef.current) listRef.current.scrollTop = 0;
    }
  }, [filteredItems, isOpen, isCreating, editingId]);

  const startEdit = (item: HydratedInventoryItem) => {
    setEditingId(item.id);
    setIsCreating(false);
    setEditData({
      code: item.code,
      price: item.default_price_per_m.toString(),
      cost_per_yard: item.cost_per_yard?.toString() || '',
      note: item.note || '',
    });

    // Scroll to top on mobile when editing
    if (isMobile && listRef.current) {
      listRef.current.scrollTop = 0;
    }
  };

  const startCreate = () => {
    setIsCreating(true);
    setEditingId(null);
    setEditData({ code: '', price: '', cost_per_yard: '', note: '' });

    // Scroll to top
    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }
  };

  const saveEdit = () => {
    if (!editData.code.trim()) {
      return addToast('error', 'กรุณาระบุรหัสสินค้า');
    }

    const payload = {
      code: editData.code.trim(),
      default_price_per_m: toNum(editData.price),
      cost_per_yard: toNum(editData.cost_per_yard),
      note: editData.note.trim(),
    };

    if (isCreating) {
      addFavorite(activeCategory, payload);
      addToast('success', 'เพิ่มรายการเรียบร้อย');
      setIsCreating(false);
      setEditData({ code: '', price: '', cost_per_yard: '', note: '' });
    } else if (editingId) {
      updateFavorite(activeCategory, editingId, payload);
      // Sync Cost if changed
      if (toNum(editData.cost_per_yard) > 0) {
        updateUnifiedCost(editData.code.trim(), toNum(editData.cost_per_yard));
      }
      addToast('success', 'บันทึกการแก้ไขแล้ว');
      setEditingId(null);
    }
  };

  // --- File Import/Export ---
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    try {
      const dataStr = JSON.stringify({ favorites }, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `marnthara_inventory_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      addToast('success', 'ส่งออกข้อมูลสำเร็จ');
    } catch {
      // ไม่ต้องประกาศตัวแปรถ้าไม่ใช้ (Optional Catch Binding)
      addToast('error', 'ส่งออกล้มเหลว', 'เกิดข้อผิดพลาดในการส่งออกข้อมูล');
    }
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      addToast('error', 'ไฟล์มีขนาดใหญ่เกินไป (จำกัด 5MB)');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        if (importFavorites(content)) {
          addToast('success', 'นำเข้าข้อมูลสำเร็จ');
        } else {
          addToast('error', 'นำเข้าล้มเหลว', 'รูปแบบไฟล์ไม่ถูกต้อง');
        }
      } catch {
        // ไม่ต้องประกาศตัวแปรถ้าไม่ใช้ (Optional Catch Binding)
        addToast('error', 'นำเข้าล้มเหลว', 'ไม่สามารถอ่านไฟล์ได้');
      }
    };
    reader.onerror = () => {
      addToast('error', 'นำเข้าล้มเหลว', 'เกิดข้อผิดพลาดในการอ่านไฟล์');
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset
  };

  const categories = [
    { id: FAVORITE_CATEGORIES.CURTAIN_MAIN, label: 'ผ้าม่าน (ทึบ)' },
    { id: FAVORITE_CATEGORIES.CURTAIN_SHEER, label: 'ผ้าโปร่ง' },
    { id: FAVORITE_CATEGORIES.WALLPAPER, label: 'วอลเปเปอร์' },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="คลังรหัสผ้าและต้นทุน" variant="fullscreen">
      <div className={cn('flex flex-col h-full', isMobile ? 'p-0' : 'p-1')}>
        {/* 1. HEADER & SEARCH */}
        <div
          className={cn(
            'bg-background border-b border-border space-y-3 z-10 shadow-sm sticky top-0',
            isMobile ? 'p-4' : 'p-6 pb-4'
          )}
        >
          {/* Category Pills */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id);
                  setIsCreating(false);
                  setEditingId(null);
                }}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border',
                  activeCategory === cat.id
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-muted text-muted-foreground border-transparent hover:bg-muted/80'
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search & Actions */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="ค้นหารหัส / หมายเหตุ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-9 pr-4 rounded-lg bg-muted/50 border-none focus:ring-2 focus:ring-primary/20 text-sm"
                aria-label="ค้นหารายการสินค้า"
              />
            </div>

            {/* Quick Actions Menu */}
            <Menu as="div" className="relative">
              <MenuButton
                className="h-10 w-10 flex items-center justify-center rounded-lg border border-border hover:bg-muted"
                aria-label="เมนูการจัดการ"
              >
                <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
              </MenuButton>
              <Transition
                enter="transition duration-100 ease-out"
                enterFrom="transform scale-95 opacity-0"
                enterTo="transform scale-100 opacity-100"
                leave="transition duration-75 ease-out"
                leaveFrom="transform scale-100 opacity-100"
                leaveTo="transform scale-95 opacity-0"
              >
                <MenuItems className="absolute right-0 mt-2 w-48 bg-popover rounded-xl shadow-xl border border-border focus:outline-none z-50 p-1">
                  <MenuItem>
                    {({ active }) => (
                      <button
                        onClick={startCreate}
                        className={cn(
                          'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm',
                          active ? 'bg-muted' : ''
                        )}
                      >
                        <Plus className="w-4 h-4" /> เพิ่มรายการใหม่
                      </button>
                    )}
                  </MenuItem>
                  <div className="h-px bg-border my-1" />
                  <MenuItem>
                    {({ active }) => (
                      <button
                        onClick={handleExport}
                        className={cn(
                          'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm',
                          active ? 'bg-muted' : ''
                        )}
                      >
                        <DownloadCloud className="w-4 h-4" /> ส่งออกข้อมูล (Backup)
                      </button>
                    )}
                  </MenuItem>
                  <MenuItem>
                    {({ active }) => (
                      <button
                        onClick={handleImportClick}
                        className={cn(
                          'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm',
                          active ? 'bg-muted' : ''
                        )}
                      >
                        <Upload className="w-4 h-4" /> นำเข้าข้อมูล (Restore)
                      </button>
                    )}
                  </MenuItem>
                </MenuItems>
              </Transition>
            </Menu>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".json"
              onChange={handleFileChange}
              aria-label="นำเข้าข้อมูลจากไฟล์"
            />
          </div>
        </div>

        {/* 2. SCROLLABLE LIST */}
        <div
          ref={listRef}
          className={cn(
            'flex-1 overflow-y-auto bg-muted/10',
            isMobile ? 'p-4 space-y-3' : 'p-6 space-y-4'
          )}
        >
          {/* --- A. CREATE FORM (Top) --- */}
          {isCreating && (
            <FocusedMobileForm
              data={editData}
              setData={setEditData}
              onSave={saveEdit}
              onCancel={() => setIsCreating(false)}
              isEdit={false}
            />
          )}

          {/* --- B. ITEM LIST (Mobile Cards) --- */}
          {filteredItems.length === 0 && !isCreating ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-muted-foreground">
              <Search className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">ไม่พบรายการสินค้า</p>
              <p className="text-sm text-center mt-1">
                {searchQuery ? 'ลองค้นหาด้วยคำอื่น' : 'ลองเพิ่มรายการใหม่โดยคลิกปุ่ม +'}
              </p>
              {!searchQuery && (
                <Button variant="outline" className="mt-4" onClick={startCreate}>
                  <Plus className="w-4 h-4 mr-2" /> เพิ่มรายการแรก
                </Button>
              )}
            </div>
          ) : (
            filteredItems.map((item) => (
              <React.Fragment key={item.id}>
                {editingId === item.id ? (
                  // --- EDIT FORM (Focused vertical stack) ---
                  <FocusedMobileForm
                    data={editData}
                    setData={setEditData}
                    onSave={saveEdit}
                    onCancel={() => setEditingId(null)}
                    isEdit={true}
                    hasCost={toNum(item.cost_per_yard) > 0}
                  />
                ) : (
                  // --- VIEW CARD (Tappable) ---
                  <MobileInventoryCard item={item} onClick={() => startEdit(item)} />
                )}
              </React.Fragment>
            ))
          )}

          {/* Bottom padding for easy scrolling */}
          <div className={isMobile ? 'h-20' : 'h-10'} />
        </div>
      </div>
    </Modal>
  );
};