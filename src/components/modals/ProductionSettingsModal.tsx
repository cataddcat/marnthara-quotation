import React, { useState, useMemo, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useAppStore } from '@/store/useAppStore';
import { useUIStore } from '@/store/useUIStore';
import { useConfirm } from '@/hooks/useConfirm';
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  MoreHorizontal,
  Upload,
  Download,
  Scissors,
  Hammer,
  Layers,
  Lock,
  Unlock,
  RotateCcw,
} from 'lucide-react';
import { fmtTH, toNum } from '@/utils/formatters';
import { cn } from '@/lib/utils';
import { Menu, MenuButton, MenuItem, MenuItems, Transition } from '@headlessui/react';
import { LaborCost } from '@/store/slices/CostDataSlice';

interface ProductionSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabId = 'labor' | 'accessories' | 'fabrics';

const TABS = [
  { id: 'labor' as TabId, label: 'ค่าแรง', icon: Scissors },
  { id: 'accessories' as TabId, label: 'อุปกรณ์', icon: Hammer },
  { id: 'fabrics' as TabId, label: 'ผ้า/วัสดุ', icon: Layers },
] as const;

const LABOR_LABELS: Record<string, string> = {
  ลอน: 'ม่านลอน (Wave)',
  จีบ: 'ม่านจีบ (Pleated)',
  ตาไก่: 'ม่านตาไก่ (Eyelet)',
  พับ: 'ม่านพับ (Roman)',
  หลุยส์: 'ม่านหลุยส์ (Louis)',
  แป๊บ: 'ม่านแป๊บ/สอดราง (Rod)',
  ผ้าโปร่ง: 'ผ้าโปร่ง (เย็บชั้นที่ 2 / ทึบ+โปร่ง)',
};

const UNIT_LABELS: Record<string, string> = {
  meter: '/ เมตร',
  yard: '/ หลา',
  sqm: '/ ตร.ม.',
  set: '/ ชุด',
};

const ACCESSORY_LABELS: Record<string, string> = {
  rail_wave: 'รางม่านลอน (โซ่ไข่ปลา)',
  rail_pleated: 'รางม่านจีบ (ราง M)',
  rail_eyelet: 'รางม่านตาไก่ (รางโชว์)',
  rail_roman: 'ชุดรางม่านพับ (Roman System)',
  rail_rod: 'ราวม่านแป๊บ (ราวสอด)',
  rail_louis: 'ราง/กล่อง ม่านหลุยส์',
  eyelet_ring: 'ห่วงตาไก่ (ต่อชิ้น)',
  tape_wave: 'เทปหัวม่าน/โซ่ (ต่อเมตร)',
  rod_bracket: 'ขาจับราง ม่านแป๊บ (ต่อขา)',
  install_point: 'ค่าติดตั้ง (ต่อจุด)',
  install_min: 'ค่าติดตั้งขั้นต่ำ (ต่อเที่ยว)',
  transport_base: 'ค่าเดินทาง กทม./ปริมณฑล',
  transport_upcountry: 'ค่าเดินทางต่างจังหวัด',
  fuel_diesel_liter: 'ราคาน้ำมันดีเซล (อ้างอิง/ลิตร)',
};

interface CurrentItem {
  key: string;
  name: string;
  cost: number;
  unit?: string;
  note?: string;
  priceRef?: number;
  minPrice?: number;
}

interface FormState {
  code: string;
  cost: string;
  unit: string;
  note: string;
  priceRef: string;
  minPrice: string;
}

const EMPTY_FORM: FormState = {
  code: '',
  cost: '',
  unit: 'meter',
  note: '',
  priceRef: '',
  minPrice: '',
};

export const ProductionSettingsModal: React.FC<ProductionSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    laborCosts,
    accessoryCosts,
    fabricCosts,
    favorites,
    updateLaborCost,
    removeLaborCost,
    updateAccessoryCost,
    updateFabricCost,
    removeAccessoryCost,
    removeFabricCost,
    loadDefaultCosts,
    exportSecrets,
    importSecrets,
  } = useAppStore();

  const addToast = useUIStore((state) => state.addToast);
  const { confirm } = useConfirm();

  const [activeTab, setActiveTab] = useState<TabId>('labor');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLocked, setIsLocked] = useState(true);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isAdding, setIsAdding] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Data ─────────────────────────────────────────────────────────────────

  const currentItems = useMemo<CurrentItem[]>(() => {
    let items: CurrentItem[];

    if (activeTab === 'labor') {
      items = Object.entries(laborCosts).map(([k, v]) => ({
        key: k,
        name: LABOR_LABELS[k] || k,
        cost: v.rate,
        unit: UNIT_LABELS[v.unit] || v.unit,
        minPrice: v.min_price,
      }));
    } else if (activeTab === 'accessories') {
      items = Object.entries(accessoryCosts).map(([k, v]) => ({
        key: k,
        name: ACCESSORY_LABELS[k] || k,
        cost: v,
        note: ACCESSORY_LABELS[k] ? k : '',
      }));
    } else {
      items = Object.entries(fabricCosts).map(([k, v]) => {
        let refPrice = 0;
        let refNote = '';
        Object.values(favorites)
          .flat()
          .forEach((f) => {
            if (f.code === k) {
              refPrice = f.default_price_per_m;
              refNote = f.note || '';
            }
          });
        return { key: k, name: k, cost: v, note: refNote, priceRef: refPrice };
      });
    }

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      items = items.filter(
        (i) => i.key.toLowerCase().includes(lower) || i.name.toLowerCase().includes(lower)
      );
    }

    return items.sort((a, b) => a.name.localeCompare(b.name, 'th'));
  }, [activeTab, laborCosts, accessoryCosts, fabricCosts, searchTerm, favorites]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const resetForm = () => {
    setEditingKey(null);
    setIsAdding(false);
    setForm(EMPTY_FORM);
  };

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleStartEdit = (item: CurrentItem) => {
    if (isLocked) return;
    setEditingKey(item.key);
    setIsAdding(false);

    if (activeTab === 'labor') {
      const labor = laborCosts[item.key];
      setForm({
        code: item.key,
        cost: labor?.rate.toString() ?? item.cost.toString(),
        unit: labor?.unit ?? 'meter',
        note: '',
        priceRef: '',
        minPrice: labor?.min_price.toString() ?? '0',
      });
    } else {
      setForm({
        code: item.key,
        cost: item.cost.toString(),
        unit: item.unit ?? '',
        note: item.note ?? '',
        priceRef: item.priceRef ? item.priceRef.toString() : '',
        minPrice: '',
      });
    }
  };

  const handleSave = () => {
    const costVal = parseFloat(form.cost);
    if (!form.code.trim() || isNaN(costVal) || costVal < 0) {
      addToast('error', 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบรหัสและราคา');
      return;
    }

    if (activeTab === 'labor') {
      const minPrice = Math.max(0, parseFloat(form.minPrice) || 0);
      const validUnit = (['meter', 'yard', 'sqm', 'set'] as LaborCost['unit'][]).includes(
        form.unit as LaborCost['unit']
      )
        ? (form.unit as LaborCost['unit'])
        : 'meter';

      if (editingKey && form.code !== editingKey) removeLaborCost(editingKey);
      updateLaborCost(form.code, {
        style: form.code,
        rate: costVal,
        unit: validUnit,
        min_price: minPrice,
      });
    } else if (activeTab === 'accessories') {
      if (editingKey && form.code !== editingKey) removeAccessoryCost(editingKey);
      updateAccessoryCost(form.code, costVal);
    } else {
      if (editingKey && form.code !== editingKey) removeFabricCost(editingKey);
      updateFabricCost(form.code, costVal);
    }

    resetForm();
    addToast('success', 'บันทึกเรียบร้อย');
  };

  const handleDelete = (key: string) => {
    if (activeTab === 'labor') {
      removeLaborCost(key);
    } else if (activeTab === 'accessories') {
      removeAccessoryCost(key);
    } else {
      removeFabricCost(key);
    }
    addToast('success', 'ลบรายการเรียบร้อย');
    resetForm();
  };

  const handleLoadDefaults = async () => {
    const isConfirmed = await confirm({
      title: 'โหลดค่ามาตรฐาน 2025?',
      description:
        'ระบบจะโหลดค่าแรงและราคาอุปกรณ์มาตรฐานตลาดไทย (ข้อมูลจะทับค่าแรงและอุปกรณ์ปัจจุบัน แต่ไม่กระทบต้นทุนผ้า)',
      confirmLabel: 'โหลดค่ามาตรฐาน',
      variant: 'default',
    });
    if (isConfirmed) {
      loadDefaultCosts();
      addToast('success', 'โหลดค่ามาตรฐานสำเร็จ');
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const content = ev.target?.result as string;
        if (importSecrets(content)) {
          addToast('success', 'นำเข้าข้อมูลต้นทุนสำเร็จ');
        } else {
          addToast('error', 'ไฟล์ไม่ถูกต้อง');
        }
      };
      reader.readAsText(file);
    }
    e.target.value = '';
  };

  // ── Form Card ─────────────────────────────────────────────────────────────

  const isLaborTab = activeTab === 'labor';

  const renderFormCard = (isEditMode: boolean) => (
    <div className="p-3 rounded-xl border bg-card border-primary shadow-md ring-1 ring-primary/20 animate-in fade-in zoom-in-95 duration-150 mb-2">
      <div className="space-y-3">
        {/* Row 1 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {isLaborTab ? 'ชื่อสไตล์ม่าน' : 'รหัส / ชื่อรายการ'}
            </label>
            <input
              className="flex h-11 w-full rounded-xl border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-background text-foreground border-input"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder={isLaborTab ? 'เช่น ลอน, จีบ, พับ' : 'เช่น ABC-001'}
              autoFocus={!isEditMode}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {isLaborTab ? 'หน่วย' : 'หมายเหตุ'}
            </label>
            {isLaborTab ? (
              <select
                className="flex h-11 w-full rounded-xl border px-3 text-sm bg-background text-foreground border-input focus:outline-none focus:ring-2 focus:ring-primary/40"
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
              >
                <option value="meter">/ เมตร (กว้างช่อง)</option>
                <option value="yard">/ หลา (ผ้าที่ใช้จริง)</option>
                <option value="sqm">/ ตร.ม. (กว้าง×สูง)</option>
                <option value="set">/ ชุด (เหมา)</option>
              </select>
            ) : (
              <input
                className="flex h-11 w-full rounded-xl border px-3 text-sm bg-background text-foreground border-input focus:outline-none disabled:opacity-60 disabled:bg-muted/30"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                disabled={isEditMode && activeTab !== 'fabrics'}
                placeholder="-"
              />
            )}
          </div>
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-2 gap-3 p-3 bg-muted/40 rounded-xl">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {isLaborTab ? 'ค่าแรง / หน่วย' : 'ต้นทุน'}{' '}
              <span className="text-amber-500">฿</span>
            </label>
            <input
              type="number"
              min="0"
              step="any"
              className="flex h-11 w-full rounded-xl border px-3 text-sm font-bold font-mono text-amber-600 focus:outline-none focus:ring-2 focus:ring-primary/40 bg-background border-input"
              value={form.cost}
              onChange={(e) => setForm({ ...form, cost: e.target.value })}
              autoFocus={isEditMode}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {isLaborTab ? 'ขั้นต่ำ' : 'ราคาขาย (Ref)'}{' '}
              <span className="text-sky-500">฿</span>
            </label>
            {isLaborTab ? (
              <input
                type="number"
                min="0"
                step="any"
                className="flex h-11 w-full rounded-xl border px-3 text-sm font-bold font-mono text-sky-600 focus:outline-none focus:ring-2 focus:ring-primary/40 bg-background border-input"
                value={form.minPrice}
                onChange={(e) => setForm({ ...form, minPrice: e.target.value })}
                placeholder="0"
              />
            ) : (
              <input
                className="flex h-11 w-full rounded-xl border px-3 text-sm font-bold text-emerald-600 bg-muted/30 border-input opacity-70 cursor-default"
                value={toNum(form.priceRef) > 0 ? `฿${fmtTH(parseFloat(form.priceRef))}` : '-'}
                readOnly
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-1 border-t border-border/50">
          {isEditMode ? (
            <button
              onClick={() => handleDelete(editingKey!)}
              className="inline-flex items-center gap-1.5 h-8 px-3 text-xs rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> ลบรายการ
            </button>
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            <button
              onClick={resetForm}
              className="inline-flex items-center gap-1.5 h-8 px-3 text-xs rounded-lg text-muted-foreground hover:bg-accent transition-colors"
            >
              <X className="w-3.5 h-3.5" /> ยกเลิก
            </button>
            <button
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 h-8 px-3 text-xs rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-colors"
            >
              <Save className="w-3.5 h-3.5" /> บันทึก
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="ตั้งค่าต้นทุน (Vault)" maxWidth="2xl">
      <input
        type="file"
        ref={fileInputRef}
        accept=".json,.key,.txt"
        className="hidden"
        onChange={handleImportFile}
      />

      <div className="space-y-3 pb-safe-area h-[600px] flex flex-col">
        {/* Header Tools */}
        <div className="flex gap-2 items-center bg-card p-1.5 rounded-xl border border-border shadow-sm shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="ค้นหา..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 h-10 bg-muted/50 rounded-lg text-sm border-transparent focus:border-primary focus:ring-0 focus:outline-none"
            />
          </div>

          <Button
            variant={isLocked ? 'outline' : 'destructive'}
            size="icon"
            onClick={() => {
              setIsLocked(!isLocked);
              resetForm();
            }}
            className="w-10 h-10 shrink-0"
            title={isLocked ? 'ปลดล็อคเพื่อแก้ไข' : 'ล็อคป้องกัน'}
          >
            {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
          </Button>

          {!isLocked && (
            <Button
              onClick={() => {
                setIsAdding(true);
                setEditingKey(null);
                setForm(EMPTY_FORM);
              }}
              className="h-10 shrink-0 bg-primary text-primary-foreground px-3 gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline text-sm font-medium">เพิ่ม</span>
            </Button>
          )}

          <Menu as="div" className="relative">
            <MenuButton as={Button} variant="ghost" size="icon" className="w-10 h-10">
              <MoreHorizontal className="w-5 h-5" />
            </MenuButton>
            <Transition
              enter="transition duration-100 ease-out"
              enterFrom="transform scale-95 opacity-0"
              enterTo="transform scale-100 opacity-100"
              leave="transition duration-75 ease-out"
              leaveFrom="transform scale-100 opacity-100"
              leaveTo="transform scale-95 opacity-0"
            >
              <MenuItems className="absolute right-0 mt-2 w-56 bg-popover border border-border rounded-xl shadow-lg z-50 p-1 focus:outline-none">
                <MenuItem>
                  {({ active }) => (
                    <button
                      onClick={handleLoadDefaults}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm',
                        active && 'bg-accent'
                      )}
                    >
                      <RotateCcw className="w-4 h-4 text-primary" />
                      <div className="text-left">
                        <div className="font-medium">โหลดค่ามาตรฐาน 2025</div>
                        <div className="text-xs text-muted-foreground">ราคาตลาดไทย (แรง + อุปกรณ์)</div>
                      </div>
                    </button>
                  )}
                </MenuItem>
                <div className="h-px bg-border my-1" />
                <MenuItem>
                  {({ active }) => (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm',
                        active && 'bg-accent'
                      )}
                    >
                      <Upload className="w-4 h-4" /> นำเข้า (.json/.key)
                    </button>
                  )}
                </MenuItem>
                <MenuItem>
                  {({ active }) => (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(exportSecrets());
                        addToast('success', 'คัดลอก JSON แล้ว');
                      }}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm',
                        active && 'bg-accent'
                      )}
                    >
                      <Download className="w-4 h-4" /> ส่งออก (Copy JSON)
                    </button>
                  )}
                </MenuItem>
              </MenuItems>
            </Transition>
          </Menu>
        </div>

        {/* Tabs */}
        <div className="flex p-1 bg-muted rounded-xl shrink-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                resetForm();
                setSearchTerm('');
              }}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all',
                activeTab === tab.id
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5 rounded-xl border border-border p-2 bg-background/50">
          {isAdding && renderFormCard(false)}

          {currentItems.length === 0 && !isAdding && (
            <div className="flex flex-col items-center justify-center py-14 text-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
                <Layers className="w-7 h-7 text-muted-foreground opacity-40" />
              </div>
              <div>
                <p className="font-semibold text-foreground">ยังไม่มีข้อมูลต้นทุน</p>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  โหลดค่ามาตรฐานตลาดไทยเพื่อเริ่มต้น
                  <br />
                  หรือเพิ่มรายการด้วยตนเอง
                </p>
              </div>
              <Button variant="outline" onClick={handleLoadDefaults} className="gap-2 mt-1">
                <RotateCcw className="w-4 h-4" />
                โหลดค่ามาตรฐาน 2025
              </Button>
            </div>
          )}

          {currentItems.map((item) => {
            const isEditing = editingKey === item.key;
            if (isEditing) return <div key={item.key}>{renderFormCard(true)}</div>;

            return (
              <div
                key={item.key}
                onClick={() => !isLocked && handleStartEdit(item)}
                className={cn(
                  'px-3 py-2.5 rounded-xl border transition-all bg-card border-border group',
                  !isLocked &&
                    'hover:border-primary/40 cursor-pointer hover:bg-primary/5 active:scale-[0.99]'
                )}
              >
                <div className="flex items-center gap-3">
                  {/* Name + Sub */}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-foreground truncate leading-tight">
                      {item.name}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate mt-0.5 font-mono">
                      {activeTab === 'labor'
                        ? `${item.unit} · ขั้นต่ำ ฿${fmtTH(item.minPrice ?? 0)}`
                        : item.note || item.key}
                    </div>
                  </div>

                  {/* Price */}
                  <div className="text-right shrink-0">
                    <div className="font-mono font-bold text-sm text-amber-600 dark:text-amber-400">
                      ฿{fmtTH(item.cost)}
                    </div>
                    {toNum(item.priceRef) > 0 && (
                      <div className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70 font-mono">
                        ขาย ฿{fmtTH(item.priceRef ?? 0)}
                      </div>
                    )}
                  </div>

                  {/* Edit icon */}
                  {!isLocked && (
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary/70 transition-colors shrink-0" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer hint */}
        {currentItems.length > 0 && isLocked && (
          <p className="text-center text-xs text-muted-foreground shrink-0">
            กดปุ่ม <span className="font-medium">🔒 ล็อค</span> เพื่อแก้ไขหรือเพิ่มรายการ
          </p>
        )}
      </div>
    </Modal>
  );
};
