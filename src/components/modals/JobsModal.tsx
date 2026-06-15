// src/components/modals/JobsModal.tsx
//
// "งานทั้งหมด" — กระดานสลับงาน: ลิสต์ลูกค้า/งานที่ค้าง พร้อมสถานะ · เงิน · ความคืบหน้า
//   • งาน active = field live (checkout model) → overlay ข้อมูลสดทับ snapshot ในชั้นวาง
//   • แตะการ์ด → สลับงาน · ชิปสถานะ → เปลี่ยนสเตจ · เมนู → ทำสำเนา/ลบ
//   • เงินต่อการ์ด = summarizeJob (สูตรเดียวกับหน้าหลัก) — ไม่เก็บ snapshot ที่ค้าง

import React, { useMemo, useState } from 'react';
import { Menu, MenuButton, MenuItem, MenuItems, Transition } from '@headlessui/react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAppStore } from '@/store/useAppStore';
import { useUIStore } from '@/store/useUIStore';
import { useConfirm } from '@/hooks/useConfirm';
import { useHaptic } from '@/hooks/useHaptic';
import { useSyncStatus } from '@/hooks/useSyncStatus';
import { cn } from '@/lib/utils';
import { fmtTH } from '@/utils/formatters';
import { extractJobBundle, isBundleEmpty, type JobBundle } from '@/lib/job-bundle';
import { summarizeJob, type JobSummary } from '@/lib/job-summary';
import { JOB_STATUS_ORDER, JOB_STATUS_LABELS, type JobStatusKey } from '@/config/enums';
import { JOB_STATUS_CHIP, JOB_STATUS_DOT } from '@/config/dataTones';
import {
  Plus,
  Search,
  MoreHorizontal,
  Copy,
  Trash2,
  Check,
  FolderKanban,
  ChevronDown,
} from 'lucide-react';

interface JobsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const fmtDate = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
};

export const JobsModal: React.FC<JobsModalProps> = ({ isOpen, onClose }) => {
  const jobs = useAppStore((s) => s.jobs);
  const currentJobId = useAppStore((s) => s.currentJobId);
  const vatRate = useAppStore((s) => s.shopConfig.baseVatRate);
  // live fields ของงานปัจจุบัน (overlay ให้การ์ดสด)
  const customer = useAppStore((s) => s.customer);
  const rooms = useAppStore((s) => s.rooms);
  const discount = useAppStore((s) => s.discount);
  const receipts = useAppStore((s) => s.receipts);
  const expenses = useAppStore((s) => s.expenses);
  const jobStatus = useAppStore((s) => s.jobStatus);

  const switchJob = useAppStore((s) => s.switchJob);
  const createJob = useAppStore((s) => s.createJob);
  const duplicateJob = useAppStore((s) => s.duplicateJob);
  const deleteJob = useAppStore((s) => s.deleteJob);
  const setJobStatus = useAppStore((s) => s.setJobStatus);

  const addToast = useUIStore((s) => s.addToast);
  const { confirm } = useConfirm();
  const { trigger } = useHaptic();
  const sync = useSyncStatus();

  const [query, setQuery] = useState('');
  const PAGE = 50;
  const [visibleCount, setVisibleCount] = useState(PAGE);

  const list = useMemo<JobBundle[]>(() => {
    const live = extractJobBundle({
      customer,
      rooms,
      discount,
      receipts,
      expenses,
      jobStatus,
    });
    const liveId = customer.id ?? live.id;
    live.id = liveId;

    // overlay ข้อมูลสดทับงานปัจจุบันในชั้นวาง
    let arr: JobBundle[] = jobs.map((j) =>
      j.id === currentJobId ? { ...j, ...live, id: j.id, createdAt: j.createdAt } : j
    );
    // งานปัจจุบันยังไม่อยู่ในชั้นวาง (เพิ่งสร้าง) แต่มีเนื้อหา → เติมขึ้นต้น
    if (currentJobId === liveId && !arr.some((j) => j.id === liveId) && !isBundleEmpty(live)) {
      arr = [live, ...arr];
    }

    const q = query.trim().toLowerCase();
    const filtered = q
      ? arr.filter((j) =>
          [j.customer.name, j.customer.phone, j.customer.code].some((v) =>
            (v ?? '').toLowerCase().includes(q)
          )
        )
      : arr;

    // เรียง: งานที่เปิดอยู่ขึ้นก่อน แล้วใหม่→เก่า (updatedAt)
    return [...filtered].sort((a, b) => {
      if (a.id === currentJobId) return -1;
      if (b.id === currentJobId) return 1;
      return a.updatedAt < b.updatedAt ? 1 : -1;
    });
  }, [jobs, currentJobId, customer, rooms, discount, receipts, expenses, jobStatus, query]);

  // คำนวณสรุปเงินครั้งเดียวต่อชุดข้อมูล (กัน recompute ทุก render ตอนงานเยอะ)
  const summaries = useMemo(() => {
    const m = new Map<string, JobSummary>();
    for (const j of list) m.set(j.id, summarizeJob(j, vatRate));
    return m;
  }, [list, vatRate]);

  const handleSwitch = (id: string) => {
    if (id === currentJobId) {
      onClose();
      return;
    }
    trigger('medium');
    switchJob(id);
    addToast('success', 'สลับงานแล้ว');
    onClose();
  };

  const handleNew = () => {
    trigger('medium');
    createJob();
    addToast('success', 'เปิดงานใหม่ (งานเดิมเก็บไว้แล้ว)');
    onClose();
  };

  const handleDuplicate = (id: string) => {
    trigger('light');
    duplicateJob(id);
    addToast('success', 'ทำสำเนางานแล้ว');
  };

  const handleDelete = async (job: JobBundle) => {
    const ok = await confirm({
      title: 'ลบงานนี้?',
      description: `งานของ "${job.customer.name || 'ไม่มีชื่อ'}" จะถูกลบ — กู้คืนไม่ได้`,
      confirmLabel: 'ลบงาน',
      variant: 'destructive',
    });
    if (!ok) return;
    deleteJob(job.id);
    addToast('success', 'ลบงานแล้ว');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="งานทั้งหมด" variant="fullscreen">
      <div className="flex flex-col h-full bg-background pb-safe-area overflow-hidden">
        {/* ── แถบค้นหา + งานใหม่ ── */}
        <div className="shrink-0 px-4 pt-3 pb-3 border-b border-border/50 bg-muted/20 space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Input
                prefix={<Search className="w-4 h-4 text-muted-foreground" />}
                placeholder="ค้นชื่อ / เบอร์ / รหัสลูกค้า"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Button onClick={handleNew} className="shrink-0 gap-1.5 bg-primary text-primary-foreground">
              <Plus className="w-4 h-4" strokeWidth={2} />
              งานใหม่
            </Button>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground px-0.5">
            <span>{list.length > 0 ? `${list.length} งาน` : 'ยังไม่มีงานในระบบ'}</span>
            {!sync.hidden && (
              <span className="flex items-center gap-1.5">
                <span className={cn('w-1.5 h-1.5 rounded-full', sync.dotClass)} />
                {sync.label}
              </span>
            )}
          </div>
        </div>

        {/* ── ลิสต์งาน ── */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
          {list.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <FolderKanban className="w-10 h-10 mx-auto mb-3 opacity-30" strokeWidth={1.5} />
              <p className="text-sm">
                {query ? 'ไม่พบงานที่ค้นหา' : 'ยังไม่มีงาน — กด "งานใหม่" เพื่อเริ่ม'}
              </p>
            </div>
          ) : (
            list.slice(0, visibleCount).map((job) => {
              const sum = summaries.get(job.id) ?? summarizeJob(job, vatRate);
              const isCurrent = job.id === currentJobId;
              const status = job.status as JobStatusKey;
              return (
                <div
                  key={job.id}
                  className={cn(
                    'rounded-2xl border bg-card transition-colors',
                    isCurrent ? 'border-foreground/30 ring-1 ring-foreground/10' : 'border-border/60'
                  )}
                >
                  {/* แถวบน: ชื่อ + สถานะ + เมนู */}
                  <div className="flex items-start gap-2 p-3 pb-2">
                    <button
                      onClick={() => handleSwitch(job.id)}
                      className="flex-1 min-w-0 text-left active:opacity-80"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={cn('w-2 h-2 rounded-full shrink-0', JOB_STATUS_DOT[status])}
                        />
                        <span className="font-bold text-foreground truncate">
                          {job.customer.name || 'งานใหม่ (ยังไม่ตั้งชื่อ)'}
                        </span>
                      </div>
                      {(job.customer.phone || job.customer.code) && (
                        <div className="text-xs text-muted-foreground mt-0.5 ml-4 truncate">
                          {[job.customer.code, job.customer.phone].filter(Boolean).join(' · ')}
                        </div>
                      )}
                    </button>

                    {/* ชิปสถานะ (กดเปลี่ยนสเตจ) */}
                    <StatusMenu
                      status={status}
                      onPick={(s) => {
                        trigger('selection');
                        setJobStatus(s, job.id);
                      }}
                    />

                    {/* เมนูการ์ด */}
                    <Menu as="div" className="relative shrink-0">
                      <MenuButton
                        aria-label="ตัวเลือกงาน"
                        className="p-2 -mr-1 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors active:scale-90"
                      >
                        <MoreHorizontal className="w-4 h-4" strokeWidth={1.5} />
                      </MenuButton>
                      <Transition
                        as={React.Fragment}
                        enter="transition ease-out duration-100"
                        enterFrom="transform opacity-0 scale-95"
                        enterTo="transform opacity-100 scale-100"
                        leave="transition ease-in duration-75"
                        leaveFrom="transform opacity-100 scale-100"
                        leaveTo="transform opacity-0 scale-95"
                      >
                        <MenuItems
                          anchor="bottom end"
                          className="z-50 w-44 origin-top-right rounded-xl bg-popover p-1 shadow-xl ring-1 ring-black/5 focus:outline-none border border-border/50 [--anchor-gap:0.5rem]"
                        >
                          <MenuItem>
                            {({ active }) => (
                              <button
                                onClick={() => handleDuplicate(job.id)}
                                className={cn(
                                  'flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm',
                                  active ? 'bg-muted text-foreground' : 'text-foreground'
                                )}
                              >
                                <Copy className="w-4 h-4" strokeWidth={1.5} /> ทำสำเนา
                              </button>
                            )}
                          </MenuItem>
                          <MenuItem>
                            {({ active }) => (
                              <button
                                onClick={() => handleDelete(job)}
                                className={cn(
                                  'flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm',
                                  active ? 'bg-destructive/10 text-destructive' : 'text-destructive'
                                )}
                              >
                                <Trash2 className="w-4 h-4" strokeWidth={1.5} /> ลบงาน
                              </button>
                            )}
                          </MenuItem>
                        </MenuItems>
                      </Transition>
                    </Menu>
                  </div>

                  {/* แถวเงิน */}
                  <button
                    onClick={() => handleSwitch(job.id)}
                    className="block w-full text-left px-3 active:opacity-80"
                  >
                    <div className="flex items-center gap-3 text-sm flex-wrap">
                      <span className="text-muted-foreground">
                        ราคา{' '}
                        <span className="font-mono tabular-nums font-bold text-foreground">
                          ฿{fmtTH(sum.price)}
                        </span>
                      </span>
                      {sum.received > 0 && (
                        <span className="text-muted-foreground">
                          รับแล้ว{' '}
                          <span className="font-mono tabular-nums font-bold text-emerald-700 dark:text-emerald-400">
                            ฿{fmtTH(sum.received)}
                          </span>
                        </span>
                      )}
                      {sum.balance > 0 && (
                        <span className="text-muted-foreground">
                          ค้างเก็บ{' '}
                          <span className="font-mono tabular-nums font-bold text-amber-600 dark:text-amber-400">
                            ฿{fmtTH(sum.balance)}
                          </span>
                        </span>
                      )}
                    </div>
                  </button>

                  {/* แถวเมตา */}
                  <div className="flex items-center justify-between gap-2 px-3 pt-2 pb-3 mt-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
                      <span className="whitespace-nowrap">
                        {sum.roomCount} ห้อง · {sum.itemCount} จุด
                      </span>
                      {sum.incompleteCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 font-medium whitespace-nowrap">
                          ค้าง {sum.incompleteCount} จุด
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isCurrent && (
                        <span className="text-xs font-bold text-foreground bg-muted px-2 py-0.5 rounded-md">
                          กำลังเปิด
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {fmtDate(job.updatedAt)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {list.length > visibleCount && (
            <button
              onClick={() => setVisibleCount((c) => c + PAGE)}
              className="w-full py-3 rounded-xl border border-dashed border-border text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              ดูเพิ่ม ({list.length - visibleCount} งาน)
            </button>
          )}
          <div className="h-6" />
        </div>
      </div>
    </Modal>
  );
};

// ── ชิปสถานะ + เมนูเลือกสเตจ ────────────────────────────────────────────────
const StatusMenu: React.FC<{
  status: JobStatusKey;
  onPick: (s: JobStatusKey) => void;
}> = ({ status, onPick }) => (
  <Menu as="div" className="relative shrink-0">
    <MenuButton
      className={cn(
        'inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-semibold whitespace-nowrap active:scale-95 transition-transform',
        JOB_STATUS_CHIP[status]
      )}
    >
      {JOB_STATUS_LABELS[status]}
      <ChevronDown className="w-3 h-3 opacity-60" strokeWidth={2} />
    </MenuButton>
    <Transition
      as={React.Fragment}
      enter="transition ease-out duration-100"
      enterFrom="transform opacity-0 scale-95"
      enterTo="transform opacity-100 scale-100"
      leave="transition ease-in duration-75"
      leaveFrom="transform opacity-100 scale-100"
      leaveTo="transform opacity-0 scale-95"
    >
      <MenuItems
        anchor="bottom end"
        className="z-50 w-44 origin-top-right rounded-xl bg-popover p-1 shadow-xl ring-1 ring-black/5 focus:outline-none border border-border/50 [--anchor-gap:0.5rem]"
      >
        {JOB_STATUS_ORDER.map((s) => (
          <MenuItem key={s}>
            {({ active }) => (
              <button
                onClick={() => onPick(s)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm',
                  active ? 'bg-muted text-foreground' : 'text-foreground'
                )}
              >
                <span className={cn('w-2 h-2 rounded-full shrink-0', JOB_STATUS_DOT[s])} />
                <span className="flex-1 text-left">{JOB_STATUS_LABELS[s]}</span>
                {s === status && <Check className="w-4 h-4 text-foreground" strokeWidth={2} />}
              </button>
            )}
          </MenuItem>
        ))}
      </MenuItems>
    </Transition>
  </Menu>
);
