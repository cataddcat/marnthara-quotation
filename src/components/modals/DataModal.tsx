import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useAppStore } from '@/store/useAppStore';
import { useNotificationStore } from '@/store/standalone/useNotificationStore';
import { useConfirm } from '@/hooks/useConfirm';
import { useRequireAdmin } from '@/hooks/useRequireAdmin';
import {
  Upload,
  Download,
  AlertTriangle,
  FilePlus,
  Trash2,
  RefreshCw,
  HardDrive,
  Star,
  DollarSign,
  FlaskConical,
} from 'lucide-react';
// ❌ ลบหรือ Comment บรรทัดนี้ออก
// import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { parseBackup, type ParsedBackup } from '@/lib/backup/backup';
import { downloadBackup } from '@/lib/backup/backup-export';
import { resolveRestoreIdentity, forkBundleId } from '@/lib/backup/restore-identity';
import type { Customer } from '@/types';

interface DataModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DataModal: React.FC<DataModalProps> = ({ isOpen, onClose }) => {
  const { createJob, factoryReset, importFavorites, importSecrets } = useAppStore();
  const addToast = useNotificationStore((state) => state.addToast);
  const { confirm } = useConfirm();
  const requireAdmin = useRequireAdmin();

  const [resetInput, setResetInput] = useState('');
  const [showDangerZone, setShowDangerZone] = useState(false);
  const [importInput, setImportInput] = useState('');
  const [activeImportTab, setActiveImportTab] = useState<'favorites' | 'cost'>('favorites');

  const TAB_LABEL: Record<typeof activeImportTab, string> = {
    favorites: 'คลังผ้า',
    cost: 'ต้นทุน',
  };

  const handleExport = () => {
    // เติม identity ก่อน เพื่อให้ customer.id (UUID) ติดไปใน JSON ด้วย (กุญแจเชื่อมนอกแอพ)
    const ident = useAppStore.getState().ensureCustomerIdentity();
    const ok = downloadBackup(useAppStore.getState(), ident);
    addToast(ok ? 'success' : 'error', ok ? 'Backup ข้อมูลสำเร็จ' : 'เกิดข้อผิดพลาดในการ Backup');
  };

  /**
   * เขียนงานจากไฟล์เข้า live + ชั้นวาง โดยรักษา identity (UUID = 1 งาน):
   *  1) flush งานปัจจุบันลงชั้นวางก่อน (กันงาน local-only/ออฟไลน์ที่แก้ค้างหายตอนถูกทับ)
   *  2) ถ้า UUID ในไฟล์ชนกับงานในชั้นวาง → ถาม "ทับงานเดิม" หรือ "เก็บเป็นสำเนาใหม่ (UUID ใหม่)"
   *     — ไม่ว่าเลือกอะไรก็ไม่มีงานหายเงียบ
   */
  const applyRestore = async (json: ParsedBackup, raw: unknown) => {
    // 1) flush งานปัจจุบันก่อนเขียนทับ live (no-op ถ้างานเปล่า)
    useAppStore.getState().saveCurrentJob();

    // 2) ตัดสิน identity: ไฟล์ชนกับงานในชั้นวางไหม (UUID ตรงกัน) + ไฟล์เก่ากว่าไหม
    let customer = json.customer as unknown as Customer | undefined;
    const exportDate =
      raw && typeof raw === 'object' && typeof (raw as Record<string, unknown>).exportDate === 'string'
        ? ((raw as Record<string, unknown>).exportDate as string)
        : undefined;
    const { collides, existing, incomingOlder } = resolveRestoreIdentity(
      customer?.id,
      useAppStore.getState().jobs,
      exportDate
    );

    if (collides && customer) {
      const updatedLabel = existing?.updatedAt
        ? new Date(existing.updatedAt).toLocaleDateString('th-TH', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })
        : '';
      const overwrite = await confirm({
        title: 'งานนี้มีอยู่แล้วในเครื่อง',
        description:
          `ไฟล์นี้เป็นงานเดียวกับที่มีอยู่ (รหัสงานตรงกัน${updatedLabel ? ` · งานในเครื่องอัปเดตล่าสุด ${updatedLabel}` : ''})` +
          (incomingOlder ? ' ⚠️ ไฟล์ที่นำเข้าเก่ากว่างานในเครื่อง' : '') +
          ' — เลือก "ทับงานเดิม" เพื่ออัปเดตด้วยไฟล์นี้ หรือ "เก็บเป็นสำเนาใหม่" เพื่อไม่ให้ของเดิมหาย',
        confirmLabel: 'ทับงานเดิม',
        cancelLabel: 'เก็บเป็นสำเนาใหม่',
        variant: incomingOlder ? 'destructive' : 'default',
      });
      if (!overwrite) customer = forkBundleId(customer); // สำเนาใหม่ → UUID ใหม่ (คนละงาน)
    }

    // 3) เขียนทับ live (customer อาจถูก fork แล้ว) — known fields เท่านั้น
    // cast ผ่าน unknown: schema ใน parseBackup ตรวจแบบ "หลวม" (เฉพาะ field ที่พังแอปได้)
    // โครงเต็มมาจากไฟล์ที่แอป export เอง — ไม่ re-declare ทุก field ซ้ำที่นี่
    const s = useAppStore.getState();
    useAppStore.setState({
      customer:       customer                                              ?? s.customer,
      rooms:          (json.rooms as unknown as typeof s.rooms)             ?? s.rooms,
      shopConfig:     (json.shopConfig as unknown as typeof s.shopConfig)   ?? s.shopConfig,
      discount:       (json.discount as unknown as typeof s.discount)       ?? s.discount,
      favorites:      (json.favorites as unknown as typeof s.favorites)     ?? s.favorites,
      // เงินของงานเดินตามก้อนงาน: backup ที่มี rooms แต่ไม่มี payments (รุ่นเก่า) → ล้างเป็นศูนย์
      // (ห้ามคงมัดจำ/รายจ่ายของงานปัจจุบันไว้กับห้อง/ลูกค้าของงานที่ restore — เงินปนข้ามงาน)
      receipts:       (json.payments?.receipts as unknown as typeof s.receipts)
                        ?? (json.rooms ? [] : s.receipts),
      expenses:       (json.payments?.expenses as unknown as typeof s.expenses)
                        ?? (json.rooms ? [] : s.expenses),
      // ให้ครบทุก vault เท่ากับฝั่ง handleExport (replace ต่อ vault — ไม่ merge)
      laborCosts:     (json.production?.laborCosts as unknown as typeof s.laborCosts) ?? s.laborCosts,
      serviceCosts:   json.production?.serviceCosts    ?? s.serviceCosts,
      accessoryCosts: json.production?.accessoryCosts  ?? s.accessoryCosts,
      hardwareCosts:  json.production?.hardwareCosts   ?? s.hardwareCosts,
      fabricCosts:    json.production?.fabricCosts     ?? s.fabricCosts,
      wallpaperCosts: json.production?.wallpaperCosts  ?? s.wallpaperCosts,
      areaCosts:      json.production?.areaCosts       ?? s.areaCosts,
      // merge ทับ default ปัจจุบัน — กัน costInclude บางส่วน (รุ่นเก่า/ไฟล์มือ) ลบ key ที่เหลือ
      costInclude:    { ...s.costInclude, ...(json.production?.costInclude as Partial<typeof s.costInclude> | undefined) },
    });

    // formulas เป็น compile-time constant (src/config/formulas.ts) — ไม่ import จาก backup
    // ถ้า backup เก่ามี formulas → ignore (silent)

    // 4) งานที่ restore = งานปัจจุบัน → เก็บลง "งานทั้งหมด" + ตั้งเป็นงานที่เปิดอยู่
    useAppStore.getState().saveCurrentJob();
    addToast('success', 'นำเข้าข้อมูลสำเร็จ');
    onClose();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const raw = JSON.parse(e.target?.result as string);

        // validate ขั้นต่ำ + migrate schema เก่า (type:'set' ฯลฯ) ผ่านเส้นทางเดียวกับ persist
        // — กันไฟล์ผิดรูปทำแอป crash และกัน backup เก่ากลายเป็น "Unknown item type"
        const result = parseBackup(raw);
        if (!result.ok || !result.data) {
          addToast('error', `ไฟล์ Backup ไม่ถูกต้อง: ${result.error ?? ''}`);
          return;
        }
        void applyRestore(result.data, raw);
      } catch {
        addToast('error', 'ไฟล์ไม่ถูกต้อง หรือเสียหาย');
      }
    };
    reader.readAsText(file);
  };

  const handleImportJson = () => {
    if (!importInput.trim()) {
      addToast('warning', 'กรุณาระบุข้อมูล JSON');
      return;
    }

    try {
      const success =
        activeImportTab === 'favorites'
          ? importFavorites(importInput)
          : importSecrets(importInput);

      if (success) {
        addToast(
          'success',
          activeImportTab === 'favorites' ? 'นำเข้าคลังผ้าสำเร็จ' : 'นำเข้าต้นทุนการผลิตสำเร็จ'
        );
        setImportInput('');
        onClose();
      } else {
        addToast('error', 'รูปแบบ JSON ไม่ถูกต้อง');
      }
    } catch (error) {
      console.error('Import error:', error);
      addToast('error', 'ไม่สามารถประมวลผลข้อมูลได้');
    }
  };

  const handleNewProject = async () => {
    const isConfirmed = await confirm({
      title: 'เริ่มงานใหม่?',
      description:
        'งานปัจจุบันจะถูกเก็บไว้ใน "งานทั้งหมด" อัตโนมัติ แล้วเปิดงานเปล่าให้ — "การตั้งค่าร้าน" และ "ต้นทุน" คงเดิม',
      confirmLabel: 'เริ่มงานใหม่',
      variant: 'default',
    });

    if (isConfirmed) {
      createJob();
      addToast('success', 'เริ่มงานใหม่แล้ว (งานเดิมเก็บไว้ในงานทั้งหมด)');
      onClose();
    }
  };

  // dev only: ใส่ข้อมูลทดสอบ (รหัส 2/หมวด + ลูกค้า 5 ห้องครบเคส) — โหลด seed แบบ dynamic
  // เพื่อให้ prod build (import.meta.env.DEV === false) ตัดโมดูล seed ทิ้ง
  const handleSeed = async () => {
    const ok = await confirm({
      title: 'ใส่ข้อมูลทดสอบ?',
      description:
        'งานปัจจุบันจะถูกเก็บใน "งานทั้งหมด" ก่อน แล้วเพิ่มลูกค้าทดสอบ 3 ราย (งานครบทุกเคส · งานเล็ก · ปิดการขาย) ' +
        'พร้อมรหัสทดสอบ 2 รหัสต่อหมวดสินค้า — สำหรับเดินเครื่องทดสอบเท่านั้น',
      confirmLabel: 'ใส่ข้อมูลทดสอบ',
      variant: 'default',
    });
    if (!ok) return;
    const { seedTestData } = await import('@/lib/dev/seedTestData');
    const r = seedTestData();
    addToast('success', `ใส่ข้อมูลทดสอบแล้ว: ${r.codes} รหัส · ${r.customers} ลูกค้า · ${r.rooms} ห้อง`);
    onClose();
  };

  // ล้างเครื่อง = ทำลายล้างสูงสุด → ผู้ดูแลเท่านั้น (พนักงานกด → เด้งขอ PIN ก่อน)
  const handleFactoryReset = () => {
    if (resetInput !== 'RESET') return;
    requireAdmin(async () => {
      const isConfirmed = await confirm({
        title: 'ยืนยันล้างเครื่อง (Factory Reset)?',
        description:
          'ข้อมูลทุกอย่างรวมถึง การตั้งค่าร้าน, ต้นทุน, และรายการโปรด จะหายไปทั้งหมด! คุณแน่ใจหรือไม่?',
        confirmLabel: 'ล้างข้อมูลทั้งหมด',
        variant: 'destructive',
      });

      if (isConfirmed) {
        factoryReset();
        addToast('success', 'ล้างข้อมูลทั้งหมดเรียบร้อยแล้ว');
        onClose();
      }
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="จัดการข้อมูล (Data Management)" maxWidth="lg">
      <div className="space-y-6 pb-safe-area">
        {/* 🟢 ZONE 1: BACKUP & RESTORE (SAFE) */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <HardDrive className="w-4 h-4" /> สำรองและกู้คืนข้อมูล
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <Button
              variant="outline"
              onClick={handleExport}
              className="h-auto py-4 flex flex-col gap-2 border-border hover:bg-muted hover:border-foreground/20 hover:text-foreground"
            >
              <div className="p-2 bg-muted text-foreground rounded-full">
                <Download className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <div className="text-left">
                <div className="font-bold text-foreground">Backup</div>
                <div className="text-xs text-muted-foreground font-normal">บันทึกไฟล์ .json</div>
              </div>
            </Button>

            <div className="relative">
              <Button
                variant="outline"
                onClick={() => document.getElementById('data-importer')?.click()}
                className="w-full h-full py-4 flex flex-col gap-2 border-border hover:bg-success/5 hover:border-success/20 hover:text-success"
              >
                <div className="p-2 bg-success/10 text-success rounded-full">
                  <Upload className="w-5 h-5" strokeWidth={1.5} />
                </div>
                <div className="text-left">
                  <div className="font-bold text-foreground">Restore</div>
                  <div className="text-xs text-muted-foreground font-normal">นำเข้าไฟล์ .json</div>
                </div>
              </Button>
              <input
                type="file"
                id="data-importer"
                className="hidden"
                accept=".json,application/json"
                onChange={handleFileChange}
              />
            </div>
          </div>
        </div>

        <div className="h-px bg-border my-2" />

        {/* 🔵 ZONE 2: IMPORT JSON TEXT (NEW FEATURE) */}
        <div className="bg-warning/5 border border-warning/20 rounded-xl p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-warning" strokeWidth={1.5} />
            <h4 className="font-bold text-foreground">นำเข้าข้อมูลเฉพาะส่วน (JSON)</h4>
          </div>

          <div className="flex border-b border-warning/20">
            <button
              className={cn(
                'flex-1 py-2 text-sm font-medium border-b-2 transition-colors',
                activeImportTab === 'favorites'
                  ? 'border-warning text-warning'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
              onClick={() => setActiveImportTab('favorites')}
            >
              <div className="flex items-center justify-center gap-2">
                <Star className="w-4 h-4" />
                คลังผ้า (ราคา/ทุน)
              </div>
            </button>
            <button
              className={cn(
                'flex-1 py-2 text-sm font-medium border-b-2 transition-colors',
                activeImportTab === 'cost'
                  ? 'border-warning text-warning'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
              onClick={() => setActiveImportTab('cost')}
            >
              <div className="flex items-center justify-center gap-2">
                <DollarSign className="w-4 h-4" />
                ต้นทุน (Cost)
              </div>
            </button>
          </div>

          <p className="text-sm text-muted-foreground">
            {activeImportTab === 'favorites'
              ? 'วางโค้ด JSON ของคลังผ้า (รหัส ราคาขาย ราคาทุน) ที่คัดลอกมาจากระบบอื่น'
              : 'วางโค้ด JSON ของการตั้งค่าต้นทุน (Labor, Service, Accessory, Fabric)'}
          </p>

          <textarea
            className="w-full h-32 p-3 text-sm font-mono border border-warning/20 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-warning focus:border-transparent
                       bg-background resize-none text-foreground"
            placeholder={`วาง JSON ${TAB_LABEL[activeImportTab]} ที่นี่...`}
            value={importInput}
            onChange={(e) => setImportInput(e.target.value)}
          />

          <Button
            onClick={handleImportJson}
            className="w-full bg-warning hover:bg-warning/90 text-white"
            disabled={!importInput.trim()}
          >
            <Upload className="w-4 h-4 mr-2" strokeWidth={1.5} />
            นำเข้าข้อมูล {TAB_LABEL[activeImportTab]}
          </Button>
        </div>

        <div className="h-px bg-border my-2" />

        {/* 🔵 ZONE 3: NEW PROJECT (OPERATION) */}
        <div className="bg-info/10 border border-info/20 rounded-xl p-4 space-y-3">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-card rounded-xl border border-info/20">
              <FilePlus className="w-6 h-6 text-info" strokeWidth={1.5} />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-foreground">เริ่มโครงการใหม่ (New Project)</h4>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                เคลียร์ข้อมูลลูกค้าและรายการวัดพื้นที่เพื่อเริ่มงานใหม่ <br />
                <span className="text-info font-medium text-xs bg-info/20 px-1.5 py-0.5 rounded">
                  ปลอดภัย
                </span>{' '}
                ข้อมูลร้านค้าและต้นทุนจะไม่หาย
              </p>
              <Button
                onClick={handleNewProject}
                className="mt-4 bg-info hover:bg-info/90 text-white w-full sm:w-auto"
              >
                เริ่มงานใหม่ทันที
              </Button>
            </div>
          </div>
        </div>

        {/* 🧪 ZONE 3.5: SEED TEST DATA (DEV ONLY) */}
        {import.meta.env.DEV && (
          <div className="bg-muted/40 border border-dashed border-border rounded-xl p-4 space-y-3">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-card rounded-xl border border-border">
                <FlaskConical className="w-6 h-6 text-muted-foreground" strokeWidth={1.5} />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-foreground">
                  ใส่ข้อมูลทดสอบ{' '}
                  <span className="text-muted-foreground font-medium text-xs bg-muted px-1.5 py-0.5 rounded">
                    Dev
                  </span>
                </h4>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  รหัสทดสอบ 2 รหัส/หมวด (18 รหัส) + ลูกค้าทดสอบ 3 ราย (ครบทุกเคส · งานเล็ก · ปิดการขาย) <br />
                  งานปัจจุบันถูกเก็บไว้ก่อน · กดซ้ำได้ (ไม่เกิดงานซ้ำ)
                </p>
                <Button
                  variant="outline"
                  onClick={handleSeed}
                  className="mt-4 w-full sm:w-auto"
                >
                  <FlaskConical className="w-4 h-4 mr-2" strokeWidth={1.5} />
                  ใส่ข้อมูลทดสอบ
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 🔴 ZONE 4: DANGER ZONE */}
        <div className="pt-4">
          {!showDangerZone ? (
            <button
              onClick={() => setShowDangerZone(true)}
              className="w-full py-3 text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all border border-dashed border-border hover:border-destructive/30 flex items-center justify-center gap-2"
            >
              <AlertTriangle className="w-3 h-3" strokeWidth={1.5} />
              แสดงเมนูขั้นสูง (ล้างเครื่อง)
            </button>
          ) : (
            <div className="border border-destructive/30 bg-destructive/5 rounded-xl p-5 animate-fade-in">
              <div className="flex items-center gap-2 mb-3 text-destructive font-bold">
                <Trash2 className="w-5 h-5" strokeWidth={1.5} />
                พื้นที่อันตราย (Danger Zone)
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                การ <strong>"Factory Reset"</strong> จะลบข้อมูลทุกอย่างในเครื่องนี้
                รวมถึงการตั้งค่าร้านและสูตรต้นทุน (เหมือนเพิ่งติดตั้งแอพใหม่)
              </p>

              <div className="space-y-3">
                <label className="text-xs font-bold text-muted-foreground uppercase">
                  พิมพ์คำว่า "RESET" เพื่อยืนยัน
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={resetInput}
                    onChange={(e) => setResetInput(e.target.value)}
                    placeholder="RESET"
                    className="flex-1 px-4 py-2 border border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-destructive font-mono uppercase placeholder:text-muted-foreground"
                  />
                  <Button
                    disabled={resetInput !== 'RESET'}
                    variant="destructive"
                    onClick={handleFactoryReset}
                    className="whitespace-nowrap"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" /> ล้างเครื่อง
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
