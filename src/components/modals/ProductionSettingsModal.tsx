import React, { useState, useMemo, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useAppStore } from '@/store/useAppStore';
import { useUIStore } from '@/store/useUIStore';
import { useConfirm } from '@/hooks/useConfirm';
import { COST_DATA_YEAR } from '@/config/constants';
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
  Layers,
  Lock,
  Unlock,
  RotateCcw,
  Bookmark,
  History,
  Scissors,
  Wrench,
  Hammer,
  Calculator,
} from 'lucide-react';
import { Switch } from '@/components/ui/Switch';
import { fmtTH, toNum } from '@/utils/formatters';
import { cn } from '@/lib/utils';
import { Menu, MenuButton, MenuItem, MenuItems, Transition } from '@headlessui/react';
import { LaborCost } from '@/store/slices/CostDataSlice';
import { isCatalogContract } from '@/lib/catalog/contract';

interface ProductionSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ชนิดรายการต้นทุนที่แก้มือได้ (Vault = ของร้านเอง) — ค่าเย็บ + บริการ
// ทุนสินค้า (ผ้า/ราง/ฮาร์ดแวร์) ย้ายไปจัดการที่ "คลังวัสดุ" (catalog) แล้ว
type ItemKind = 'labor' | 'service';

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

// ค่าบริการ — แสดงในแท็บ "บริการ" (flat rate ต่อจุด)
const SERVICE_LABELS: Record<string, string> = {
  install_point: 'ค่าติดตั้ง (ต่อจุด)',
  removal_per_point: 'ค่ารื้อถอน (ต่อจุด)',
};

interface CurrentItem {
  kind: ItemKind;
  key: string;
  name: string;
  cost: number;
  unit?: string;
  note?: string;
  priceRef?: number;
  minPrice?: number;
}

interface ItemSection {
  kind: ItemKind;
  title?: string;
  addLabel?: string;
  items: CurrentItem[];
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
    serviceCosts,
    updateLaborCost,
    removeLaborCost,
    updateServiceCost,
    removeServiceCost,
    loadDefaultCosts,
    userCostDefaults,
    saveCostDefaults,
    loadCostDefaults,
    exportSecrets,
    importSecrets,
    importCatalog,
    exportCatalog,
    costInclude,
    setCostInclude,
  } = useAppStore();

  const addToast = useUIStore((state) => state.addToast);
  const { confirm } = useConfirm();

  const [searchTerm, setSearchTerm] = useState('');
  const [isLocked, setIsLocked] = useState(true);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isAdding, setIsAdding] = useState(false);
  const [formKind, setFormKind] = useState<ItemKind>('labor');
  const [activeTab, setActiveTab] = useState<ItemKind>('labor');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Data ─────────────────────────────────────────────────────────────────

  const sections = useMemo<ItemSection[]>(() => {
    const matchSearch = (items: CurrentItem[]): CurrentItem[] => {
      if (!searchTerm) return items;
      const lower = searchTerm.toLowerCase();
      return items.filter(
        (i) => i.key.toLowerCase().includes(lower) || i.name.toLowerCase().includes(lower)
      );
    };
    const sortByName = (items: CurrentItem[]): CurrentItem[] =>
      [...items].sort((a, b) => a.name.localeCompare(b.name, 'th'));
    const prep = (items: CurrentItem[]) => sortByName(matchSearch(items));

    const laborItems: CurrentItem[] = Object.entries(laborCosts).map(([k, v]) => ({
      kind: 'labor',
      key: k,
      name: LABOR_LABELS[k] || k,
      cost: v.rate,
      unit: UNIT_LABELS[v.unit] || v.unit,
      minPrice: v.min_price,
    }));
    const serviceItems: CurrentItem[] = Object.entries(serviceCosts).map(([k, v]) => ({
      kind: 'service',
      key: k,
      name: SERVICE_LABELS[k] || k,
      cost: v,
      note: SERVICE_LABELS[k] ? k : '',
    }));
    return [
      { kind: 'labor', addLabel: 'เพิ่มค่าเย็บ', items: prep(laborItems) },
      { kind: 'service', addLabel: 'เพิ่มบริการ', items: prep(serviceItems) },
    ];
  }, [laborCosts, serviceCosts, searchTerm]);

  const totalItemCount = sections.reduce((sum, sec) => sum + sec.items.length, 0);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const resetForm = () => {
    setEditingKey(null);
    setIsAdding(false);
    setForm(EMPTY_FORM);
  };

  const startAdd = (kind: ItemKind) => {
    setIsAdding(true);
    setEditingKey(null);
    setFormKind(kind);
    setForm(EMPTY_FORM);
  };

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleStartEdit = (item: CurrentItem) => {
    if (isLocked) return;
    setEditingKey(item.key);
    setIsAdding(false);
    setFormKind(item.kind);

    if (item.kind === 'labor') {
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

    if (formKind === 'labor') {
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
    } else {
      if (editingKey && form.code !== editingKey) removeServiceCost(editingKey);
      updateServiceCost(form.code, costVal);
    }

    resetForm();
    addToast('success', 'บันทึกเรียบร้อย');
  };

  const handleDelete = (key: string, kind: ItemKind) => {
    if (kind === 'labor') removeLaborCost(key);
    else removeServiceCost(key);
    addToast('success', 'ลบรายการเรียบร้อย');
    resetForm();
  };

  const handleLoadDefaults = async () => {
    const isConfirmed = await confirm({
      title: `โหลดค่ามาตรฐาน ${COST_DATA_YEAR}?`,
      description:
        'ระบบจะโหลดค่าเย็บ + บริการ มาตรฐานตลาดไทย (ทับค่าเย็บ/บริการปัจจุบัน — ไม่กระทบต้นทุนผ้า/ราง)',
      confirmLabel: 'โหลดค่ามาตรฐาน',
      variant: 'default',
    });
    if (isConfirmed) {
      loadDefaultCosts();
      addToast('success', 'โหลดค่ามาตรฐานสำเร็จ');
    }
  };

  const handleSaveMyDefaults = async () => {
    const ok = await confirm({
      title: 'บันทึกเป็นค่าตั้งต้นของฉัน?',
      description:
        'ระบบจะจดจำค่าเย็บ + บริการ ปัจจุบันเป็นจุดเริ่มต้นของคุณ — กด "โหลดค่าตั้งต้นของฉัน" เพื่อย้อนกลับมาค่านี้ได้ทุกเมื่อ',
      confirmLabel: 'บันทึก',
      variant: 'default',
    });
    if (ok) {
      saveCostDefaults();
      addToast('success', 'บันทึกค่าตั้งต้นของคุณแล้ว');
    }
  };

  const handleLoadMyDefaults = async () => {
    const ok = await confirm({
      title: 'โหลดค่าตั้งต้นของฉัน?',
      description: 'ค่าเย็บ + บริการ จะถูกแทนที่ด้วยค่าตั้งต้นที่คุณบันทึกไว้ (ไม่กระทบต้นทุนผ้า/ราง)',
      confirmLabel: 'โหลด',
      variant: 'default',
    });
    if (ok) {
      loadCostDefaults();
      addToast('success', 'คืนค่าตั้งต้นของคุณแล้ว');
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const content = ev.target?.result as string;
        // auto-detect: Catalog Contract (สินค้า) ก่อน → ไม่ใช่ค่อย fallback เป็น vault-dump
        try {
          const data = JSON.parse(content);
          if (isCatalogContract(data)) {
            const res = importCatalog(data);
            if (res.ok) addToast('success', `นำเข้าแค็ตตาล็อก ${res.imported} รายการ`);
            else addToast('error', `แค็ตตาล็อกไม่ถูกต้อง: ${res.errors[0] ?? ''}`);
            e.target.value = '';
            return;
          }
        } catch {
          // ไม่ใช่ JSON ตรงๆ (อาจเป็น base64/secrets) → ปล่อยให้ importSecrets จัดการ
        }
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

  const renderFormCard = (isEditMode: boolean, kind: ItemKind) => {
    const isLaborKind = kind === 'labor';
    const labelCls = 'text-xs font-semibold text-muted-foreground uppercase tracking-wide';
    const fieldCls =
      'flex h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring';
    return (
      <div className="p-3 rounded-xl border border-primary/40 bg-card shadow-sm animate-in fade-in zoom-in-95 duration-150 mb-2">
        <div className="space-y-3">
          {isLaborKind ? (
            <>
              {/* ชื่อสไตล์ | หน่วย */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className={labelCls}>ชื่อสไตล์ม่าน</label>
                  <input
                    className={cn(fieldCls, 'text-foreground')}
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    placeholder="เช่น ลอน, จีบ, พับ"
                    autoFocus={!isEditMode}
                  />
                </div>
                <div className="space-y-1">
                  <label className={labelCls}>หน่วย</label>
                  <select
                    className={cn(fieldCls, 'text-foreground')}
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  >
                    <option value="meter">/ เมตร (กว้างช่อง)</option>
                    <option value="yard">/ หลา (ผ้าที่ใช้จริง)</option>
                    <option value="sqm">/ ตร.ม. (กว้าง×สูง)</option>
                    <option value="set">/ ชุด (เหมา)</option>
                  </select>
                </div>
              </div>

              {/* ค่าแรง | ขั้นต่ำ */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-muted/40 rounded-lg">
                <div className="space-y-1">
                  <label className={labelCls}>
                    ค่าแรง / หน่วย <span className="text-amber-500">฿</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className={cn(fieldCls, 'font-mono font-bold text-amber-600')}
                    value={form.cost}
                    onChange={(e) => setForm({ ...form, cost: e.target.value })}
                    autoFocus={isEditMode}
                  />
                </div>
                <div className="space-y-1">
                  <label className={labelCls}>
                    ขั้นต่ำ <span className="text-muted-foreground">฿</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className={cn(fieldCls, 'font-mono font-bold text-foreground')}
                    value={form.minPrice}
                    onChange={(e) => setForm({ ...form, minPrice: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              {/* บริการ — ชื่อ + ต้นทุน/จุด (เลขเดียว ไม่มีหน่วย/ราคาขาย) */}
              <div className="space-y-1">
                <label className={labelCls}>ชื่อรายการบริการ</label>
                <input
                  className={cn(fieldCls, 'text-foreground')}
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="เช่น ค่าติดตั้ง (ต่อจุด)"
                  autoFocus={!isEditMode}
                />
              </div>
              <div className="space-y-1 p-3 bg-muted/40 rounded-lg">
                <label className={labelCls}>
                  ต้นทุน / จุด <span className="text-amber-500">฿</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  className={cn(fieldCls, 'font-mono font-bold text-amber-600')}
                  value={form.cost}
                  onChange={(e) => setForm({ ...form, cost: e.target.value })}
                  autoFocus={isEditMode}
                />
              </div>
            </>
          )}

          {/* Footer */}
          <div className="flex justify-between items-center pt-1 border-t border-border/50">
            {isEditMode ? (
              <button
                onClick={() => handleDelete(editingKey!, kind)}
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
  };

  const renderRow = (item: CurrentItem) => {
    const isEditing = editingKey === item.key && formKind === item.kind;
    if (isEditing) return <div key={`${item.kind}:${item.key}`}>{renderFormCard(true, item.kind)}</div>;

    return (
      <div
        key={`${item.kind}:${item.key}`}
        onClick={() => !isLocked && handleStartEdit(item)}
        className={cn(
          'px-3 py-2.5 rounded-lg border transition-all bg-card border-border group',
          !isLocked &&
            'hover:border-foreground/30 cursor-pointer hover:bg-muted/50 active:scale-[0.99]'
        )}
      >
        <div className="flex items-center gap-3">
          {/* Name + Sub */}
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm text-foreground truncate leading-tight">
              {item.name}
            </div>
            <div className="text-xs text-muted-foreground truncate mt-0.5 font-mono">
              {item.kind === 'labor'
                ? `${item.unit}${(item.minPrice ?? 0) > 0 ? ` · ขั้นต่ำ ฿${fmtTH(item.minPrice ?? 0)}` : ''}`
                : item.note || item.key}
            </div>
          </div>

          {/* Price */}
          <div className="text-right shrink-0">
            <div className="font-mono font-bold text-sm text-amber-600 dark:text-amber-400">
              ฿{fmtTH(item.cost)}
            </div>
            {toNum(item.priceRef) > 0 && (
              <div className="text-xs text-emerald-600/70 dark:text-emerald-400/70 font-mono">
                ขาย ฿{fmtTH(item.priceRef ?? 0)}
              </div>
            )}
          </div>

          {/* Edit icon */}
          {!isLocked && (
            <Pencil className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-foreground transition-colors shrink-0" strokeWidth={1.5} />
          )}
        </div>
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="ตั้งค่าต้นทุน" maxWidth="2xl">
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
              <MenuItems className="absolute right-0 mt-2 w-56 bg-popover border border-border rounded-xl shadow-md z-50 p-1 focus:outline-none">
                <MenuItem>
                  {({ active }) => (
                    <button
                      onClick={handleLoadDefaults}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm',
                        active && 'bg-accent'
                      )}
                    >
                      <RotateCcw className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                      <div className="text-left">
                        <div className="font-medium">โหลดค่ามาตรฐาน {COST_DATA_YEAR}</div>
                        <div className="text-xs text-muted-foreground">ค่าเย็บ + บริการ (ราคาตลาดไทย)</div>
                      </div>
                    </button>
                  )}
                </MenuItem>
                <div className="h-px bg-border my-1" />
                <MenuItem>
                  {({ active }) => (
                    <button
                      onClick={handleSaveMyDefaults}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm',
                        active && 'bg-accent'
                      )}
                    >
                      <Bookmark className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                      <div className="text-left">
                        <div className="font-medium">บันทึกเป็นค่าตั้งต้นของฉัน</div>
                        <div className="text-xs text-muted-foreground">จดจำค่าเย็บ + บริการ ปัจจุบันเป็นจุดเริ่มต้น</div>
                      </div>
                    </button>
                  )}
                </MenuItem>
                {userCostDefaults && (
                  <MenuItem>
                    {({ active }) => (
                      <button
                        onClick={handleLoadMyDefaults}
                        className={cn(
                          'flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm',
                          active && 'bg-accent'
                        )}
                      >
                        <History className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                        <div className="text-left">
                          <div className="font-medium">โหลดค่าตั้งต้นของฉัน</div>
                          <div className="text-xs text-muted-foreground">
                            บันทึกเมื่อ{' '}
                            {new Date(userCostDefaults.savedAt).toLocaleDateString('th-TH', {
                              day: 'numeric',
                              month: 'short',
                              year: '2-digit',
                            })}
                          </div>
                        </div>
                      </button>
                    )}
                  </MenuItem>
                )}
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
                        addToast('success', 'คัดลอกทุนทั้งหมดแล้ว');
                      }}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm',
                        active && 'bg-accent'
                      )}
                    >
                      <Download className="w-4 h-4" /> ส่งออกทุน (ทั้งหมด)
                    </button>
                  )}
                </MenuItem>
                <MenuItem>
                  {({ active }) => (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(exportCatalog());
                        addToast('success', 'คัดลอกแค็ตตาล็อกแล้ว');
                      }}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm',
                        active && 'bg-accent'
                      )}
                    >
                      <Download className="w-4 h-4" /> ส่งออกแค็ตตาล็อก (สินค้า)
                    </button>
                  )}
                </MenuItem>
              </MenuItems>
            </Transition>
          </Menu>
        </div>

        {/* สวิตช์ "นับรวมในทุนประมาณการ" — mode ไม่ใช่ข้อมูลทุน จึงอยู่นอก lock
            ปิด = CostEngine ข้ามส่วนนั้น (ไม่ขึ้น "ไม่ทราบทุน") → บันทึกจ่ายจริงใน "การเงินของงาน" แทน */}
        <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2 shrink-0">
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
            <Calculator className="w-3.5 h-3.5" strokeWidth={1.5} />
            นับรวมในทุนประมาณการ
          </div>
          <div className="space-y-1">
            {(
              [
                { key: 'labor', Icon: Scissors, label: 'ค่าเย็บ' },
                { key: 'rail', Icon: Hammer, label: 'ค่าราง/อุปกรณ์' },
                { key: 'service', Icon: Wrench, label: 'ค่าบริการติดตั้ง/รื้อถอน' },
              ] as const
            ).map(({ key, Icon, label }) => (
              <div
                key={key}
                className="flex items-center justify-between gap-3 py-1.5 cursor-pointer select-none active:opacity-80 transition-opacity"
                onClick={() => setCostInclude(key, !costInclude[key])}
              >
                <div className="flex items-center gap-2 text-sm text-foreground min-w-0">
                  <Icon className="w-4 h-4 text-muted-foreground shrink-0" strokeWidth={1.5} />
                  <span className={cn(!costInclude[key] && 'text-muted-foreground line-through')}>
                    {label}
                  </span>
                  {!costInclude[key] && (
                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full shrink-0">
                      ไม่นับ
                    </span>
                  )}
                </div>
                <Switch
                  checked={costInclude[key]}
                  onCheckedChange={() => {}}
                  className="pointer-events-none shrink-0"
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            ปิดเมื่อทุนส่วนนั้นไม่แน่นอน (เช่น จ้างเหมาช่าง) แล้วบันทึกจ่ายจริงใน{' '}
            <span className="font-medium text-foreground">การเงินของงาน</span> แทน
          </p>
        </div>

        {/* Tabs: ค่าเย็บ / บริการ */}
        <div className="flex gap-1 p-1 bg-muted/50 rounded-lg shrink-0">
          {[
            { k: 'labor' as ItemKind, Icon: Scissors, label: 'ค่าเย็บ', count: Object.keys(laborCosts).length },
            { k: 'service' as ItemKind, Icon: Wrench, label: 'บริการ', count: Object.keys(serviceCosts).length },
          ].map(({ k, Icon, label, count }) => {
            const active = activeTab === k;
            return (
              <button
                key={k}
                onClick={() => {
                  setActiveTab(k);
                  resetForm();
                }}
                className={cn(
                  'flex-1 h-9 rounded-md text-sm font-semibold transition-colors inline-flex items-center justify-center gap-1.5',
                  active
                    ? 'bg-card border border-border text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="w-4 h-4" strokeWidth={1.5} />
                {label}
                <span
                  className={cn(
                    'min-w-[1.25rem] h-5 px-1 rounded text-xs font-mono inline-flex items-center justify-center',
                    active ? 'bg-muted text-foreground' : 'bg-muted/60 text-muted-foreground'
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-0.5 rounded-xl border border-border p-2 bg-background/50">
          {totalItemCount === 0 && !isAdding && (
            <div className="flex flex-col items-center justify-center py-14 text-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center">
                <Layers className="w-7 h-7 text-muted-foreground opacity-40" strokeWidth={1.5} />
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
                โหลดค่ามาตรฐาน {COST_DATA_YEAR}
              </Button>
            </div>
          )}

          {sections
            .filter((section) => section.kind === activeTab)
            .map((section) => (
              <div key={section.kind} className="space-y-1.5">
                {isAdding && formKind === section.kind && renderFormCard(false, section.kind)}

                {section.items.map((item) => renderRow(item))}

                {!isLocked && section.addLabel && !(isAdding && formKind === section.kind) && (
                  <button
                    onClick={() => startAdd(section.kind)}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed border-border/60 text-xs text-muted-foreground hover:text-foreground hover:border-border hover:bg-muted/20 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {section.addLabel}
                  </button>
                )}
              </div>
            ))}
        </div>

        {/* Footer hint */}
        {totalItemCount > 0 && isLocked && (
          <p className="text-center text-xs text-muted-foreground shrink-0">
            กดปุ่ม <span className="font-medium">🔒 ล็อค</span> เพื่อแก้ไขหรือเพิ่มรายการ
          </p>
        )}
      </div>
    </Modal>
  );
};
