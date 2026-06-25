// src/components/modals/CustomerDirectoryModal.tsx
//
// "ฐานข้อมูลลูกค้า" — มุมมอง "อ่านอย่างเดียว" ของทะเบียนลูกค้า (mirror จาก Firebase Firestore = แหล่งข้อมูลจริง)
//   • ค้น → แตะการ์ดเพื่อกางดูข้อมูลครบทุกฟิลด์ (UUID/รหัส/ชื่อ/เบอร์/ภาษี/ที่อยู่/ติดตั้ง/หมายเหตุ/อัปเดต)
//   • เพิ่ม/แก้/นำเข้า/ลบ ทำที่ Firestore เท่านั้น — ที่นี่ดูอย่างเดียว
// ต่างจาก CustomerModal ("ลูกค้างานนี้" — แก้ชื่อ/ที่อยู่บนเอกสารของงานปัจจุบัน)

import React, { useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { useAppStore } from '@/store/useAppStore';
import { useSyncStatus } from '@/hooks/useSyncStatus';
import { cn } from '@/lib/utils';
import { Search, User, ChevronDown } from 'lucide-react';

interface CustomerDirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CustomerDirectoryModal: React.FC<CustomerDirectoryModalProps> = ({
  isOpen,
  onClose,
}) => {
  const registry = useAppStore((s) => s.customerRegistry);
  const sync = useSyncStatus();

  const [query, setQuery] = useState('');
  const PAGE = 50;
  const [visibleCount, setVisibleCount] = useState(PAGE);
  // เก็บว่าการ์ดลูกค้าไหนถูก "กาง" ดูรายละเอียด
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const toggleExpand = (id: string) =>
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const arr = q
      ? registry.filter((c) =>
          [c.name, c.code, c.phone].some((v) => (v ?? '').toLowerCase().includes(q))
        )
      : registry;
    return [...arr].sort((a, b) => a.name.localeCompare(b.name, 'th'));
  }, [registry, query]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="ฐานข้อมูลลูกค้า" variant="fullscreen">
      <div className="flex flex-col h-full bg-background pb-safe-area overflow-hidden">
        {/* แถบค้นหา + สถานะ */}
        <div className="shrink-0 px-4 pt-3 pb-3 border-b border-border/50 bg-muted/20 space-y-2.5">
          <Input
            prefix={<Search className="w-4 h-4 text-muted-foreground" />}
            placeholder="ค้นชื่อ / รหัส / เบอร์"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground px-0.5">
            <span>
              {list.length > 0 ? `${list.length} ราย · ดูอย่างเดียว` : 'ยังไม่มีลูกค้าในฐานข้อมูล'}
            </span>
            {!sync.hidden && (
              <span className="flex items-center gap-1.5">
                <span className={cn('w-1.5 h-1.5 rounded-full', sync.dotClass)} />
                {sync.label}
              </span>
            )}
          </div>
        </div>

        {/* รายการลูกค้า — ดูอย่างเดียว, แตะเพื่อกางทุกฟิลด์ */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
          {list.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <User className="w-10 h-10 mx-auto mb-2 opacity-30" strokeWidth={1.5} />
              <p className="text-sm">
                {query ? 'ไม่พบลูกค้า' : 'ยังไม่มีลูกค้า — ข้อมูลมาจาก Firestore'}
              </p>
            </div>
          ) : (
            list.slice(0, visibleCount).map((c) => {
              const expanded = expandedIds.has(c.id);
              return (
                <div
                  key={c.id}
                  className="rounded-2xl border border-border/60 bg-card overflow-hidden"
                >
                  <button
                    onClick={() => toggleExpand(c.id)}
                    aria-expanded={expanded}
                    className="w-full flex items-center gap-2 p-3 text-left active:opacity-80"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-foreground truncate">{c.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 truncate">
                        {[c.code, c.phone].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    <ChevronDown
                      className={cn(
                        'w-4 h-4 shrink-0 text-muted-foreground/50 transition-transform',
                        expanded && 'rotate-180'
                      )}
                      strokeWidth={1.5}
                    />
                  </button>
                  {expanded && (
                    <dl className="px-3 pb-3 pt-2 space-y-2 border-t border-border/50 animate-fade-in">
                      <DetailRow label="UUID" value={c.id} mono />
                      <DetailRow label="รหัสลูกค้า" value={c.code} mono />
                      <DetailRow label="ชื่อ" value={c.name} />
                      <DetailRow label="เบอร์โทร" value={c.phone} />
                      <DetailRow label="เลขผู้เสียภาษี" value={c.taxId} mono />
                      <DetailRow label="ที่อยู่เปิดบิล" value={c.address} />
                      <DetailRow label="ที่อยู่ติดตั้ง" value={c.installationAddress} />
                      <DetailRow label="หมายเหตุ" value={c.note} />
                      <DetailRow label="อัปเดตล่าสุด" value={c.updated_at} />
                    </dl>
                  )}
                </div>
              );
            })
          )}

          {list.length > visibleCount && (
            <button
              onClick={() => setVisibleCount((n) => n + PAGE)}
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

// แถวรายละเอียด: label ⟷ value (ค่าว่าง → "—"); mono สำหรับรหัส/UUID/ตัวเลข
const DetailRow: React.FC<{ label: string; value?: string; mono?: boolean }> = ({
  label,
  value,
  mono,
}) => (
  <div className="flex items-start justify-between gap-3">
    <dt className="text-xs text-muted-foreground shrink-0">{label}</dt>
    <dd
      className={cn(
        'text-sm text-foreground text-right break-all min-w-0',
        mono && 'font-mono tabular-nums'
      )}
    >
      {value?.trim() ? value : '—'}
    </dd>
  </div>
);
