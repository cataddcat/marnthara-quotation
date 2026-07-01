import React, { useId, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Search, Check, AlertCircle, AlertTriangle, ChevronsUpDown, Plus } from 'lucide-react';
import { Squircle } from '@/components/ui/Squircle';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { categoryAccent } from '@/lib/vault';
import { normalizeCode } from '@/lib/codes';
import { fmt } from '@/utils/formatters';
import { DATA_TONE_TEXT } from '@/config/dataTones';
import { useCanViewCost } from '@/hooks/useCanViewCost';

/**
 * ตัวเลือก "รหัส" — ใช้ร่วมทุกฟอร์ม (feed จาก useCodeSuggestions).
 * enriched fields (optional) ให้ CodePickerField ค้นหา/จัดกลุ่ม/แสดงผลได้โดยไม่ต้อง derive ซ้ำ.
 */
export interface SuggestionItem<T = unknown> {
  label: string;
  value: string;
  data?: T;
  desc?: string;
  /** ที่มาของรหัส — ใช้จัดกลุ่มในตัวเลือก */
  source?: 'catalog' | 'draft' | 'project';
  /** สตริงค้นหา (lowercase) รวมทุก field ที่ผู้ใช้อาจจำได้ (รหัส/แบรนด์/รุ่น/สี/หมายเหตุ) */
  keywords?: string;
  /** ชื่อรอง — แบรนด์ · รุ่น · สี */
  subtitle?: string;
  /** ราคาขาย (แสดงชิดขวาในแถว) */
  price?: number;
  /** ราคาทุน (โชว์เฉพาะผู้ดูแล — useCanViewCost) */
  cost?: number;
}

interface CodePickerFieldProps<T = unknown> {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (val: string) => void;
  onSelect?: (item: SuggestionItem<T>) => void;
  options: SuggestionItem<T>[];
  className?: string;
  prefix?: React.ReactNode;
  id?: string;
  error?: string;
  warning?: string;
  size?: 'sm' | 'md' | 'lg';
  /** หมวด (สี accent ของรหัสในแถว) — ไม่ส่ง = โทนกลาง */
  category?: string;
}

const SOURCE_ORDER = { project: 0, draft: 1, catalog: 2 } as const;
const SOURCE_LABEL: Record<'project' | 'draft' | 'catalog', string> = {
  project: 'ใช้ในงานนี้',
  draft: 'ในเครื่อง',
  catalog: 'คลัง',
};
const MAX_VISIBLE = 50;

export const CodePickerField = <T = unknown,>({
  label,
  placeholder,
  value,
  onChange,
  onSelect,
  options,
  className,
  prefix,
  id: providedId,
  error,
  warning,
  size = 'md',
  category,
}: CodePickerFieldProps<T>) => {
  const generatedId = useId();
  const id = providedId || generatedId;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const canViewCost = useCanViewCost();

  const accentClass = category ? categoryAccent(category) : 'text-foreground';

  // Status: border → squircle wrapper stroke; text/ring → the field itself
  const statusStroke = error ? 'stroke-destructive' : warning ? 'stroke-warning' : 'stroke-input';

  const sizeClasses = {
    sm: { input: 'h-9 px-3 text-sm rounded-lg', label: 'text-sm' },
    md: { input: 'h-12 px-4 text-base rounded-xl', label: 'text-[15px]' },
    lg: { input: 'h-14 px-4 text-lg rounded-xl', label: 'text-base' },
  }[size];

  // กรองข้ามทุก field (รหัส/แบรนด์/รุ่น/สี/หมายเหตุ) แล้วเรียงกลุ่ม project → draft → catalog (stable)
  const { visible, total, showFreeCode } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const match = (o: SuggestionItem<T>) =>
      q === '' ||
      (o.keywords ?? `${o.label} ${o.subtitle ?? ''} ${o.desc ?? ''}`).toLowerCase().includes(q);
    const filtered = options.filter(match);
    const ordered = [...filtered].sort(
      (a, b) => SOURCE_ORDER[a.source ?? 'catalog'] - SOURCE_ORDER[b.source ?? 'catalog']
    );
    const norm = normalizeCode(query);
    const exists = q !== '' && options.some((o) => normalizeCode(o.value) === norm);
    return {
      visible: ordered.slice(0, MAX_VISIBLE),
      total: filtered.length,
      showFreeCode: q !== '' && !exists,
    };
  }, [options, query]);

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  const handleSelect = (item: SuggestionItem<T>) => {
    onChange(item.value);
    onSelect?.(item);
    close();
  };

  const useFreeCode = () => {
    onChange(query.trim());
    close();
  };

  const selectedNorm = normalizeCode(value);

  // จัดกลุ่มรายการที่แสดง (ใช้ในงานนี้ → ในเครื่อง → คลัง) เป็นการ์ดต่อกลุ่ม
  const groups = (['project', 'draft', 'catalog'] as const)
    .map((src) => ({ src, items: visible.filter((o) => (o.source ?? 'catalog') === src) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <label
          htmlFor={id}
          className={cn(sizeClasses.label, 'font-medium ml-1', error ? 'text-destructive' : 'text-foreground')}
        >
          {label}
        </label>
      )}

      <Squircle
        as="div"
        strokeWidth={1.5}
        pathClassName={cn('fill-background', statusStroke)}
        className={cn('relative w-full', size === 'sm' ? 'rounded-lg' : 'rounded-xl')}
      >
        {prefix && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-10">
            {prefix}
          </div>
        )}
        <button
          type="button"
          id={id}
          onClick={() => setOpen(true)}
          className={cn(
            'flex w-full items-center bg-transparent py-2 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent',
            sizeClasses.input,
            prefix ? 'pl-10' : '',
            'pr-10',
            className
          )}
        >
          <span
            className={cn(
              'flex-1 min-w-0 truncate',
              value ? 'font-mono text-foreground' : 'text-muted-foreground'
            )}
          >
            {value || placeholder || 'เลือกรหัส…'}
          </span>
        </button>
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 z-10 pointer-events-none">
          <ChevronsUpDown className="h-5 w-5 text-muted-foreground/50" aria-hidden="true" />
        </div>
      </Squircle>

      {error ? (
        <div className="flex items-center gap-1.5 px-1 animate-fade-in">
          <AlertCircle className="w-3.5 h-3.5 text-destructive" />
          <span className="text-xs font-medium text-destructive">{error}</span>
        </div>
      ) : warning ? (
        <div className="flex items-center gap-1.5 px-1 animate-fade-in">
          <AlertTriangle className="w-3.5 h-3.5 text-warning" />
          <span className="text-xs font-medium text-warning-foreground">{warning}</span>
        </div>
      ) : null}

      <Modal
        isOpen={open}
        onClose={close}
        variant="drawer"
        title={label ? `เลือก${label}` : 'เลือกรหัส'}
      >
        <div className="space-y-2">
          {/* ค้นหา — pin ไว้บนสุดของ body ให้เลื่อนลิสต์แล้วยังพิมพ์ต่อได้ */}
          <div className="sticky top-0 z-10 -mx-4 px-4 pt-0.5 pb-2 bg-card">
            <Input
              size="sm"
              prefix={<Search className="w-4 h-4" strokeWidth={1.5} />}
              placeholder="ค้นหารหัส / แบรนด์ / รุ่น / สี"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onClear={() => setQuery('')}
              autoFocus
            />
            <p className="text-xs text-muted-foreground mt-1 px-1">
              พบ {total.toLocaleString('th-TH')} / {options.length.toLocaleString('th-TH')} รหัส
            </p>
          </div>

          {/* ใช้รหัสที่พิมพ์เอง (รหัสใหม่/ยังไม่มีในคลัง) */}
          {showFreeCode && (
            <button
              type="button"
              onClick={useFreeCode}
              className="w-full flex items-center gap-2 min-h-11 px-3 py-1.5 rounded-xl border border-dashed border-border bg-muted/20 text-left hover:bg-muted/40 active:scale-[0.99] transition"
            >
              <Plus className="w-4 h-4 text-muted-foreground shrink-0" strokeWidth={1.5} />
              <span className="truncate text-sm text-foreground">
                ใช้รหัส <span className="font-mono font-bold">“{query.trim()}”</span>
              </span>
            </button>
          )}

          {visible.length === 0 && !showFreeCode ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              {options.length === 0 ? 'ยังไม่มีรหัสในหมวดนี้' : `ไม่พบ “${query}”`}
            </div>
          ) : (
            <div className="space-y-3 pb-2">
              {groups.map((g) => (
                <div key={g.src}>
                  <p className="text-xs font-semibold text-muted-foreground px-1 pb-1">
                    {SOURCE_LABEL[g.src]}
                  </p>
                  <div className="rounded-xl border border-border/50 divide-y divide-border/50 overflow-hidden">
                    {g.items.map((item) => {
                      const selected = normalizeCode(item.value) === selectedNorm;
                      return (
                        <button
                          key={`${item.value}-${item.source ?? ''}`}
                          type="button"
                          onClick={() => handleSelect(item)}
                          className={cn(
                            'w-full flex items-center gap-2 min-h-11 px-3 py-1.5 text-left transition active:scale-[0.99]',
                            selected ? 'bg-primary/10' : 'bg-card hover:bg-accent'
                          )}
                        >
                          <span className="min-w-0 flex-1 flex items-baseline gap-1.5">
                            <span className={cn('font-mono font-bold text-sm shrink-0', accentClass)}>
                              {item.label}
                            </span>
                            {canViewCost && typeof item.cost === 'number' && item.cost > 0 && (
                              <span className={cn('shrink-0 text-xs font-mono tabular-nums', DATA_TONE_TEXT.cost)}>
                                {fmt(item.cost, 0)}
                              </span>
                            )}
                            {item.subtitle && (
                              <span className="min-w-0 truncate text-xs text-muted-foreground">
                                {item.subtitle}
                              </span>
                            )}
                          </span>
                          {typeof item.price === 'number' && item.price > 0 && (
                            <span className={cn('shrink-0 text-xs font-mono tabular-nums', DATA_TONE_TEXT.money)}>
                              ฿{fmt(item.price, 0)}
                            </span>
                          )}
                          {selected && <Check className="w-4 h-4 text-primary shrink-0" strokeWidth={1.5} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              {total > MAX_VISIBLE && (
                <p className="text-xs text-muted-foreground text-center">
                  แสดง {MAX_VISIBLE} จาก {total.toLocaleString('th-TH')} — พิมพ์เพื่อค้นหาให้แคบลง
                </p>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
