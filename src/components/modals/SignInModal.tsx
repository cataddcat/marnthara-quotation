// src/components/modals/SignInModal.tsx
// เข้าสู่ระบบบัญชีร้าน (email/password) — เปิดซิงค์งาน/ลูกค้าหลายอุปกรณ์

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/store/useAuthStore';
import { useUIStore } from '@/store/useUIStore';
import { Mail, Lock, Cloud, AlertCircle } from 'lucide-react';

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SignInModal: React.FC<SignInModalProps> = ({ isOpen, onClose }) => {
  const signIn = useAuthStore((s) => s.signIn);
  const signUp = useAuthStore((s) => s.signUp);
  const busy = useAuthStore((s) => s.busy);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);
  const addToast = useUIStore((s) => s.addToast);

  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const canSubmit = email.trim().length > 3 && password.length >= 6 && !busy;

  const submit = async () => {
    if (!canSubmit) return;
    const ok = mode === 'in' ? await signIn(email, password) : await signUp(email, password);
    if (ok) {
      addToast('success', mode === 'in' ? 'เข้าสู่ระบบแล้ว' : 'สร้างบัญชีและเข้าสู่ระบบแล้ว');
      setPassword('');
      onClose();
    }
  };

  const switchMode = () => {
    clearError();
    setMode((m) => (m === 'in' ? 'up' : 'in'));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'in' ? 'เข้าสู่ระบบ' : 'สร้างบัญชีร้าน'}
      description="ซิงค์งานและลูกค้าทุกเครื่องด้วยบัญชีเดียว"
      maxWidth="sm"
    >
      <div className="space-y-5 pb-safe-area">
        <div className="flex items-center gap-3 bg-info/10 border border-info/20 rounded-xl p-3">
          <Cloud className="w-5 h-5 text-info shrink-0" strokeWidth={1.5} />
          <p className="text-sm text-muted-foreground leading-relaxed">
            ลงชื่อเข้าด้วยบัญชีร้านเดียวกันทุกเครื่อง — งาน/ลูกค้าจะอัปเดตข้ามอุปกรณ์อัตโนมัติ
          </p>
        </div>

        <div className="space-y-3">
          <Input
            prefix={<Mail className="w-4 h-4 text-muted-foreground" />}
            label="อีเมล"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="shop@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            prefix={<Lock className="w-4 h-4 text-muted-foreground" />}
            label="รหัสผ่าน"
            type="password"
            autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
            placeholder="อย่างน้อย 6 ตัวอักษร"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
            <AlertCircle className="w-4 h-4 shrink-0" strokeWidth={1.5} />
            <span>{error}</span>
          </div>
        )}

        <Button
          onClick={submit}
          disabled={!canSubmit}
          className="w-full bg-primary text-primary-foreground"
        >
          {busy ? 'กำลังดำเนินการ…' : mode === 'in' ? 'เข้าสู่ระบบ' : 'สร้างบัญชี'}
        </Button>

        <button
          onClick={switchMode}
          className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {mode === 'in' ? 'ยังไม่มีบัญชีร้าน? สร้างบัญชีใหม่' : 'มีบัญชีอยู่แล้ว? เข้าสู่ระบบ'}
        </button>
      </div>
    </Modal>
  );
};
