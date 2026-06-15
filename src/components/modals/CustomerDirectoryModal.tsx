// src/components/modals/CustomerDirectoryModal.tsx
//
// "ฐานลูกค้า" — ทะเบียนลูกค้า (cloud / local): ค้น/เลือก → เปิดงานใหม่ให้ลูกค้านั้น
//   + เพิ่ม/แก้ลูกค้า · นำเข้า (Customer Contract: วาง/ไฟล์)
// ต่างจาก CustomerModal เดิม (แก้ข้อมูลลูกค้า "ของงานนี้")

import React, { useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAppStore } from '@/store/useAppStore';
import { useUIStore } from '@/store/useUIStore';
import { useConfirm } from '@/hooks/useConfirm';
import { useHaptic } from '@/hooks/useHaptic';
import { useRequireAdmin } from '@/hooks/useRequireAdmin';
import { cn } from '@/lib/utils';
import type { RegistryCustomer } from '@/lib/customers/contract';
import {
  Search,
  UserPlus,
  Upload,
  FilePlus2,
  Pencil,
  Trash2,
  Hash,
  Phone,
  User,
} from 'lucide-react';

interface CustomerDirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Panel = 'none' | 'form' | 'import';

const emptyForm = { code: '', name: '', phone: '', address: '', taxId: '', installationAddress: '' };

export const CustomerDirectoryModal: React.FC<CustomerDirectoryModalProps> = ({
  isOpen,
  onClose,
}) => {
  const registry = useAppStore((s) => s.customerRegistry);
  const importCustomers = useAppStore((s) => s.importCustomers);
  const upsertCustomer = useAppStore((s) => s.upsertCustomer);
  const removeCustomer = useAppStore((s) => s.removeCustomer);
  const createJob = useAppStore((s) => s.createJob);
  const addToast = useUIStore((s) => s.addToast);
  const { confirm } = useConfirm();
  const { trigger } = useHaptic();
  const requireAdmin = useRequireAdmin();

  const [query, setQuery] = useState('');
  const [panel, setPanel] = useState<Panel>('none');
  const [form, setForm] = useState(emptyForm);
  const [importText, setImportText] = useState('');
  const PAGE = 50;
  const [visibleCount, setVisibleCount] = useState(PAGE);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const arr = q
      ? registry.filter((c) =>
          [c.name, c.code, c.phone].some((v) => (v ?? '').toLowerCase().includes(q))
        )
      : registry;
    return [...arr].sort((a, b) => a.name.localeCompare(b.name, 'th'));
  }, [registry, query]);

  const handleOpenJob = (c: RegistryCustomer) => {
    trigger('medium');
    createJob({
      code: c.code,
      name: c.name,
      phone: c.phone,
      address: c.address,
      taxId: c.taxId,
      installationAddress: c.installationAddress,
    });
    addToast('success', `เปิดงานใหม่ให้ ${c.name}`);
    onClose();
  };

  const handleEdit = (c: RegistryCustomer) => {
    setForm({
      code: c.code,
      name: c.name,
      phone: c.phone ?? '',
      address: c.address ?? '',
      taxId: c.taxId ?? '',
      installationAddress: c.installationAddress ?? '',
    });
    setPanel('form');
  };

  // ลบลูกค้า = ทำลายล้าง → ผู้ดูแลเท่านั้น (พนักงานกด → เด้งขอ PIN ก่อน)
  const handleDelete = (c: RegistryCustomer) =>
    requireAdmin(async () => {
      const ok = await confirm({
        title: 'ลบลูกค้าออกจากทะเบียน?',
        description: `"${c.name}" (${c.code}) จะถูกลบจากฐานลูกค้า — งานที่อ้างถึงยังอยู่`,
        confirmLabel: 'ลบ',
        variant: 'destructive',
      });
      if (!ok) return;
      removeCustomer(c.code);
      addToast('success', 'ลบลูกค้าแล้ว');
    });

  const handleSaveForm = () => {
    if (!form.code.trim() || !form.name.trim()) {
      addToast('warning', 'กรอกรหัสและชื่อลูกค้า');
      return;
    }
    upsertCustomer({
      code: form.code.trim(),
      name: form.name.trim(),
      phone: form.phone.trim() || undefined,
      address: form.address.trim() || undefined,
      taxId: form.taxId.trim() || undefined,
      installationAddress: form.installationAddress.trim() || undefined,
    });
    addToast('success', 'บันทึกลูกค้าแล้ว');
    setForm(emptyForm);
    setPanel('none');
  };

  const handleImportText = () => {
    if (!importText.trim()) return;
    let data: unknown;
    try {
      data = JSON.parse(importText);
    } catch {
      addToast('error', 'JSON ไม่ถูกต้อง');
      return;
    }
    const res = importCustomers(data);
    if (res.ok) {
      addToast('success', `นำเข้าลูกค้า ${res.imported} ราย`);
      setImportText('');
      setPanel('none');
    } else {
      addToast('error', `นำเข้าไม่สำเร็จ: ${res.errors[0] ?? ''}`);
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        const res = importCustomers(data);
        if (res.ok) {
          addToast('success', `นำเข้าลูกค้า ${res.imported} ราย`);
          setPanel('none');
        } else {
          addToast('error', `นำเข้าไม่สำเร็จ: ${res.errors[0] ?? ''}`);
        }
      } catch {
        addToast('error', 'ไฟล์ไม่ถูกต้อง');
      }
    };
    reader.readAsText(file);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="ฐานลูกค้า" variant="fullscreen">
      <div className="flex flex-col h-full bg-background pb-safe-area overflow-hidden">
        {/* แถบค้นหา + ปุ่ม */}
        <div className="shrink-0 px-4 pt-3 pb-3 border-b border-border/50 bg-muted/20 space-y-2.5">
          <Input
            prefix={<Search className="w-4 h-4 text-muted-foreground" />}
            placeholder="ค้นชื่อ / รหัส / เบอร์"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setForm(emptyForm);
                setPanel((p) => (p === 'form' ? 'none' : 'form'));
              }}
              className="flex-1 gap-1.5"
            >
              <UserPlus className="w-4 h-4" strokeWidth={1.5} /> เพิ่มลูกค้า
            </Button>
            <Button
              variant="outline"
              onClick={() => setPanel((p) => (p === 'import' ? 'none' : 'import'))}
              className="flex-1 gap-1.5"
            >
              <Upload className="w-4 h-4" strokeWidth={1.5} /> นำเข้า
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {/* ฟอร์มเพิ่ม/แก้ */}
          {panel === 'form' && (
            <div className="rounded-2xl border border-border bg-card p-3 space-y-3 animate-fade-in">
              <div className="grid grid-cols-2 gap-2">
                <Input
                  prefix={<Hash className="w-4 h-4 text-muted-foreground" />}
                  label="รหัสลูกค้า"
                  placeholder="C0007"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                />
                <Input
                  prefix={<User className="w-4 h-4 text-muted-foreground" />}
                  label="ชื่อ"
                  placeholder="ชื่อลูกค้า"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <Input
                prefix={<Phone className="w-4 h-4 text-muted-foreground" />}
                label="เบอร์โทร"
                placeholder="08X-XXX-XXXX"
                inputMode="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
              <Input
                label="ที่อยู่"
                placeholder="ที่อยู่เปิดบิล (ถ้ามี)"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
              <div className="flex gap-2 pt-1">
                <Button variant="outline" onClick={() => setPanel('none')} className="flex-1">
                  ยกเลิก
                </Button>
                <Button
                  onClick={handleSaveForm}
                  className="flex-1 bg-primary text-primary-foreground"
                >
                  บันทึกลูกค้า
                </Button>
              </div>
            </div>
          )}

          {/* นำเข้า */}
          {panel === 'import' && (
            <div className="rounded-2xl border border-border bg-card p-3 space-y-3 animate-fade-in">
              <p className="text-sm text-muted-foreground">
                วาง Customer Contract (marnthara.customers) หรือ array ของลูกค้า แล้วกดนำเข้า
              </p>
              <textarea
                className="w-full h-28 p-3 text-sm font-mono border border-border rounded-lg bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder='{"contract":"marnthara.customers","version":1,"entries":[…]}'
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
              />
              <div className="flex gap-2">
                <label className="flex-1">
                  <input
                    type="file"
                    accept=".json,application/json"
                    className="hidden"
                    onChange={handleImportFile}
                  />
                  <span className="flex items-center justify-center gap-1.5 h-11 rounded-xl border border-border text-sm font-medium cursor-pointer hover:bg-muted transition-colors">
                    <FilePlus2 className="w-4 h-4" strokeWidth={1.5} /> เลือกไฟล์
                  </span>
                </label>
                <Button
                  onClick={handleImportText}
                  disabled={!importText.trim()}
                  className="flex-1 bg-primary text-primary-foreground"
                >
                  นำเข้า
                </Button>
              </div>
            </div>
          )}

          {/* รายการลูกค้า */}
          {list.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <User className="w-10 h-10 mx-auto mb-2 opacity-30" strokeWidth={1.5} />
              <p className="text-sm">
                {query ? 'ไม่พบลูกค้า' : 'ยังไม่มีลูกค้าในทะเบียน — เพิ่ม หรือ นำเข้า'}
              </p>
            </div>
          ) : (
            list.slice(0, visibleCount).map((c) => (
              <div
                key={c.id}
                className="rounded-2xl border border-border/60 bg-card p-3 flex items-center gap-2"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-foreground truncate">{c.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 truncate">
                    {[c.code, c.phone].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <Button
                  onClick={() => handleOpenJob(c)}
                  className="shrink-0 bg-primary text-primary-foreground text-sm h-9 px-3"
                >
                  เปิดงานใหม่
                </Button>
                <button
                  onClick={() => handleEdit(c)}
                  aria-label="แก้ไข"
                  className={cn(
                    'shrink-0 p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors'
                  )}
                >
                  <Pencil className="w-4 h-4" strokeWidth={1.5} />
                </button>
                <button
                  onClick={() => handleDelete(c)}
                  aria-label="ลบ"
                  className="shrink-0 p-2 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>
            ))
          )}

          {list.length > visibleCount && (
            <button
              onClick={() => setVisibleCount((c) => c + PAGE)}
              className="w-full py-3 rounded-xl border border-dashed border-border text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              ดูเพิ่ม ({list.length - visibleCount} ราย)
            </button>
          )}
          <div className="h-6" />
        </div>
      </div>
    </Modal>
  );
};
