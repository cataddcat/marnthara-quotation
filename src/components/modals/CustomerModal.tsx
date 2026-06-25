import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { useAppStore } from '@/store/useAppStore';
import { customerToken } from '@/lib/docName';
import { User, MapPin, Phone, FileText, Truck, Hash } from 'lucide-react';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CustomerModal: React.FC<CustomerModalProps> = ({ isOpen, onClose }) => {
  const customer = useAppStore((state) => state.customer);
  const setCustomer = useAppStore((state) => state.setCustomer);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleChange = (field: keyof typeof customer, value: any) => {
    setCustomer({ [field]: value });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="ข้อมูลลูกค้า (Customer Info)">
      <div className="space-y-6 pb-safe-area">
        {/* Section 1: Basic Info */}
        <div className="space-y-4">
          <Input
            prefix={<User className="w-4 h-4 text-muted-foreground" />}
            label="ชื่อลูกค้า / บริษัท (Name)"
            placeholder="ระบุชื่อลูกค้า..."
            value={customer.name}
            onChange={(e) => handleChange('name', e.target.value)}
            autoFocus
          />
          {/* [UPDATED] Phone and Tax ID in separate rows */}
          <Input
            prefix={<Phone className="w-4 h-4 text-muted-foreground" />}
            label="เบอร์โทร (Phone)"
            placeholder="08X-XXX-XXXX"
            value={customer.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            inputMode="tel"
          />
          <Input
            prefix={<FileText className="w-4 h-4 text-muted-foreground" />}
            label="เลขผู้เสียภาษี (Tax ID)"
            placeholder="ถ้ามี..."
            value={customer.taxId || ''}
            onChange={(e) => handleChange('taxId', e.target.value)}
          />
          {/* รหัสลูกค้า — รันจาก UUID/ทะเบียน (DB) เท่านั้น ไม่ให้พิมพ์มือ */}
          <div className="space-y-1.5">
            <span className="text-[15px] font-medium text-foreground ml-1">
              รหัสลูกค้า (Customer Code)
            </span>
            <div className="flex h-12 items-center gap-2 rounded-xl border border-input bg-muted/40 px-4">
              <Hash className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="font-mono tabular-nums text-base text-foreground">
                {customer.code?.trim() || customerToken(customer.id)}
              </span>
              <span className="ml-auto text-xs text-muted-foreground">อัตโนมัติ</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-base font-medium text-foreground ml-1 flex items-center gap-2">
              <MapPin className="w-4 h-4" /> ที่อยู่เปิดบิล (Billing Address)
            </label>
            <textarea
              className="w-full p-3 rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px] resize-none text-[16px] placeholder:text-muted-foreground"
              placeholder="บ้านเลขที่, ถนน, แขวง/ตำบล..."
              value={customer.address}
              onChange={(e) => handleChange('address', e.target.value)}
            />
          </div>
        </div>

        <hr className="border-border" />

        {/* Section 2: Installation Site */}
        <div className="space-y-4 bg-muted/30 p-4 rounded-xl border border-border">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Truck className="w-4 h-4" /> สถานที่ติดตั้ง (Site Location)
            </h3>

            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground cursor-pointer" htmlFor="show-site">
                แสดงในเอกสาร
              </label>
              <Switch
                id="show-site"
                checked={customer.showInstallationAddress !== false} // Default true
                onCheckedChange={(c) => handleChange('showInstallationAddress', c)}
              />
            </div>
          </div>

          {/* [UPDATED] Option: Same Address - Switch on right */}
          <div className="flex items-center justify-between py-1">
            <span className="text-base text-foreground/80">ใช้ที่อยู่ตามบิล</span>
            <Switch
              checked={customer.useSameAddress !== false} // Default true
              onCheckedChange={(c) => handleChange('useSameAddress', c)}
            />
          </div>

          {/* Conditional Input */}
          {customer.useSameAddress === false && (
            <div className="animate-fade-in">
              <textarea
                className="w-full p-3 rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px] resize-none text-[16px] placeholder:text-muted-foreground"
                placeholder="ระบุสถานที่ติดตั้ง..."
                value={customer.installationAddress || ''}
                onChange={(e) => handleChange('installationAddress', e.target.value)}
              />
            </div>
          )}

          {customer.useSameAddress !== false && (
            <div className="p-3 border border-dashed border-border rounded-xl text-center text-muted-foreground text-xs">
              ใช้ที่อยู่เดียวกับด้านบน
            </div>
          )}
        </div>

        <div className="pt-2 flex justify-end">
          <Button
            onClick={onClose}
            className="w-full sm:w-auto bg-primary text-primary-foreground min-w-[120px]"
          >
            เสร็จสิ้น
          </Button>
        </div>
      </div>
    </Modal>
  );
};
