import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useAppStore } from '@/store/useAppStore';
import { useUIStore } from '@/store/useUIStore';
import { useConfirm } from '@/hooks/useConfirm';
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
} from 'lucide-react';
// ❌ ลบหรือ Comment บรรทัดนี้ออก
// import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface DataModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DataModal: React.FC<DataModalProps> = ({ isOpen, onClose }) => {
  const { resetProject, factoryReset, importFavorites, importSecrets } = useAppStore();
  const addToast = useUIStore((state) => state.addToast);
  const { confirm } = useConfirm();

  const [resetInput, setResetInput] = useState('');
  const [showDangerZone, setShowDangerZone] = useState(false);
  const [importInput, setImportInput] = useState('');
  const [activeImportTab, setActiveImportTab] = useState<'favorites' | 'cost'>('favorites');

  const handleExport = () => {
    try {
      const state = useAppStore.getState();
      const dataToExport = {
        customer: state.customer,
        rooms: state.rooms,
        shopConfig: state.shopConfig,
        discount: state.discount,
        favorites: state.favorites,
        formulas: state.formulas,
        production: {
          laborCosts: state.laborCosts,
          accessoryCosts: state.accessoryCosts,
          fabricCosts: state.fabricCosts,
          wallpaperCosts: state.wallpaperCosts,
          areaCosts: state.areaCosts,
        },
        version: '1.0.0',
        exportDate: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // ✅ [World Class Optimization] ใช้ Native Date เพื่อประหยัด 20KB
      const now = new Date();
      // สร้าง format: yyyy-MM-dd-HHmm (เช่น 2023-12-01-1430)
      const dateStr =
        now.toISOString().slice(0, 10) +
        '-' +
        now.getHours().toString().padStart(2, '0') +
        now.getMinutes().toString().padStart(2, '0');

      a.download = `mtr-backup-${dateStr}.json`;

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      addToast('success', 'Backup ข้อมูลสำเร็จ');
    } catch (e) {
      console.error(e);
      addToast('error', 'เกิดข้อผิดพลาดในการ Backup');
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        const s = useAppStore.getState();

        // Restore only known fields — prevents polluting store with exportDate/version/etc.
        useAppStore.setState({
          customer:       json.customer        ?? s.customer,
          rooms:          json.rooms           ?? s.rooms,
          shopConfig:     json.shopConfig      ?? s.shopConfig,
          discount:       json.discount        ?? s.discount,
          favorites:      json.favorites       ?? s.favorites,
          laborCosts:     json.production?.laborCosts      ?? s.laborCosts,
          accessoryCosts: json.production?.accessoryCosts  ?? s.accessoryCosts,
          fabricCosts:    json.production?.fabricCosts     ?? s.fabricCosts,
          wallpaperCosts: json.production?.wallpaperCosts  ?? s.wallpaperCosts,
          areaCosts:      json.production?.areaCosts       ?? s.areaCosts,
        });

        if (json.formulas && typeof json.formulas === 'object') {
          const { updateFormula } = useAppStore.getState();
          for (const category of ['curtain', 'wallpaper', 'area'] as const) {
            if (json.formulas[category] && typeof json.formulas[category] === 'object') {
              updateFormula(category, json.formulas[category]);
            }
          }
        }

        addToast('success', 'นำเข้าข้อมูลสำเร็จ');
        onClose();
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
      let success = false;

      if (activeImportTab === 'favorites') {
        success = importFavorites(importInput);
        if (success) {
          addToast('success', 'นำเข้าคลังผ้าสำเร็จ');
          setImportInput('');
        }
      } else {
        success = importSecrets(importInput);
        if (success) {
          addToast('success', 'นำเข้าต้นทุนการผลิตสำเร็จ');
          setImportInput('');
        }
      }

      if (!success) {
        addToast('error', 'รูปแบบ JSON ไม่ถูกต้อง');
      } else {
        onClose();
      }
    } catch (error) {
      console.error('Import error:', error);
      addToast('error', 'ไม่สามารถประมวลผลข้อมูลได้');
    }
  };

  const handleNewProject = async () => {
    const isConfirmed = await confirm({
      title: 'เริ่มโครงการใหม่?',
      description:
        'ระบบจะล้างข้อมูลลูกค้าและรายการวัดพื้นที่ทั้งหมด แต่จะเก็บ "การตั้งค่าร้าน" และ "ต้นทุน" ไว้เหมือนเดิม',
      confirmLabel: 'เริ่มงานใหม่',
      variant: 'default',
    });

    if (isConfirmed) {
      resetProject();
      addToast('success', 'เริ่มโครงการใหม่แล้ว');
      onClose();
    }
  };

  const handleFactoryReset = async () => {
    if (resetInput !== 'RESET') return;

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
              className="h-auto py-4 flex flex-col gap-2 border-border hover:bg-primary/5 hover:border-primary/20 hover:text-primary"
            >
              <div className="p-2 bg-primary/10 text-primary rounded-full">
                <Download className="w-5 h-5" />
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
                  <Upload className="w-5 h-5" />
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
        <div className="bg-warning/5 border border-warning/20 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-warning" />
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
              : 'วางโค้ด JSON ของการตั้งค่าต้นทุน (Labor, Accessory, Fabric)'}
          </p>

          <textarea
            className="w-full h-32 p-3 text-sm font-mono border border-warning/20 rounded-lg 
                       focus:outline-none focus:ring-2 focus:ring-warning focus:border-transparent
                       bg-background resize-none text-foreground"
            placeholder={`วาง JSON ${activeImportTab === 'favorites' ? 'คลังผ้า' : 'ต้นทุน'} ที่นี่...`}
            value={importInput}
            onChange={(e) => setImportInput(e.target.value)}
          />

          <Button
            onClick={handleImportJson}
            className="w-full bg-warning hover:bg-warning/90 text-white 
                     shadow-lg shadow-warning/20"
            disabled={!importInput.trim()}
          >
            <Upload className="w-4 h-4 mr-2" />
            นำเข้าข้อมูล {activeImportTab === 'favorites' ? 'คลังผ้า' : 'ต้นทุน'}
          </Button>
        </div>

        <div className="h-px bg-border my-2" />

        {/* 🔵 ZONE 3: NEW PROJECT (OPERATION) */}
        <div className="bg-info/10 border border-info/20 rounded-2xl p-5 space-y-3">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-card rounded-xl shadow-sm border border-info/20">
              <FilePlus className="w-6 h-6 text-info" />
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
                className="mt-4 bg-info hover:bg-info/90 text-white shadow-lg shadow-info/20 w-full sm:w-auto"
              >
                เริ่มงานใหม่ทันที
              </Button>
            </div>
          </div>
        </div>

        {/* 🔴 ZONE 4: DANGER ZONE */}
        <div className="pt-4">
          {!showDangerZone ? (
            <button
              onClick={() => setShowDangerZone(true)}
              className="w-full py-3 text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all border border-dashed border-border hover:border-destructive/30 flex items-center justify-center gap-2"
            >
              <AlertTriangle className="w-3 h-3" />
              แสดงเมนูขั้นสูง (ล้างเครื่อง)
            </button>
          ) : (
            <div className="border border-destructive/30 bg-destructive/5 rounded-2xl p-5 animate-fade-in">
              <div className="flex items-center gap-2 mb-3 text-destructive font-bold">
                <Trash2 className="w-5 h-5" />
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
