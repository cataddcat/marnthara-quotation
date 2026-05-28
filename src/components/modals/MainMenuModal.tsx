import React from 'react';
import { Modal } from '@/components/ui/Modal';
import {
  Sun,
  Moon,
  FileText,
  BookOpen,
  Users,
  Settings,
  ShieldCheck,
  TrendingUp,
  Percent,
  Database,
  ChevronRight,
  Calculator,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useThemeStore } from '@/store/useThemeStore';
import { useHaptic } from '@/hooks/useHaptic';

interface MainMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPdf: () => void;
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

const MenuGridItem = ({
  icon: Icon,
  label,
  desc,
  onClick,
  accentColor = 'primary',
  isWide = false,
}: {
  icon: React.ElementType;
  label: string;
  desc?: string;
  onClick: () => void;
  accentColor?: 'primary' | 'emerald' | 'orange' | 'rose' | 'indigo';
  isWide?: boolean;
}) => {
  const { trigger } = useHaptic();

  const colors = {
    primary: 'bg-primary/5 text-primary group-hover:bg-primary/10',
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
      className={cn(
        'group relative flex items-center p-4 rounded-2xl border border-border bg-card shadow-sm transition-all duration-200 active:scale-[0.98]',
        isWide
          ? 'col-span-2'
          : 'col-span-1 flex-col justify-center text-center gap-3 h-32 sm:h-auto sm:flex-row sm:justify-start sm:text-left'
      )}
    >
      <div className={cn('p-3 rounded-xl transition-colors', colors[accentColor])}>
        <Icon className="w-6 h-6" strokeWidth={2} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-foreground text-[15px] leading-tight">{label}</div>
        {desc && (
          <div className="text-[13px] text-muted-foreground mt-0.5 font-medium truncate">{desc}</div>
        )}
      </div>
      {isWide && (
        <ChevronRight className="w-5 h-5 text-muted-foreground/30 group-hover:text-foreground/50" />
      )}
    </button>
  );
};

export const MainMenuModal: React.FC<MainMenuModalProps> = ({
  isOpen,
  onClose,
  onOpenPdf,
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
  const { theme, toggleTheme } = useThemeStore();
  const { trigger } = useHaptic();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="เมนูหลัก"
      description="เลือกเมนูที่ต้องการใช้งาน"
      maxWidth="lg"
      variant="drawer"
    >
      <div className="space-y-6 pb-safe-area">

        {/* ── Greeting + Theme ── */}
        <div className="flex items-center justify-between px-1">
          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground font-medium">ยินดีต้อนรับ,</span>
            <span className="text-lg font-bold text-foreground">Marnthara User</span>
          </div>
          <button
            onClick={() => { trigger('medium'); toggleTheme(); }}
            className={cn(
              'relative p-2 rounded-full transition-all duration-500 border overflow-hidden w-12 h-12 flex items-center justify-center',
              theme === 'dark'
                ? 'bg-slate-800 border-slate-700 text-yellow-400'
                : 'bg-amber-100 border-amber-200 text-amber-600'
            )}
          >
            <div className={cn('transition-transform duration-500', theme === 'dark' ? 'rotate-0' : 'rotate-180')}>
              {theme === 'dark' ? <Moon className="w-6 h-6" /> : <Sun className="w-6 h-6" />}
            </div>
          </button>
        </div>

        {/* ── 1. เอกสาร & นำเสนอ ── */}
        <section className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
            เอกสาร & นำเสนอ
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <MenuGridItem
              icon={FileText}
              label="ใบเสนอราคา"
              desc="พิมพ์ใบเสนอราคา / ใบส่งของ"
              onClick={onOpenPdf}
              accentColor="primary"
              isWide
            />
            <MenuGridItem
              icon={BookOpen}
              label="Lookbook"
              desc="แคตตาล็อกนำเสนอลูกค้า"
              onClick={onOpenLookbook}
              accentColor="indigo"
              isWide
            />
          </div>
        </section>

        {/* ── 2. จัดการ ── */}
        <section className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
            จัดการ
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <MenuGridItem
              icon={Users}
              label="ลูกค้า"
              desc="ข้อมูลลูกค้า"
              onClick={onOpenCustomer}
              accentColor="orange"
            />
            <MenuGridItem
              icon={Settings}
              label="ตั้งค่าร้าน"
              desc="โลโก้ / ที่อยู่"
              onClick={onOpenShopSettings}
              accentColor="primary"
            />
            <MenuGridItem
              icon={Percent}
              label="ส่วนลด"
              desc="ส่วนลดท้ายบิล"
              onClick={onOpenDiscount}
              accentColor="emerald"
            />
            <MenuGridItem
              icon={Database}
              label="สำรองข้อมูล"
              desc="Import / Export"
              onClick={onOpenData}
              accentColor="primary"
            />
          </div>
        </section>

        {/* ── 3. ต้นทุน & ขั้นสูง ── */}
        <section className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
            ต้นทุน & ขั้นสูง
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <MenuGridItem
              icon={TrendingUp}
              label="วิเคราะห์กำไร"
              desc="ตรวจสอบ Margin / กำไรสุทธิ"
              onClick={onOpenCostDashboard}
              accentColor="emerald"
              isWide
            />
            <MenuGridItem
              icon={Layers}
              label="คลังต้นทุน"
              desc="วัสดุ · ราง · อุปกรณ์ · คลังรหัส"
              onClick={onOpenMaterialSummary}
              accentColor="indigo"
              isWide
            />
            <MenuGridItem
              icon={ShieldCheck}
              label="ตั้งค่าต้นทุน"
              desc="ค่าแรง / อุปกรณ์"
              onClick={onOpenProductionSettings}
              accentColor="primary"
            />
            <MenuGridItem
              icon={Calculator}
              label="อธิบายสูตร"
              desc="วิธีคำนวณราคา/วัสดุ"
              onClick={onOpenFormulaDocs}
              accentColor="indigo"
            />
          </div>
        </section>

        {/* ── Footer ── */}
        <div className="pt-2 text-center">
          <div className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-muted/50 text-[10px] text-muted-foreground font-mono">
            Marnthara v6.7.0
          </div>
        </div>

      </div>
    </Modal>
  );
};
