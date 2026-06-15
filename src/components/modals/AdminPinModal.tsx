import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ShieldCheck, Info } from 'lucide-react';
import { useRole } from '@/hooks/useRole';
import { isValidPin } from '@/lib/security/pin';
import { useUIStore } from '@/store/useUIStore';

export type AdminPinIntent = 'unlock' | 'setup' | 'disable';

interface AdminPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** unlock = ปลดเครื่องนี้เป็นผู้ดูแล · setup = ตั้ง/เปลี่ยน PIN · disable = ปิดการ์ด */
  intent: AdminPinIntent;
  /** ทำต่อหลังสำเร็จ (เช่น รัน action ที่ถูกล็อกไว้) */
  onSuccess?: () => void;
}

const TITLE: Record<AdminPinIntent, string> = {
  unlock: 'ปลดล็อกสิทธิ์ผู้ดูแล',
  setup: 'ตั้ง PIN ผู้ดูแล',
  disable: 'ปิดการ์ดผู้ดูแล',
};

const onlyDigits = (v: string) => v.replace(/\D/g, '').slice(0, 6);

export const AdminPinModal: React.FC<AdminPinModalProps> = ({
  isOpen,
  onClose,
  intent,
  onSuccess,
}) => {
  const { unlock, setPin, disableGuard, hasPin } = useRole();
  const addToast = useUIStore((s) => s.addToast);
  const [pin, setPinValue] = useState('');
  const [pin2, setPin2] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const isSetup = intent === 'setup';

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (busy) return;
    setError('');
    setBusy(true);
    try {
      if (isSetup) {
        if (!isValidPin(pin)) {
          setError('PIN ต้องเป็นตัวเลข 4–6 หลัก');
          return;
        }
        if (pin !== pin2) {
          setError('ยืนยัน PIN ไม่ตรงกัน');
          return;
        }
        await setPin(pin);
        addToast('success', hasPin ? 'เปลี่ยน PIN ผู้ดูแลแล้ว' : 'ตั้ง PIN ผู้ดูแลแล้ว');
        onSuccess?.();
        onClose();
        return;
      }
      // unlock / disable — ต้อง verify PIN เดิม
      const ok = await unlock(pin);
      if (!ok) {
        setError('PIN ไม่ถูกต้อง');
        return;
      }
      if (intent === 'disable') {
        disableGuard();
        addToast('info', 'ปิดการ์ดผู้ดูแลแล้ว (ทุกเครื่องเป็นผู้ดูแล)');
      }
      onSuccess?.();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={TITLE[intent]} maxWidth="sm">
      <form onSubmit={submit} className="space-y-4 pb-safe-area">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3">
          <div className="p-2 rounded-lg bg-info/10 text-info shrink-0">
            <ShieldCheck className="w-5 h-5" strokeWidth={1.5} />
          </div>
          <p className="text-sm text-muted-foreground">
            {isSetup
              ? 'ตั้งรหัส PIN สำหรับปลดสิทธิ์ผู้ดูแล เครื่องอื่นที่ล็อกอินบัญชีร้านเดียวกันจะกลายเป็น "พนักงาน" อัตโนมัติ'
              : intent === 'disable'
                ? 'ใส่ PIN เพื่อปิดการ์ด — หลังปิด ทุกเครื่องจะเป็นผู้ดูแล (ทำได้ทุกอย่าง)'
                : 'ใส่ PIN ผู้ดูแลเพื่อปลดล็อกสิทธิ์บนเครื่องนี้'}
          </p>
        </div>

        <Input
          label={isSetup ? 'PIN ใหม่ (4–6 หลัก)' : 'PIN ผู้ดูแล'}
          type="password"
          inputMode="numeric"
          autoComplete="off"
          autoFocus
          value={pin}
          onChange={(e) => setPinValue(onlyDigits(e.target.value))}
          error={error || undefined}
        />

        {isSetup && (
          <Input
            label="ยืนยัน PIN อีกครั้ง"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            value={pin2}
            onChange={(e) => setPin2(onlyDigits(e.target.value))}
          />
        )}

        {isSetup && (
          <div className="flex items-start gap-2 rounded-lg border border-warning/20 bg-warning/5 p-3">
            <Info className="w-4 h-4 text-warning shrink-0 mt-0.5" strokeWidth={1.5} />
            <p className="text-xs text-muted-foreground leading-relaxed">
              นี่คือการ์ด <span className="font-semibold text-foreground">กันพลาด/กันมือลั่น</span> สำหรับทีมที่ใช้บัญชีร้านร่วมกัน —
              ไม่ใช่ระบบความปลอดภัยเต็มรูปแบบ (คนที่รู้รหัสบัญชีร้านยังเลี่ยงได้). ถ้าต้องการแยกสิทธิ์จริง ต้องแยกบัญชีต่อคน
            </p>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button type="submit" className="flex-1" disabled={busy || !pin}>
            {isSetup ? 'บันทึก PIN' : 'ยืนยัน'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
