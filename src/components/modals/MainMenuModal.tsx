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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { APP_VERSION } from '@/config/constants';
import { useAppStore } from '@/store/useAppStore';
import { useThemeStore } from '@/store/useThemeStore';
import { useHaptic } from '@/hooks/useHaptic';
import { useExperienceMode } from '@/hooks/useExperienceMode';

interface MainMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
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
  accentColor = 'primary',
}: {
  icon: React.ElementType;
  label: string;
  desc?: string;
  onClick: () => void;
  accentColor?: 'primary' | 'emerald' | 'orange' | 'rose' | 'indigo';
}) => {
  const { trigger } = useHaptic();

  const colors = {
    primary: 'bg-muted text-foreground group-hover:bg-muted/80',
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500/20',
    orange: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 group-hover:bg-orange-500/20',
    rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 group-hover:bg-rose-500/20',
    indigo: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-500/20',
  };

  return (
    <button
      onClick={() => {
        trigger('light');
        onClick();
      }}
      className="group flex items-center gap-3 p-2.5 rounded-xl border border-border bg-card hover:bg-muted/30 transition-all duration-200 active:scale-[0.98] col-span-1 shadow-sm"
    >
      <div className={cn('p-2 rounded-lg shrink-0 transition-colors', colors[accentColor])}>
        <Icon className="w-4 h-4" strokeWidth={1.5} />
      </div>
      <div className="text-left flex-1 min-w-0">
        <div className="font-semibold text-foreground text-sm leading-tight truncate">{label}</div>
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
  const { trigger } = useHaptic();
  const { mode, canSwitch, setMode } = useExperienceMode();

  const themes = [
    { id: 'light' as const, label: 'สว่าง', icon: Sun, active: theme === 'light' },
    { id: 'dark' as const, label: 'มืด', icon: Moon, active: theme === 'dark' },
    { id: 'signature' as const, label: 'Signature', icon: Gem, active: theme === 'signature' },
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
        
        {/* ── Top Section: Greeting & Display Settings (Compact) ── */}
        <div className="bg-muted/30 p-3 rounded-xl border border-border/50 space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">ร้านของคุณ</span>
              <span className="text-base font-bold leading-tight text-foreground truncate max-w-[150px]">
                {shopName || 'ม่านธารา'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Theme Toggle */}
            <div className="flex items-center justify-between bg-card border border-border/50 p-1 rounded-lg">
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
            <MenuCompactItem icon={FileText} label="ใบเสนอราคา" desc="พิมพ์ใบเสนอราคา / ส่งของ" onClick={onOpenPdf} accentColor="primary" />
            <MenuCompactItem icon={MessageSquareText} label="คัดลอกสรุป" desc="ส่ง LINE คุยลูกค้า/ช่าง" onClick={onOpenCopySummary} accentColor="emerald" />
            <MenuCompactItem icon={BookOpen} label="Lookbook" desc="แคตตาล็อกโชว์ผลงาน" onClick={onOpenLookbook} accentColor="indigo" />
            <MenuCompactItem icon={Users} label="ฐานลูกค้า" desc="จัดการประวัติลูกค้า" onClick={onOpenCustomer} accentColor="orange" />
          </div>
        </section>

        {/* ── 2. สินค้า & การเงิน (Products & Finance) ── */}
        <section className="space-y-2.5">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2">
            <span className="w-1 h-3 bg-emerald-500 rounded-full"></span> สินค้า & การเงิน
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <MenuCompactItem icon={Layers} label="สินค้า & ราคา" desc="อัปเดตรหัสวัสดุ" onClick={onOpenMaterialSummary} accentColor="indigo" />
            <MenuCompactItem icon={TrendingUp} label="การเงินของงาน" desc="มัดจำ · จ่ายจริง · คงเหลือ · ทุนที่รู้" onClick={onOpenCostDashboard} accentColor="emerald" />
            <MenuCompactItem icon={Percent} label="จัดการส่วนลด" desc="ลดท้ายบิล / โปรโมชัน" onClick={onOpenDiscount} accentColor="emerald" />
            <MenuCompactItem icon={ShieldCheck} label="โครงสร้างต้นทุน" desc="ค่าแรง / ค่าบริการ" onClick={onOpenProductionSettings} accentColor="primary" />
          </div>
        </section>

        {/* ── 3. ระบบร้าน (System Admin) ── */}
        <section className="space-y-2.5">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2">
            <span className="w-1 h-3 bg-orange-500 rounded-full"></span> จัดการระบบ
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <MenuCompactItem icon={Settings} label="ตั้งค่าร้านค้า" desc="โลโก้ / ข้อมูลติดต่อ" onClick={onOpenShopSettings} accentColor="primary" />
            <MenuCompactItem icon={Calculator} label="อธิบายสูตร" desc="ตรวจสอบวิธีคิดเงิน" onClick={onOpenFormulaDocs} accentColor="primary" />
            <MenuCompactItem icon={Database} label="สำรองข้อมูล" desc="นำเข้า / ส่งออกข้อมูล" onClick={onOpenData} accentColor="orange" />
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