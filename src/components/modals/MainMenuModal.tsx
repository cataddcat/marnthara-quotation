import React, { useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import {
  Sun,
  Moon,
  ShieldCheck,
  HardHat,
  ClipboardList,
  Gem,
  Contrast,
  Sparkles,
  ChevronRight,
  Lock,
  Unlock,
  KeyRound,
  GripVertical,
  Copy,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { APP_VERSION } from '@/config/constants';
import { useAppStore } from '@/store/useAppStore';
import { useThemeStore } from '@/store/useThemeStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useUIStore } from '@/store/useUIStore';
import { useHaptic } from '@/hooks/useHaptic';
import { useExperienceMode } from '@/hooks/useExperienceMode';
import { useSyncStatus } from '@/hooks/useSyncStatus';
import { useRole } from '@/hooks/useRole';
import { AdminGate } from '@/components/ui/AdminGate';
import { MENU_GROUP_TONE, MENU_ICON_TONE, type MenuIconTone } from '@/config/dataTones';
import { Cloud, CloudOff, LogOut } from 'lucide-react';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getOrderedEntries, useMenuConfigStore } from '@/store/useMenuConfigStore';
import type { MenuAction, MenuBlockId, MenuEntry } from '@/config/menuItems';

interface MainMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenOverview?: () => void;
  onOpenJobs: () => void;
  onOpenSignIn: () => void;
  onOpenCustomerDirectory: () => void;
  onOpenPdf: () => void;
  onOpenCopySummary: () => void;
  onOpenLookbook: () => void;
  onOpenCustomer: () => void;
  onOpenShopSettings: () => void;
  onOpenDiscount: () => void;
  onOpenData: () => void;
  onOpenProductionSettings: () => void;
  onOpenCostDashboard: () => void;
  onOpenFormulaDocs: () => void;
  onOpenMaterialSummary: () => void;
}

const MenuCompactItem = ({
  icon: Icon,
  label,
  desc,
  onClick,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  desc?: string;
  onClick: () => void;
  tone: MenuIconTone;
}) => {
  const { trigger } = useHaptic();

  return (
    <button
      onClick={() => {
        trigger('light');
        onClick();
      }}
      className="group flex w-full items-center gap-3 px-3 py-2 min-h-[48px] rounded-xl border border-border bg-card hover:bg-muted/30 transition-all duration-200 active:scale-[0.98] shadow-sm"
    >
      <div className={cn('p-2 rounded-lg shrink-0 transition-colors', MENU_ICON_TONE[tone])}>
        <Icon className="w-4 h-4" strokeWidth={1.5} />
      </div>
      <div className="text-left flex-1 min-w-0">
        <div className="font-semibold text-foreground text-sm leading-snug truncate">{label}</div>
        {desc && (
          <div className="text-xs text-muted-foreground mt-0.5 font-medium truncate">
            {desc}
          </div>
        )}
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0" strokeWidth={1.5} />
    </button>
  );
};

type ActionMap = Record<MenuAction, () => void>;

// หัวข้อหมวด (data-driven) — สีตามกลุ่ม (DESIGN §2); pt-4 คั่นกลุ่ม, first:pt-0
const SectionHeader = ({ entry }: { entry: Extract<MenuEntry, { kind: 'section' }> }) => (
  <h3
    className={cn(
      'text-xs font-bold uppercase tracking-widest px-1 pt-4 first:pt-0 flex items-center gap-2',
      MENU_GROUP_TONE[entry.tone].text
    )}
  >
    <span className={cn('w-1 h-3 rounded-full', MENU_GROUP_TONE[entry.tone].bar)} />
    {entry.label}
  </h3>
);

// แถวเมนูปกติ (กดเข้าฟังก์ชัน) — header/block/item + AdminGate สำหรับรายการลับ
const MenuEntryRow = ({
  entry,
  actionMap,
  blockMap,
}: {
  entry: MenuEntry;
  actionMap: ActionMap;
  blockMap: Record<MenuBlockId, React.ReactNode>;
}) => {
  if (entry.kind === 'section') return <SectionHeader entry={entry} />;
  if (entry.kind === 'block') return <>{blockMap[entry.id]}</>;
  const item = (
    <MenuCompactItem
      icon={entry.icon}
      label={entry.label}
      desc={entry.desc}
      tone={entry.tone}
      onClick={actionMap[entry.action]}
    />
  );
  return entry.adminOnly ? <AdminGate>{item}</AdminGate> : item;
};

// แถวเมนูโหมดปรับแต่ง (ลากจัดเรียง) — item ลากได้, header ตรึง (disabled).
// โหมดนี้แสดงรายการ adminOnly ด้วย (จัดตำแหน่งได้) + ป้ายล็อกบอกว่าเป็นของผู้ดูแล
const SortableMenuEntry = ({ entry }: { entry: MenuEntry }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: entry.id,
    disabled: entry.kind === 'section',
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  if (entry.kind === 'section') {
    return (
      <h3
        ref={setNodeRef}
        style={style}
        className={cn(
          'text-xs font-bold uppercase tracking-widest px-1 pt-4 first:pt-0 flex items-center gap-2',
          MENU_GROUP_TONE[entry.tone].text
        )}
      >
        <span className={cn('w-1 h-3 rounded-full', MENU_GROUP_TONE[entry.tone].bar)} />
        {entry.label}
        <span className="ml-auto text-xs font-medium normal-case tracking-normal text-muted-foreground/60">
          ตรึง
        </span>
      </h3>
    );
  }

  // บล็อกพิเศษ (บัญชี/ผู้ดูแล/ธีม+โหมด) — โหมด edit เป็น placeholder ลากได้ (กันชน click)
  if (entry.kind === 'block') {
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={cn(
          'group flex w-full items-center gap-2 px-3 py-3 min-h-[48px] rounded-xl border bg-muted/40 shadow-sm select-none touch-none cursor-grab active:cursor-grabbing',
          isDragging ? 'border-primary ring-2 ring-primary/30' : 'border-dashed border-border'
        )}
      >
        <GripVertical className="w-4 h-4 text-muted-foreground/50 shrink-0" strokeWidth={1.5} />
        <span className="text-sm font-semibold text-foreground">{entry.label}</span>
        <span className="ml-auto text-xs text-muted-foreground">บล็อก · ลากย้ายได้</span>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'group flex w-full items-center gap-2 px-3 py-2 min-h-[48px] rounded-xl border bg-card shadow-sm select-none touch-none cursor-grab active:cursor-grabbing',
        isDragging ? 'border-primary ring-2 ring-primary/30' : 'border-border'
      )}
    >
      <GripVertical className="w-4 h-4 text-muted-foreground/50 shrink-0" strokeWidth={1.5} />
      <div className={cn('p-2 rounded-lg shrink-0', MENU_ICON_TONE[entry.tone])}>
        <entry.icon className="w-4 h-4" strokeWidth={1.5} />
      </div>
      <div className="text-left flex-1 min-w-0">
        <div className="font-semibold text-foreground text-sm leading-snug truncate">{entry.label}</div>
        {entry.desc && (
          <div className="text-xs text-muted-foreground mt-0.5 font-medium truncate">{entry.desc}</div>
        )}
      </div>
      {entry.adminOnly && <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" strokeWidth={1.5} />}
    </div>
  );
};

export const MainMenuModal: React.FC<MainMenuModalProps> = ({
  isOpen,
  onClose,
  onOpenOverview,
  onOpenJobs,
  onOpenSignIn,
  onOpenCustomerDirectory,
  onOpenPdf,
  onOpenCopySummary,
  onOpenLookbook,
  onOpenCustomer,
  onOpenShopSettings,
  onOpenDiscount,
  onOpenData,
  onOpenProductionSettings,
  onOpenCostDashboard,
  onOpenFormulaDocs,
  onOpenMaterialSummary,
}) => {
  const { theme, setTheme } = useThemeStore();
  const shopName = useAppStore((s) => s.shopConfig.name);
  const openModal = useAppStore((s) => s.openModal);
  // fresh-open token — bump เฉพาะตอนเปิดเมนูใหม่จากศูนย์ (openModal) ไม่ bump ตอน pop กลับจาก stack →
  // ให้ Modal คืนตำแหน่ง scroll เดิมเมื่อกลับจาก modal ซ้อน แต่เริ่มบนสุดเมื่อเปิดใหม่
  const menuOpenSeq = useAppStore((s) => s.openCounts.mainMenu ?? 0);
  const authStatus = useAuthStore((s) => s.status);
  const authEmail = useAuthStore((s) => s.email);
  const signOutUser = useAuthStore((s) => s.signOutUser);
  const addToast = useUIStore((s) => s.addToast);
  const sync = useSyncStatus();
  const { trigger } = useHaptic();
  const { mode, canSwitch, setMode } = useExperienceMode();
  const { isAdmin, isStaff, guardEnabled, lock } = useRole();

  // โหมดปรับแต่งเมนู (dev) + ลำดับเมนูที่จัดเอง (data-driven)
  const menuEditing = useMenuConfigStore((s) => s.editing);
  const menuOrder = useMenuConfigStore((s) => s.order);
  const reorderMenu = useMenuConfigStore((s) => s.reorder);
  const resetMenu = useMenuConfigStore((s) => s.reset);
  const setMenuEditing = useMenuConfigStore((s) => s.setEditing);
  const menuEntries = useMemo(() => getOrderedEntries(menuOrder), [menuOrder]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // map คีย์ action → handler เปิด modal เดิม (ไม่แตะ logic เปิด)
  const actionMap: ActionMap = {
    jobs: onOpenJobs,
    overview: () => {
      onClose();
      onOpenOverview?.();
    },
    customer: onOpenCustomer,
    customerDirectory: onOpenCustomerDirectory,
    pdf: onOpenPdf,
    copySummary: onOpenCopySummary,
    lookbook: onOpenLookbook,
    materialSummary: onOpenMaterialSummary,
    discount: onOpenDiscount,
    costDashboard: onOpenCostDashboard,
    productionSettings: onOpenProductionSettings,
    shopSettings: onOpenShopSettings,
    formulaDocs: onOpenFormulaDocs,
    data: onOpenData,
    undoHistory: () => openModal('undoHistory'),
  };

  const handleMenuDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (over && active.id !== over.id) reorderMenu(String(active.id), String(over.id));
  };

  const handleCopyOrder = () => {
    const ids = menuEntries.map((entry) => entry.id);
    navigator.clipboard?.writeText(JSON.stringify(ids)).catch(() => {});
    addToast('success', 'คัดลอกลำดับเมนูแล้ว — วางบอก AI เพื่อ bake เป็น default');
  };

  const themes = [
    { id: 'light' as const, label: 'สว่าง', short: 'สว่าง', icon: Sun, active: theme === 'light' },
    { id: 'dark' as const, label: 'มืด', short: 'มืด', icon: Moon, active: theme === 'dark' },
    { id: 'signature' as const, label: 'Signature', short: 'Sig', icon: Gem, active: theme === 'signature' },
    { id: 'eeert' as const, label: 'EEERT', short: 'EEERT', icon: Contrast, active: theme === 'eeert' },
    { id: 'dark-vivid' as const, label: 'Dark Vivid', short: 'Vivid', icon: Sparkles, active: theme === 'dark-vivid' },
  ];

  // โหมดงาน (ไม่ใช่อุปกรณ์): หน้างาน = วัด/จดให้ครบ · ละเอียด = ราคา/ทุน/กำไร/จัดเรียง
  const displayModes = [
    { id: 'field' as const, label: 'หน้างาน', icon: HardHat, active: mode === 'field' },
    { id: 'detail' as const, label: 'ละเอียด', icon: ClipboardList, active: mode === 'detail' },
  ];

  // ── บล็อกบัญชี/ตั้งค่า (data-driven, ลาก-ย้ายได้) — เนื้อหา bespoke ใช้ hooks ในคอมโพเนนต์ ──
  const accountBlock = (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider shrink-0">ร้านของคุณ</span>
          <span className="text-base font-bold leading-tight text-foreground truncate">
            {shopName || 'ม่านธารา'}
          </span>
        </div>
      </div>

      {/* บัญชี / สถานะซิงค์ — ซ่อนเมื่อยังไม่ตั้งค่า Firebase (local-only) */}
      {authStatus !== 'disabled' && (
        <div className="flex items-center justify-between gap-2 bg-card border border-border/50 rounded-lg px-3 py-2">
          <div className="flex items-center gap-2 min-w-0">
            {authStatus === 'signed-in' ? (
              <Cloud className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" strokeWidth={1.5} />
            ) : (
              <CloudOff className="w-4 h-4 text-muted-foreground shrink-0" strokeWidth={1.5} />
            )}
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground truncate max-w-[160px]">
                {authStatus === 'signed-in'
                  ? authEmail
                  : authStatus === 'loading'
                    ? 'กำลังเชื่อมต่อ…'
                    : 'ยังไม่ได้เข้าสู่ระบบ'}
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                {authStatus === 'signed-in' ? (
                  <>
                    {!sync.hidden && (
                      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', sync.dotClass)} />
                    )}
                    {sync.hidden ? 'ซิงค์หลายอุปกรณ์' : sync.label}
                  </>
                ) : (
                  'เข้าสู่ระบบเพื่อซิงค์งาน'
                )}
              </div>
            </div>
          </div>
          {authStatus === 'signed-in' ? (
            <button
              onClick={async () => {
                trigger('light');
                await signOutUser();
                addToast('info', 'ออกจากระบบแล้ว');
              }}
              className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-destructive transition-colors min-h-[44px] px-2 shrink-0"
            >
              <LogOut className="w-4 h-4" strokeWidth={1.5} /> ออก
            </button>
          ) : (
            <button
              onClick={() => {
                trigger('light');
                onOpenSignIn();
              }}
              className="text-xs font-bold text-info hover:text-info/80 transition-colors min-h-[44px] px-2 shrink-0"
            >
              เข้าสู่ระบบ
            </button>
          )}
        </div>
      )}
    </div>
  );

  const roleBlock =
    authStatus === 'signed-in' ? (
      <div className="bg-card border border-border/50 rounded-lg px-3 py-2 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {guardEnabled && isStaff ? (
              <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" strokeWidth={1.5} />
            ) : (
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" strokeWidth={1.5} />
            )}
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground">
                {guardEnabled ? (isAdmin ? 'ผู้ดูแล' : 'พนักงาน') : 'ผู้ดูแล'}
              </div>
              <div className="text-xs text-muted-foreground truncate max-w-[170px]">
                {!guardEnabled
                  ? 'ตั้ง PIN กันพนักงานเผลอลบ/แก้ทุน'
                  : isAdmin
                    ? 'ปลดล็อกอยู่ — ทำได้ทุกอย่าง'
                    : 'จำกัดสิทธิ์ — แตะปลดล็อก'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {!guardEnabled && (
              <button
                onClick={() => { trigger('light'); openModal('adminPin', { intent: 'setup' }); }}
                className="text-xs font-bold text-info hover:text-info/80 transition-colors min-h-[44px] px-2"
              >
                ตั้ง PIN
              </button>
            )}
            {guardEnabled && isStaff && (
              <button
                onClick={() => { trigger('light'); openModal('adminPin', { intent: 'unlock' }); }}
                className="flex items-center gap-1 text-xs font-bold text-info hover:text-info/80 transition-colors min-h-[44px] px-2"
              >
                <Unlock className="w-4 h-4" strokeWidth={1.5} /> ปลดล็อก
              </button>
            )}
            {guardEnabled && isAdmin && (
              <>
                <button
                  onClick={() => { trigger('light'); openModal('adminPin', { intent: 'setup' }); }}
                  aria-label="เปลี่ยน PIN"
                  className="inline-flex items-center justify-center p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors min-h-[44px] min-w-[44px]"
                >
                  <KeyRound className="w-4 h-4" strokeWidth={1.5} />
                </button>
                <button
                  onClick={() => { trigger('light'); lock(); addToast('info', 'ล็อกเป็นพนักงานแล้ว'); }}
                  className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-amber-600 transition-colors min-h-[44px] px-2"
                >
                  <Lock className="w-4 h-4" strokeWidth={1.5} /> ล็อก
                </button>
              </>
            )}
          </div>
        </div>

        {guardEnabled && isAdmin && (
          <button
            onClick={() => { trigger('light'); openModal('adminPin', { intent: 'disable' }); }}
            className="w-full text-left text-xs text-muted-foreground hover:text-destructive transition-colors min-h-[44px] px-1"
          >
            ปิดโหมดทีม (ทุกเครื่องเป็นผู้ดูแล)
          </button>
        )}
      </div>
    ) : null;

  const appearanceBlock = (
    <div className="space-y-2">
      {/* Theme Toggle — แถวเดียว 5 ปุ่ม เต็มกว้าง (icon + ชื่อย่อ); title = ชื่อเต็มเพื่อ a11y */}
      <div className="grid grid-cols-5 gap-1 bg-card border border-border/50 p-1 rounded-lg">
        {themes.map((opt) => (
          <button
            key={opt.id}
            onClick={() => { trigger('selection'); setTheme(opt.id); }}
            title={opt.label}
            className={cn(
              'flex items-center justify-center gap-1 min-h-[44px] px-1 rounded-md transition-all text-xs font-semibold',
              opt.active ? 'bg-muted text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <opt.icon className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
            <span className="truncate">{opt.short}</span>
          </button>
        ))}
      </div>

      {/* Mode Toggle — โหมดงาน (เฉพาะจอมือถือ; desktop = ละเอียดเสมอ) */}
      {canSwitch && (
        <div className="flex items-center justify-between bg-card border border-border/50 p-1 rounded-lg">
          {displayModes.map((opt) => (
            <button
              key={opt.id}
              onClick={() => { trigger('selection'); setMode(opt.id); }}
              className={cn(
                'flex items-center justify-center gap-1.5 flex-1 min-h-[44px] rounded-md transition-all text-xs font-semibold',
                opt.active ? 'bg-muted text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <opt.icon className="w-3.5 h-3.5" strokeWidth={1.5} />
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const blockMap: Record<MenuBlockId, React.ReactNode> = {
    account: accountBlock,
    role: roleBlock,
    appearance: appearanceBlock,
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="เมนูหลัก"
      description="เข้าถึงฟังก์ชันทั้งหมดของระบบ"
      maxWidth="lg"
      variant="drawer"
      scrollResetToken={menuOpenSeq}
    >
      <div className="space-y-5 pb-safe-area">
        {/* ── รายการเมนู (data-driven) — โหมดปรับแต่ง (dev) = ลากจัดเรียง/ย้ายข้ามหมวด ── */}
        {menuEditing && (
          <div className="rounded-xl border border-primary/40 bg-primary/5 p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <GripVertical className="w-4 h-4 shrink-0" strokeWidth={1.5} /> ปรับแต่งเมนู (dev)
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              ลากรายการเพื่อจัดลำดับ/ย้ายข้ามหมวด (หัวข้อหมวดตรึง) · &quot;คัดลอกลำดับ&quot; เพื่อ bake เป็นค่าเริ่มต้นในโค้ด
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleCopyOrder}
                className="inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-lg border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted/40 transition-colors"
              >
                <Copy className="w-3.5 h-3.5" strokeWidth={1.5} /> คัดลอกลำดับ
              </button>
              <button
                onClick={() => {
                  resetMenu();
                  addToast('info', 'รีเซ็ตลำดับเมนูแล้ว');
                }}
                className="inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-lg border border-border bg-card text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.5} /> รีเซ็ต
              </button>
              <button
                onClick={() => setMenuEditing(false)}
                className="inline-flex items-center min-h-[40px] px-4 rounded-lg bg-primary text-primary-foreground text-xs font-bold ml-auto"
              >
                เสร็จ
              </button>
            </div>
          </div>
        )}

        {menuEditing ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleMenuDragEnd}>
            <SortableContext items={menuEntries.map((e) => e.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-1.5">
                {menuEntries.map((entry) => (
                  <SortableMenuEntry key={entry.id} entry={entry} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <div className="space-y-1.5">
            {menuEntries.map((entry) => (
              <MenuEntryRow key={entry.id} entry={entry} actionMap={actionMap} blockMap={blockMap} />
            ))}
          </div>
        )}

        {/* ── Footer ── */}
        <div className="pt-2 text-center">
          <span className="text-xs text-muted-foreground font-mono bg-muted/40 px-2 py-1 rounded-md">
            Marnthara v{APP_VERSION}
          </span>
        </div>

      </div>
    </Modal>
  );
};