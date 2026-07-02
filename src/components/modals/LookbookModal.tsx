// src/components/modals/LookbookModal.tsx
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import jsPDF from 'jspdf';
// html2canvas-pro: drop-in fork that supports modern CSS color functions (oklch/lab/color()).
// Required because Tailwind v4's palette compiles to oklch(), which html2canvas@1 can't parse.
import html2canvas from 'html2canvas-pro';
import JSZip from 'jszip';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useAppStore } from '@/store/useAppStore';
import { useNotificationStore } from '@/store/standalone/useNotificationStore';
import { ITEM_CONFIG } from '@/config/constants';
import { ITEM_TYPES, type ItemTypeKey } from '@/config/enums';
import { fmtDimension, toNum } from '@/utils/formatters';
import { generateItemVisualSvg } from '@/lib/export/svgGenerator';
import { calcWaveHardware, waveSplitFromOpening } from '@/lib/materials/waveHardware';
import { openingStyleLabel } from '@/lib/opening-style';
import { cn } from '@/lib/utils';
import { buildDocFileBase, formatDocCode } from '@/lib/export/docName';
import type { ItemData } from '@/types';
import { FileDown, ImageDown, Loader2, Package, ZoomIn, ZoomOut } from 'lucide-react';

// ─── A4 geometry (mm) — deterministic fixed-height pagination ──────────────────
const A4_W_MM = 210;
const A4_H_MM = 297;
const MM_TO_PX = 96 / 25.4; // CSS px per mm @96dpi
const A4_W_PX = Math.round(A4_W_MM * MM_TO_PX); // ≈ 794
const A4_H_PX = Math.round(A4_H_MM * MM_TO_PX); // ≈ 1123

const PAGE_PAD_MM = 10;
const DOC_HEADER_MM = 20;
const DOC_FOOTER_MM = 8;
const ROOM_HEADER_MM = 10;
const CARD_H_MM = 50; // taller cards → larger drawings + room for bigger detail text
const ROW_GAP_MM = 4;
const ROW_H_MM = CARD_H_MM + ROW_GAP_MM; // 54
const USABLE_H_MM = A4_H_MM - 2 * PAGE_PAD_MM - DOC_HEADER_MM - DOC_FOOTER_MM; // 249

// ─── Pagination data shapes ────────────────────────────────────────────────────
interface CardRow {
  items: ItemData[]; // 1–2 items
}
interface RoomBlock {
  roomId: string;
  roomName: string;
  count: number;
  continued: boolean;
  rows: CardRow[];
}
interface LookbookPage {
  blocks: RoomBlock[];
}

const chunkPairs = (items: ItemData[]): ItemData[][] => {
  const rows: ItemData[][] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));
  return rows;
};

/**
 * Room-grouped pagination into fixed A4 pages.
 * Rooms keep a 📍 header; a room that overflows continues on the next page with "(ต่อ)".
 * Header + first row are kept together (never an orphan header).
 */
function paginate(
  rooms: { id: string; name: string; items: ItemData[] }[],
  allowed: Set<string>
): LookbookPage[] {
  const pages: LookbookPage[] = [];
  let page: LookbookPage = { blocks: [] };
  let remaining = USABLE_H_MM;

  const flush = () => {
    if (page.blocks.length) pages.push(page);
    page = { blocks: [] };
    remaining = USABLE_H_MM;
  };

  for (const room of rooms) {
    const items = room.items.filter((i) => !i.is_suspended && allowed.has(i.type));
    if (items.length === 0) continue; // hide empty rooms after filtering
    const rows = chunkPairs(items);

    // keep header + at least one row together
    if (page.blocks.length && remaining < ROOM_HEADER_MM + ROW_H_MM) flush();

    let block: RoomBlock = {
      roomId: room.id,
      roomName: room.name,
      count: items.length,
      continued: false,
      rows: [],
    };
    page.blocks.push(block);
    remaining -= ROOM_HEADER_MM;

    for (const row of rows) {
      if (remaining < ROW_H_MM) {
        flush();
        block = {
          roomId: room.id,
          roomName: room.name,
          count: items.length,
          continued: true,
          rows: [],
        };
        page.blocks.push(block);
        remaining -= ROOM_HEADER_MM;
      }
      block.rows.push({ items: row });
      remaining -= ROW_H_MM;
    }
  }
  flush();
  return pages;
}

// ─── Per-item card display data (drawing comes from generateItemVisualSvg) ──────
interface CardData {
  title: string;
  dimStr: string;
  specs: string[];
}

function getCardData(item: ItemData): CardData {
  const specs: string[] = [];
  let title: string = ITEM_CONFIG[item.type]?.name ?? 'สินค้า';
  let dimStr = '';

  if (item.type === ITEM_TYPES.CURTAIN) {
    const c = item; // narrowed โดย discriminant — ไม่ต้อง cast
    title = c.style ? `แบบ ${c.style}` : 'ผ้าม่าน';
    if (c.code) specs.push(`ทึบ ${c.code}`);
    if (c.sheer_code) specs.push(`โปร่ง ${c.sheer_code}`);
    if (c.rail_color) specs.push(`ราง ${c.rail_color}`);
    // ป้ายไทยเสมอ — ข้อมูลเก่า/นำเข้าอาจเก็บเป็นโค้ด 'side'/'center'
    if (c.opening_style) specs.push(`เปิด ${openingStyleLabel(c.opening_style)}`);
    // ลูกล้อ — เฉพาะม่านลอน (snap-tape TW14.5); แยกกลาง = N+N, เก็บข้างเดียว = N
    if (c.style === 'ลอน') {
      const hw = calcWaveHardware(toNum(c.width_m) * 100, waveSplitFromOpening(c.opening_style));
      if (hw.totalRollers > 0) {
        specs.push(
          hw.panels === 2
            ? `ลูกล้อ ${hw.rollersPerPanel}+${hw.rollersPerPanel}`
            : `ลูกล้อ ${hw.totalRollers}`
        );
      }
    }
    dimStr = `${fmtDimension(c.width_m)} x ${fmtDimension(c.height_m)} ม.`;
  } else if (item.type === ITEM_TYPES.WALLPAPER) {
    const w = item; // narrowed
    title = 'วอลเปเปอร์';
    if (w.wallpaper_code) specs.push(`รหัส ${w.wallpaper_code}`);
    dimStr = `${w.widths?.length ?? 0} ผนัง · สูง ${fmtDimension(w.height_m)} ม.`;
  } else if (item.type === ITEM_TYPES.REMOVAL) {
    title = item.description || 'งานรื้อถอน';
  } else {
    const a = item; // narrowed เหลือเฉพาะงานพื้นที่
    if (a.code) specs.push(`รหัส ${a.code}`);
    if (a.opening_style) specs.push(`เปิด ${openingStyleLabel(a.opening_style)}`);
    if (a.adjustment_side) specs.push(`ปรับ ${a.adjustment_side}`);
    dimStr = `${fmtDimension(a.width_m)} x ${fmtDimension(a.height_m)} ม.`;
  }
  return { title, dimStr, specs };
}

// ─── Single card: proportional drawing + details ───────────────────────────────
const LookbookCard: React.FC<{ item: ItemData }> = ({ item }) => {
  const { title, dimStr, specs } = getCardData(item);
  return (
    <div
      className="flex rounded-lg border border-slate-200 bg-white overflow-hidden"
      style={{ height: `${CARD_H_MM}mm` }}
    >
      <div
        className="w-2/5 shrink-0 bg-slate-50 flex items-center justify-center p-1.5 [&_svg]:w-full [&_svg]:h-full"
        dangerouslySetInnerHTML={{ __html: generateItemVisualSvg(item) }}
      />
      <div className="flex-1 min-w-0 p-2 flex flex-col">
        <div className="text-[14px] font-bold text-slate-900 leading-tight truncate">{title}</div>
        {dimStr && (
          <div className="text-[13px] font-mono font-bold text-slate-800 border-b border-dashed border-slate-300 pb-0.5 mb-0.5">
            {dimStr}
          </div>
        )}
        <ul className="text-[12px] text-slate-600 space-y-0.5 overflow-hidden">
          {specs.map((s, i) => (
            <li key={i} className="truncate">
              • {s}
            </li>
          ))}
        </ul>
        {item.notes && (
          <div className="mt-auto text-[12px] text-amber-700 dark:text-amber-400 eeert:text-amber-900 line-clamp-2">⚠ {item.notes}</div>
        )}
      </div>
    </div>
  );
};

// ─── One natural-size A4 page ───────────────────────────────────────────────────
interface PageViewProps {
  page: LookbookPage;
  pageNo: number;
  total: number;
  shopName: string;
  logoUrl?: string;
  dateStr: string;
}
const LookbookPageView = React.forwardRef<HTMLDivElement, PageViewProps>(
  ({ page, pageNo, total, shopName, logoUrl, dateStr }, ref) => (
    <div
      ref={ref}
      className="bg-white text-slate-900 font-sans flex flex-col"
      style={{ width: `${A4_W_MM}mm`, height: `${A4_H_MM}mm`, padding: `${PAGE_PAD_MM}mm` }}
    >
      {/* Document header */}
      <div
        className="flex justify-between items-center border-b-2 border-slate-800 pb-2 mb-3 shrink-0"
        style={{ height: `${DOC_HEADER_MM}mm` }}
      >
        <div className="flex items-center gap-3 min-w-0">
          {logoUrl && <img src={logoUrl} alt="" className="h-9 w-auto object-contain" />}
          <div className="min-w-0">
            <div className="text-lg font-bold leading-tight truncate">{shopName}</div>
            <div className="text-[12px] text-slate-500">Lookbook / รายการสินค้า</div>
          </div>
        </div>
        <div className="text-[12px] text-slate-500 shrink-0">{dateStr}</div>
      </div>

      {/* Room blocks */}
      <div className="flex-1 flex flex-col gap-3 overflow-hidden">
        {page.blocks.map((b, bi) => (
          <section key={`${b.roomId}-${bi}`} className="flex flex-col">
            <div
              className="flex items-center gap-1.5 text-[12px] font-bold text-slate-800 mb-1.5 shrink-0"
              style={{ height: `${ROOM_HEADER_MM - 2}mm` }}
            >
              <span>📍</span>
              <span className="truncate">{b.roomName}</span>
              <span className="text-[12px] font-normal text-slate-400 shrink-0">
                ({b.count} รายการ)
                {b.continued ? ' (ต่อ)' : ''}
              </span>
            </div>
            <div className="flex flex-col" style={{ gap: `${ROW_GAP_MM}mm` }}>
              {b.rows.map((row, ri) => (
                <div key={ri} className="grid grid-cols-2" style={{ gap: `${ROW_GAP_MM}mm` }}>
                  {row.items.map((it) => (
                    <LookbookCard key={it.id} item={it} />
                  ))}
                  {row.items.length === 1 && <div aria-hidden />}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Footer (page number) */}
      <div
        className="flex justify-between items-center text-[12px] text-slate-400 border-t border-slate-200 pt-1 shrink-0"
        style={{ height: `${DOC_FOOTER_MM}mm` }}
      >
        <span>สร้างโดยระบบ Marnthara QOL</span>
        <span className="font-mono">
          {pageNo} / {total}
        </span>
      </div>
    </div>
  )
);
LookbookPageView.displayName = 'LookbookPageView';

// ─── Modal ──────────────────────────────────────────────────────────────────────
interface LookbookModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LookbookModal: React.FC<LookbookModalProps> = ({ isOpen, onClose }) => {
  const rooms = useAppStore((s) => s.rooms);
  const shopConfig = useAppStore((s) => s.shopConfig);
  const customer = useAppStore((s) => s.customer);
  const ensureCustomerIdentity = useAppStore((s) => s.ensureCustomerIdentity);
  const addToast = useNotificationStore((s) => s.addToast);

  // Item types present in the project (non-suspended), ordered by ITEM_CONFIG
  const presentTypes = useMemo<string[]>(() => {
    const found = new Set<string>();
    rooms.forEach((r) => r.items.forEach((i) => !i.is_suspended && found.add(i.type)));
    const order = Object.keys(ITEM_CONFIG);
    return [...found].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  }, [rooms]);

  // Filter state — `null` = default (all present types). Once the user touches it we hold an
  // explicit Set. Deriving the effective set in render (no effect) keeps it in sync with the
  // current project: in default mode it always reflects the latest `presentTypes`.
  const [userSel, setUserSel] = useState<Set<string> | null>(null);
  const effective = useMemo(
    () => userSel ?? new Set(presentTypes),
    [userSel, presentTypes]
  );
  const allOn = userSel === null;

  const toggleType = (t: string) =>
    setUserSel((prev) => {
      const next = new Set(prev ?? presentTypes);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  const selectAll = () => setUserSel(null);

  const pages = useMemo(() => paginate(rooms, effective), [rooms, effective]);
  const dateStr = useMemo(
    () => new Date().toLocaleDateString('th-TH', { dateStyle: 'long' }),
    []
  );

  // Off-screen natural-size page refs (captured transform-free → exact A4).
  // Stale entries (when page count shrinks) are nulled by React's callback ref + filtered at capture.
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [busy, setBusy] = useState<null | 'pdf' | 'png'>(null);
  const isExporting = busy !== null;

  // Preview scale-to-fit + manual zoom (for inspecting drawings before exporting)
  const previewRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  const [zoom, setZoom] = useState(1);
  useLayoutEffect(() => {
    if (!isOpen) return;
    const el = previewRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth - 24; // minus padding
      setScale(Math.min(1, Math.max(0.2, w / A4_W_PX)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [isOpen]);
  const renderScale = scale * zoom;
  const ZOOM_MIN = 0.5;
  const ZOOM_MAX = 3;
  const adjustZoom = (delta: number) =>
    setZoom((z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round((z + delta) * 100) / 100)));

  // backfill id แบบ lazy ตอนเปิด → ชื่อไฟล์ export มี customer.id พร้อมใช้
  useEffect(() => {
    if (isOpen) ensureCustomerIdentity();
  }, [isOpen, ensureCustomerIdentity]);

  // มาตรฐานชื่อเอกสาร: lookbook_<ลูกค้า>_<รหัส>_<YYYYMMDD>
  const fileBase = useMemo(
    () =>
      buildDocFileBase(
        'lookbook',
        customer.name,
        formatDocCode({ id: customer.id, code: customer.code, seq: customer.docSeq ?? 1 })
      ),
    [customer.name, customer.id, customer.code, customer.docSeq]
  );

  const captureCanvases = useCallback(async (): Promise<HTMLCanvasElement[]> => {
    const nodes = pageRefs.current.filter((n): n is HTMLDivElement => Boolean(n));
    const out: HTMLCanvasElement[] = [];
    for (const node of nodes) {
      const canvas = await html2canvas(node, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
      });
      out.push(canvas);
    }
    return out;
  }, []);

  const handleExportPdf = useCallback(async () => {
    if (!pages.length) return;
    setBusy('pdf');
    try {
      const canvases = await captureCanvases();
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      canvases.forEach((c, i) => {
        if (i > 0) pdf.addPage();
        pdf.addImage(c.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, A4_W_MM, A4_H_MM);
      });
      pdf.save(`${fileBase}.pdf`);
      addToast('success', 'ดาวน์โหลด PDF เรียบร้อย');
    } catch (e) {
      console.error('Lookbook PDF export failed', e);
      addToast('error', 'สร้าง PDF ไม่สำเร็จ');
    } finally {
      setBusy(null);
    }
  }, [pages.length, captureCanvases, fileBase, addToast]);

  const handleExportPng = useCallback(async () => {
    if (!pages.length) return;
    setBusy('png');
    try {
      const canvases = await captureCanvases(); // each canvas = one A4 page (210:297 ratio)
      const download = (href: string, name: string) => {
        const a = document.createElement('a');
        a.href = href;
        a.download = name;
        a.click();
      };

      if (canvases.length === 1) {
        // single A4 page → one PNG
        download(canvases[0].toDataURL('image/png'), `${fileBase}.png`);
      } else {
        // multiple A4 pages → one PNG per page, bundled in a .zip
        const zip = new JSZip();
        await Promise.all(
          canvases.map(
            (c, i) =>
              new Promise<void>((resolve) => {
                c.toBlob((blob) => {
                  if (blob) zip.file(`${fileBase}-${String(i + 1).padStart(2, '0')}.png`, blob);
                  resolve();
                }, 'image/png');
              })
          )
        );
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(zipBlob);
        download(url, `${fileBase}.zip`);
        URL.revokeObjectURL(url);
      }
      addToast('success', 'ดาวน์โหลด PNG เรียบร้อย');
    } catch (e) {
      console.error('Lookbook PNG export failed', e);
      addToast('error', 'สร้าง PNG ไม่สำเร็จ');
    } finally {
      setBusy(null);
    }
  }, [pages.length, captureCanvases, fileBase, addToast]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Lookbook / รายการสินค้า"
      variant="fullscreen"
      maxWidth="5xl"
    >
      <div className="flex flex-col gap-3 h-full">
        {/* ── Top action bar: zoom (inspect) + export ── */}
        <div className="flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1">
            <button
              onClick={() => adjustZoom(-0.25)}
              disabled={zoom <= ZOOM_MIN}
              title="ย่อ"
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-40 transition-colors"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono text-muted-foreground w-10 text-center tabular-nums">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => adjustZoom(0.25)}
              disabled={zoom >= ZOOM_MAX}
              title="ขยาย"
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-40 transition-colors"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            {zoom !== 1 && (
              <button onClick={() => setZoom(1)} className="ml-1 text-xs text-foreground hover:underline">
                รีเซ็ต
              </button>
            )}
            <span className="ml-2 text-xs text-muted-foreground">{pages.length} หน้า A4</span>
          </div>

          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={onClose} disabled={isExporting}>
              ปิด
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportPng}
              disabled={isExporting || !pages.length}
              className="gap-1.5"
            >
              {busy === 'png' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ImageDown className="w-4 h-4" />
              )}
              PNG
            </Button>
            <Button
              size="sm"
              onClick={handleExportPdf}
              disabled={isExporting || !pages.length}
              className="gap-1.5 bg-primary text-primary-foreground"
            >
              {busy === 'pdf' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileDown className="w-4 h-4" />
              )}
              PDF
            </Button>
          </div>
        </div>

        {/* ── Item-type filter ── */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none shrink-0">
          <button
            onClick={selectAll}
            className={cn(
              'shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors',
              allOn
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card text-muted-foreground border-border hover:text-foreground'
            )}
          >
            ทั้งหมด
          </button>
          {presentTypes.map((t) => {
            const on = effective.has(t);
            return (
              <button
                key={t}
                onClick={() => toggleType(t)}
                className={cn(
                  'shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors',
                  on && !allOn
                    ? 'bg-primary text-primary-foreground border-primary'
                    : on
                      ? 'bg-accent text-foreground border-border'
                      : 'bg-card text-muted-foreground border-border hover:text-foreground'
                )}
              >
                {ITEM_CONFIG[t as ItemTypeKey]?.name ?? t}
              </button>
            );
          })}
        </div>

        {/* ── A4 preview (scaled + zoomable) ── */}
        <div ref={previewRef} className="flex-1 overflow-auto bg-muted/30 rounded-xl p-3 min-h-0">
          {pages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
              <Package className="w-10 h-10 opacity-30" />
              <p className="text-sm">ไม่มีรายการตามตัวกรองที่เลือก</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 w-max min-w-full mx-auto">
              {pages.map((pg, i) => (
                <div
                  key={i}
                  className="shadow-lg bg-white shrink-0"
                  style={{ width: A4_W_PX * renderScale, height: A4_H_PX * renderScale }}
                >
                  <div
                    style={{
                      width: A4_W_PX,
                      height: A4_H_PX,
                      transform: `scale(${renderScale})`,
                      transformOrigin: 'top left',
                    }}
                  >
                    <LookbookPageView
                      page={pg}
                      pageNo={i + 1}
                      total={pages.length}
                      shopName={shopConfig.name || 'ร้านค้า'}
                      logoUrl={shopConfig.logoUrl}
                      dateStr={dateStr}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* ── Off-screen natural-size pages for html2canvas capture ── */}
      <div aria-hidden style={{ position: 'fixed', left: -100000, top: 0, pointerEvents: 'none' }}>
        {pages.map((pg, i) => (
          <div
            key={i}
            ref={(el) => {
              pageRefs.current[i] = el;
            }}
          >
            <LookbookPageView
              page={pg}
              pageNo={i + 1}
              total={pages.length}
              shopName={shopConfig.name || 'ร้านค้า'}
              logoUrl={shopConfig.logoUrl}
              dateStr={dateStr}
            />
          </div>
        ))}
      </div>
    </Modal>
  );
};
