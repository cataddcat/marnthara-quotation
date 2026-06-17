import React from 'react';
import { Modal } from '@/components/ui/Modal';
import {
  Sun,
  Moon,
  FileText,
  MessageSquareText,
  BookOpen,
  Users,
  Settings,
  ShieldCheck,
  TrendingUp,
  Percent,
  Database,
  Calculator,
  Layers,
  HardHat,
  ClipboardList,
  Gem,
  Contrast,
  FolderKanban,
  User,
  Lock,
  Unlock,
  KeyRound,
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
import { Cloud, CloudOff, LogOut } from 'lucide-react';

interface MainMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
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
}: {
  icon: React.ElementType;
  label: string;
  desc?: string;
  onClick: () => void;
}) => {
  const { trigger } = useHaptic();

  return (
    <button
      onClick={() => {
        trigger('light');
        onClick();
      }}
      className="group flex items-center gap-3 p-2.5 rounded-xl border border-border bg-card hover:bg-muted/30 transition-all duration-200 active:scale-[0.98] col-span-1 shadow-sm"
    >
      <div className="p-2 rounded-lg shrink-0 transition-colors bg-muted text-foreground group-hover:bg-muted/80">
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
    </button>
  );
};

export const MainMenuModal: React.FC<MainMenuModalProps> = ({
  isOpen,
  onClose,
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
  const authStatus = useAuthStore((s) => s.status);
  const authEmail = useAuthStore((s) => s.email);
  const signOutUser = useAuthStore((s) => s.signOutUser);
  const addToast = useUIStore((s) => s.addToast);
  const sync = useSyncStatus();
  const { trigger } = useHaptic();
  const { mode, canSwitch, setMode } = useExperienceMode();
  const { isAdmin, isStaff, guardEnabled, lock } = useRole();

  const themes = [
    { id: 'light' as const, label: 'สว่าง', icon: Sun, active: theme === 'light' },
    { id: 'dark' as const, label: 'มืด', icon: Moon, active: theme === 'dark' },
    { id: 'signature' as const, label: 'Signature', icon: Gem, active: theme === 'signature' },
    { id: 'eeert' as const, label: 'EEERT', icon: Contrast, active: theme === 'eeert' },
  ];

  // โหมดงาน (ไม่ใช่อุปกรณ์): หน้างาน = วัด/จดให้ครบ · ละเอียด = ราคา/ทุน/กำไร/จัดเรียง
  const displayModes = [
    { id: 'field' as const, label: 'หน้างาน', icon: HardHat, active: mode === 'field' },
    { id: 'detail' as const, label: 'ละเอียด', icon: ClipboardList, active: mode === 'detail' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="เมนูหลัก"
      description="เข้าถึงฟังก์ชันทั้งหมดของระบบ"
      maxWidth="lg"
      variant="drawer"
    >
      <div className="space-y-5 pb-safe-area">
        
        {/* ── บัญชี & ตั้งค่า (บนสุด — โปรไฟล์ร้าน · บัญชี · ธีม/โหมด) ── */}
        <div className="bg-muted/30 p-3 rounded-xl border border-border/50 space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">ร้านของคุณ</span>
              <span className="text-base font-bold leading-tight text-foreground truncate max-w-[150px]">
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

          {/* ── บทบาท (การ์ดผู้ดูแล) — บัญชีร่วม: กันพนักงานเผลอทำพัง ── */}
          {authStatus === 'signed-in' && (
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
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Theme Toggle — 2×2 grid: 4 themes never overflow the half-width cell */}
            <div className="grid grid-cols-2 gap-1 bg-card border border-border/50 p-1 rounded-lg">
              {themes.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => { trigger('selection'); setTheme(opt.id); }}
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
        </div>

        {/* ── 1. นำเสนอ & ขาย (Sales & Customer) ── */}
        <section className="space-y-2.5">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2">
            <span className="w-1 h-3 bg-indigo-500 rounded-full"></span> นำเสนอ & ขาย
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <MenuCompactItem icon={FolderKanban} label="งานทั้งหมด" desc="สลับงาน · ดูความคืบหน้าทุกงาน" onClick={onOpenJobs} />
            <MenuCompactItem icon={FileText} label="ใบเสนอราคา" desc="พิมพ์ใบเสนอราคา / ส่งของ" onClick={onOpenPdf} />
            <MenuCompactItem icon={MessageSquareText} label="คัดลอกสรุป" desc="ส่ง LINE คุยลูกค้า/ช่าง" onClick={onOpenCopySummary} />
            <MenuCompactItem icon={BookOpen} label="Lookbook" desc="แคตตาล็อกโชว์ผลงาน" onClick={onOpenLookbook} />
            <MenuCompactItem icon={Users} label="ฐานลูกค้า" desc="เลือกลูกค้า · เปิดงานใหม่" onClick={onOpenCustomerDirectory} />
            <MenuCompactItem icon={User} label="ลูกค้างานนี้" desc="แก้ชื่อ/ที่อยู่บนเอกสาร" onClick={onOpenCustomer} />
          </div>
        </section>

        {/* ── 2. สินค้า & การเงิน (Products & Finance) ── */}
        <section className="space-y-2.5">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2">
            <span className="w-1 h-3 bg-emerald-500 rounded-full"></span> สินค้า & การเงิน
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <MenuCompactItem icon={Layers} label="สินค้า & ราคา" desc="อัปเดตรหัสวัสดุ" onClick={onOpenMaterialSummary} />
            {/* ต้นทุน/กำไร = ความลับร้าน → เฉพาะผู้ดูแล (พนักงานไม่เห็นเมนูนี้) */}
            <AdminGate>
              <MenuCompactItem icon={TrendingUp} label="การเงินของงาน" desc="มัดจำ · จ่ายจริง · คงเหลือ · ทุนที่รู้" onClick={onOpenCostDashboard} />
            </AdminGate>
            <MenuCompactItem icon={Percent} label="จัดการส่วนลด" desc="ลดท้ายบิล / โปรโมชัน" onClick={onOpenDiscount} />
            <AdminGate>
              <MenuCompactItem icon={ShieldCheck} label="โครงสร้างต้นทุน" desc="ค่าแรง / ค่าบริการ" onClick={onOpenProductionSettings} />
            </AdminGate>
          </div>
        </section>

        {/* ── 3. ระบบร้าน (System Admin) ── */}
        <section className="space-y-2.5">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2">
            <span className="w-1 h-3 bg-orange-500 rounded-full"></span> จัดการระบบ
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <MenuCompactItem icon={Settings} label="ตั้งค่าร้านค้า" desc="โลโก้ / ข้อมูลติดต่อ" onClick={onOpenShopSettings} />
            <MenuCompactItem icon={Calculator} label="อธิบายสูตร" desc="ตรวจสอบวิธีคิดเงิน" onClick={onOpenFormulaDocs} />
            <MenuCompactItem icon={Database} label="สำรองข้อมูล" desc="นำเข้า / ส่งออกข้อมูล" onClick={onOpenData} />
          </div>
        </section>

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