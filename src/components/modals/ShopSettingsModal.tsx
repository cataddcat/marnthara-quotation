import React, { useState, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { useAppStore } from '@/store/useAppStore';
import { ShopConfig } from '@/types';
import { Save, AlertTriangle, Store, CreditCard, FileText, ImagePlus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useConfirm } from '@/hooks/useConfirm';
import { useRequireAdmin } from '@/hooks/useRequireAdmin';
import { useNotificationStore } from '@/store/standalone/useNotificationStore';
import { compressImage } from '@/utils/imageHelper';

interface ShopSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShopSettingsModal: React.FC<ShopSettingsModalProps> = ({ isOpen, onClose }) => {
  const shopConfig = useAppStore((state) => state.shopConfig);
  const updateShopConfig = useAppStore((state) => state.updateShopConfig);
  const factoryReset = useAppStore((state) => state.factoryReset);

  const { confirm } = useConfirm();
  const requireAdmin = useRequireAdmin();
  const addToast = useNotificationStore((state) => state.addToast);

  // Local State
  const [shopData, setShopData] = useState<ShopConfig>(shopConfig);
  const [activeTab, setActiveTab] = useState<'general' | 'payment'>('general');

  // Ref สำหรับ input file
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    updateShopConfig(shopData);
    addToast('success', 'บันทึกข้อมูลร้านค้าเรียบร้อย');
    onClose();
  };

  // ล้างเครื่อง = ทำลายล้างสูงสุด → ผู้ดูแลเท่านั้น (พนักงานกด → เด้งขอ PIN ก่อน)
  const handleReset = () =>
    requireAdmin(async () => {
      const isConfirmed = await confirm({
        title: 'ล้างข้อมูลทั้งหมด?',
        description:
          'การกระทำนี้จะลบข้อมูลลูกค้า รายการสินค้า และการตั้งค่าทั้งหมด ไม่สามารถกู้คืนได้',
        confirmLabel: 'ล้างข้อมูล',
        variant: 'destructive',
      });

      if (isConfirmed) {
        factoryReset();
        addToast('success', 'รีเซ็ตระบบเรียบร้อย');
        onClose();
      }
    });

  const handleShopChange = (field: keyof ShopConfig, value: string) => {
    setShopData((prev) => ({ ...prev, [field]: value }));
  };

  // Handle PDF Config Changes
  const handlePdfChange = (field: keyof ShopConfig['pdf'], value: string) => {
    setShopData((prev) => ({
      ...prev,
      pdf: { ...prev.pdf, [field]: value },
    }));
  };

  // Handle Notes Array (Convert newline to array)
  const handleNotesChange = (value: string) => {
    const notesArray = value.split('\n');
    setShopData((prev) => ({
      ...prev,
      pdf: { ...prev.pdf, notes: notesArray },
    }));
  };

  const handleBankChange = (field: keyof ShopConfig['bankAccount'], value: string | boolean) => {
    setShopData((prev) => ({
      ...prev,
      bankAccount: { ...prev.bankAccount, [field]: value },
    }));
  };

  // Logo Upload Handler
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // เรียกใช้ Utility ย่อรูป
      const compressed = await compressImage(file);

      // อัปเดต State
      setShopData((prev) => ({ ...prev, logoUrl: compressed }));
      addToast('success', 'อัปโหลดโลโก้เรียบร้อย');
    } catch {
      addToast('error', 'เกิดข้อผิดพลาดในการอัปโหลดรูป');
    }
  };

  const handleRemoveLogo = () => {
    setShopData((prev) => ({ ...prev, logoUrl: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="ตั้งค่าร้านค้า (Shop Settings)"
      variant="drawer"
    >
      {/* Tab Navigation */}
      <div className="flex p-1 bg-muted rounded-xl mb-6">
        <button
          onClick={() => setActiveTab('general')}
          className={cn(
            'flex-1 py-2 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2',
            activeTab === 'general'
              ? 'bg-background shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Store className="w-4 h-4" /> ข้อมูลทั่วไป
        </button>
        <button
          onClick={() => setActiveTab('payment')}
          className={cn(
            'flex-1 py-2 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2',
            activeTab === 'payment'
              ? 'bg-background shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <CreditCard className="w-4 h-4" /> การชำระเงิน
        </button>
      </div>

      <div className="space-y-4 pb-safe-area">
        {activeTab === 'general' ? (
          <div className="space-y-6 animate-fade-in">
            {/* Logo Upload Section */}
            <div className="flex flex-col items-center gap-4 py-4">
              {/* Logo Preview Area */}
              <div
                className="relative w-24 h-24 rounded-xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors group"
                onClick={() => fileInputRef.current?.click()}
              >
                {shopData.logoUrl ? (
                  <img
                    src={shopData.logoUrl}
                    alt="Shop Logo"
                    className="w-full h-full object-contain p-2"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-muted-foreground">
                    <ImagePlus className="w-6 h-6" />
                    <span className="text-xs">แตะเพื่อเพิ่ม</span>
                  </div>
                )}

                {/* Hidden Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
              </div>

              {/* Remove Button (Show only if logo exists) */}
              {shopData.logoUrl && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveLogo();
                  }}
                  className="text-xs text-destructive flex items-center gap-1 hover:underline"
                >
                  <Trash2 className="w-3 h-3" /> ลบโลโก้
                </button>
              )}
            </div>

            {/* Basic Info */}
            <div className="space-y-4">
              <Input
                label="ชื่อร้านค้า"
                value={shopData.name}
                onChange={(e) => handleShopChange('name', e.target.value)}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="เบอร์โทรศัพท์"
                  value={shopData.phone}
                  onChange={(e) => handleShopChange('phone', e.target.value)}
                />
                <Input
                  label="เลขผู้เสียภาษี"
                  value={shopData.taxId}
                  onChange={(e) => handleShopChange('taxId', e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">
                  ที่อยู่ร้านค้า
                </label>
                <textarea
                  className="w-full p-3 border border-border rounded-xl text-[16px] focus:outline-none focus:ring-2 focus:ring-ring resize-none h-20"
                  value={shopData.address}
                  onChange={(e) => handleShopChange('address', e.target.value)}
                />
              </div>
              <Input
                label="Logo URL"
                placeholder="https://..."
                value={shopData.logoUrl}
                onChange={(e) => handleShopChange('logoUrl', e.target.value)}
              />
            </div>

            {/* Document Footer Section */}
            <div className="pt-4 border-t border-border">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-info" />
                <h3 className="font-bold text-foreground">ข้อความท้ายเอกสาร (Document Footer)</h3>
              </div>

              <div className="space-y-4 bg-muted/30 p-4 rounded-xl border border-border">
                <Input
                  label="1. ระยะเวลายืนยันราคา"
                  placeholder="เช่น 30 วัน"
                  value={shopData.pdf?.priceValidity || ''}
                  onChange={(e) => handlePdfChange('priceValidity', e.target.value)}
                />
                <Input
                  label="2. เงื่อนไขการชำระเงิน"
                  placeholder="เช่น มัดจำ 50%..."
                  value={shopData.pdf?.paymentTerms || ''}
                  onChange={(e) => handlePdfChange('paymentTerms', e.target.value)}
                />
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">
                    3. หมายเหตุเพิ่มเติม (ขึ้นบรรทัดใหม่เพื่อเพิ่มข้อ)
                  </label>
                  <textarea
                    className="w-full p-3 border border-border rounded-xl text-[16px] focus:outline-none focus:ring-2 focus:ring-ring resize-none h-24"
                    placeholder="เช่น ราคานี้รวมค่าติดตั้งแล้ว..."
                    value={shopData.pdf?.notes?.join('\n') || ''}
                    onChange={(e) => handleNotesChange(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-5 animate-fade-in">
            <div className="flex items-center justify-between bg-muted/30 p-4 rounded-xl border border-border">
              <div className="flex flex-col">
                <span className="font-bold text-foreground">แสดงข้อมูลบัญชีธนาคาร</span>
                <span className="text-xs text-muted-foreground">แสดงท้ายเอกสารใบเสนอราคา</span>
              </div>
              <Switch
                checked={shopData.bankAccount?.isEnabled !== false}
                onCheckedChange={(c) => handleBankChange('isEnabled', c)}
              />
            </div>

            <div
              className={cn(
                'space-y-4 transition-opacity',
                shopData.bankAccount?.isEnabled === false && 'opacity-50 pointer-events-none'
              )}
            >
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="ชื่อธนาคาร"
                  placeholder="เช่น กสิกรไทย, SCB"
                  value={shopData.bankAccount?.bankName || ''}
                  onChange={(e) => handleBankChange('bankName', e.target.value)}
                />
                <Input
                  label="สาขา (ถ้ามี)"
                  value={shopData.bankAccount?.branch || ''}
                  onChange={(e) => handleBankChange('branch', e.target.value)}
                />
              </div>
              <Input
                label="ชื่อบัญชี"
                placeholder="ระบุชื่อบัญชี..."
                value={shopData.bankAccount?.accountName || ''}
                onChange={(e) => handleBankChange('accountName', e.target.value)}
              />
              <Input
                label="เลขที่บัญชี"
                placeholder="XXX-X-XXXXX-X"
                className="font-mono"
                value={shopData.bankAccount?.accountNumber || ''}
                onChange={(e) => handleBankChange('accountNumber', e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between mt-4 pt-4 border-t border-border">
        <Button
          variant="ghost"
          onClick={handleReset}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <AlertTriangle className="w-4 h-4 mr-2" />
          ล้างระบบ
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button onClick={handleSave} className="bg-primary text-primary-foreground w-32">
            <Save className="w-4 h-4 mr-2" /> บันทึก
          </Button>
        </div>
      </div>
    </Modal>
  );
};