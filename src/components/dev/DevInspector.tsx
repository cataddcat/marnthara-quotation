import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { Crosshair, Copy, X, Smartphone, MoveVertical, ListOrdered } from 'lucide-react';
import { classifySizePx, type SizeStatus } from '@/config/typography';
import { useMenuConfigStore } from '@/store/useMenuConfigStore';

/**
 * DevInspector — "Design Probe" (dev only). คลิก/ชี้องค์ประกอบบนแอป → รู้ทันทีว่า
 *   • อะไร: ข้อความ + คลาส text-/font-/leading-/tracking-
 *   • ที่ไหน: ไฟล์:บรรทัด (จาก data-loc)
 *   • ขนาดเท่าไหร่: font-size/line-height/weight ที่ render จริง + role ตาม DESIGN.md + ⚠ ถ้าผิดมาตรฐาน
 * แล้วคัดลอกบล็อกพร้อมวางบอก AI เพื่อปรับแบบแม่นยำ (ไม่ใช่ "ปรับตรงนั้น" ลอย ๆ)
 *
 * ทำงานคู่กับ babel plugin (scripts/babel-plugin-data-loc.cjs) ที่ฝัง data-loc บน host element
 * ตอน vite serve เท่านั้น — App.tsx render คอมโพเนนต์นี้ภายใต้ import.meta.env.DEV
 */

interface Probe {
  rect: { top: number; left: number; width: number; height: number };
  loc: string; // "<path>:<line>:<col>"
  text: string;
  fontPx: number;
  lh: string;
  weight: string;
  tokens: string; // text-/font-/leading-/tracking- ที่พบบน element
  hasSize: boolean; // มี token ขนาดบน element เอง (ไม่ใช่สืบทอด)
  roleHint: string;
  status: SizeStatus;
  note: string;
}

// เหนือทุก modal (modal ใช้ z-50/51)
const Z = 2147483000;

const STATUS_COLOR: Record<SizeStatus, string> = {
  ok: '#16a34a',
  warn: '#f59e0b',
  error: '#ef4444',
};

// "<path>:<line>:<col>" → "<path>:<line>" (ตัด column ออกให้สั้น พร้อมวางบอก AI)
const locToRef = (loc: string): string => {
  const parts = loc.split(':');
  return parts.length > 2 ? parts.slice(0, -1).join(':') : loc;
};

const SIZE_TOKEN = /^text-(xs|sm|base|lg|xl|2xl|3xl|4xl)$/;

const buildProbe = (el: HTMLElement): Probe => {
  const r = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  const fontPx = Math.round(parseFloat(cs.fontSize) * 10) / 10;
  const lh = cs.lineHeight === 'normal' ? 'normal' : Math.round(parseFloat(cs.lineHeight)) + 'px';
  const classAttr = el.getAttribute('class') || '';
  const tokens = classAttr
    .split(/\s+/)
    .filter((c) => /^(text-|font-|leading-|tracking-)/.test(c));
  const hasSize = tokens.some((c) => SIZE_TOKEN.test(c) || c.startsWith('text-['));
  const text = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40);
  const v = classifySizePx(fontPx);
  return {
    rect: { top: r.top, left: r.left, width: r.width, height: r.height },
    loc: el.getAttribute('data-loc') || '',
    text,
    fontPx,
    lh,
    weight: cs.fontWeight,
    tokens: tokens.join(' '),
    hasSize,
    roleHint: v.roleHint,
    status: v.status,
    note: v.note,
  };
};

const buildCopy = (p: Probe): string => {
  const sizeLine = `"${p.text}"  ·  ${p.fontPx}px / lh ${p.lh} / w${p.weight}`;
  const classLine = p.hasSize
    ? `classes: ${p.tokens || '(none)'}`
    : `classes: ${p.tokens || '(none)'} — ขนาดสืบทอด (inherited)`;
  const roleLine = `role: ${p.roleHint} (${p.status})${p.note ? ' · ' + p.note : ''}`;
  return [locToRef(p.loc), sizeLine, classLine, roleLine].join('\n');
};

export const DevInspector = () => {
  const [active, setActive] = useState(false);
  const [hover, setHover] = useState<Probe | null>(null);
  const [pinned, setPinned] = useState<Probe | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // โหมดปรับแต่งเมนู (drag-reorder Main Menu) — toggle แล้วเปิด "เมนูหลัก" เพื่อลากจัดเรียง
  const menuEditing = useMenuConfigStore((s) => s.editing);
  const toggleMenuEditing = useMenuConfigStore((s) => s.toggleEditing);

  // จำลอง safe-area iPhone (notch 59px / home bar 34px) บนจอจำลอง Brave/Chromium ที่ env()=0
  // → toggle class `sim-notch` บน <html> (กฎ CSS อยู่ index.css §9.5) + จำสถานะข้าม reload
  // หมายเหตุ: ปุ่มนี้ "เว้นระยะ" อย่างเดียว — การบีบจอเป็นหน้าที่ปุ่ม "จอมือถือ" ด้านล่าง
  const [simNotch, setSimNotch] = useState(
    () => localStorage.getItem('mtr.sim-notch') === '1'
  );
  useEffect(() => {
    document.documentElement.classList.toggle('sim-notch', simNotch);
    localStorage.setItem('mtr.sim-notch', simNotch ? '1' : '0');
  }, [simNotch]);

  // "จอมือถือ" — เปิดแอปใน popup window ขนาดโทรศัพท์ (หน้าต่างจริงแยกต่างหาก →
  // useIsMobile เห็น innerWidth ~390 → แอปเข้าโหมดมือถือแท้ 100%) ใช้คู่กับ Notch ได้
  // (sim-notch แชร์ผ่าน localStorage เดียวกัน). ในตัว popup เองซ่อนปุ่มนี้ (กัน popup ซ้อน popup)
  const isPopup = !!window.opener;
  const openPhoneWindow = () => {
    window.open(window.location.href, 'mtr-phone', 'width=390,height=844,resizable=yes');
  };

  const showFlash = useCallback((msg: string) => {
    setFlash(msg);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), 2200);
  }, []);

  const copy = useCallback(
    (p: Probe) => {
      const block = buildCopy(p);
      if (navigator.clipboard) navigator.clipboard.writeText(block).catch(() => {});
      showFlash(locToRef(p.loc));
    },
    [showFlash]
  );

  // คีย์ลัด: Alt+L สลับโหมด, Esc ปิด (เปิดฟังเสมอใน dev)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'l' || e.key === 'L')) {
        e.preventDefault();
        setActive((v) => !v);
      } else if (e.key === 'Escape') {
        setActive(false);
        setPinned(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ฟัง mousemove/click เฉพาะตอนเปิดโหมด
  useEffect(() => {
    if (!active) return;
    document.body.style.cursor = 'crosshair';

    // ละเว้น element ของ inspector เอง (ปุ่ม/กรอบ/พาเนล) เพื่อให้ปุ่มทำงานปกติ
    const isOwn = (el: Element | null) => !!el && !!el.closest('[data-devinspector]');
    const nearestLoc = (el: Element | null) =>
      (el?.closest('[data-loc]') as HTMLElement | null) ?? null;

    const onMove = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (isOwn(target)) return;
      const el = nearestLoc(target);
      setHover(el ? buildProbe(el) : null);
    };

    const onClick = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (isOwn(target)) return; // คลิกปุ่มในพาเนลทำงานปกติ
      const el = nearestLoc(target);
      if (!el) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      const p = buildProbe(el);
      setPinned(p);
      copy(p);
    };

    // ตรึงแอปไว้ขณะ probe: กัน pointer/mouse-down ไม่ให้ไปถึง UI ข้างล่าง
    // → bottom sheet/drawer (vaul/headless) ที่ปิดตัวเมื่อกด/ลาก/แตะนอก จะไม่หาย
    //   ทำให้ชี้/คลิกตรวจสอบองค์ประกอบในชีตได้ (ยกเว้น UI ของ probe เอง)
    const freeze = (e: Event) => {
      if (isOwn(e.target as Element | null)) return;
      e.stopPropagation();
      e.stopImmediatePropagation();
    };

    document.addEventListener('pointerdown', freeze, true);
    document.addEventListener('mousedown', freeze, true);
    document.addEventListener('mousemove', onMove, true);
    document.addEventListener('click', onClick, true);
    return () => {
      document.body.style.cursor = '';
      document.removeEventListener('pointerdown', freeze, true);
      document.removeEventListener('mousedown', freeze, true);
      document.removeEventListener('mousemove', onMove, true);
      document.removeEventListener('click', onClick, true);
    };
  }, [active, copy]);

  useEffect(
    () => () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
    },
    []
  );

  const renderSummary = (p: Probe) => (
    <>
      <span style={{ color: STATUS_COLOR[p.status], fontWeight: 700 }}>{p.fontPx}px</span>
      {' · '}
      {p.roleHint}
      {p.status !== 'ok' ? ' ⚠' : ''}
    </>
  );

  return createPortal(
    <div data-devinspector="">
      {/* คอลัมน์ปุ่ม dev (ไอคอนล้วน 36px) — ยกพ้น dock ล่าง (dock สูงถึง ~72px จากขอบ) */}
      <div
        style={{
          position: 'fixed',
          left: 10,
          bottom: 84,
          zIndex: Z,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <button
          type="button"
          onClick={() => setActive((v) => !v)}
          onPointerDown={(e) => e.stopPropagation()}
          title={
            active
              ? 'Design Probe: เปิดอยู่ (Esc ปิด) — คลิกองค์ประกอบเพื่อดู อะไร/ที่ไหน/ขนาด แล้วคัดลอก'
              : 'Design Probe (Alt+L) — คลิกองค์ประกอบเพื่อดู อะไร/ที่ไหน/ขนาด แล้วคัดลอก'
          }
          style={devCircleBtn(active)}
        >
          <Crosshair size={16} />
        </button>

        {!isPopup && (
          <button
            type="button"
            onClick={openPhoneWindow}
            onPointerDown={(e) => e.stopPropagation()}
            title="จอมือถือ — เปิดแอปในหน้าต่างขนาด iPhone 13 (390×844) viewport แคบจริง แอปเข้าโหมดมือถือแท้"
            style={devCircleBtn(false)}
          >
            <Smartphone size={16} />
          </button>
        )}

        <button
          type="button"
          onClick={() => setSimNotch((v) => !v)}
          onPointerDown={(e) => e.stopPropagation()}
          title="Notch — จำลองระยะ safe-area iPhone (บน 59px / ล่าง 34px) เว้นระยะ header/dock เหมือนเครื่องจริง (ไม่บีบจอ — ใช้คู่ปุ่มจอมือถือ)"
          style={devCircleBtn(simNotch)}
        >
          <MoveVertical size={16} />
        </button>

        <button
          type="button"
          onClick={toggleMenuEditing}
          onPointerDown={(e) => e.stopPropagation()}
          title="ปรับแต่งเมนู — เปิดโหมดลากจัดเรียงเมนูหลัก (ข้ามหมวดได้) แล้วเปิด 'เมนูหลัก' เพื่อจัด · คัดลอกลำดับไป bake เป็น default"
          style={devCircleBtn(menuEditing)}
        >
          <ListOrdered size={16} />
        </button>
      </div>

      {/* กรอบไฮไลต์ + tooltip (ขนาด/role/ที่อยู่) */}
      {active && hover && (
        <>
          <div
            style={{
              position: 'fixed',
              zIndex: Z - 1,
              pointerEvents: 'none',
              top: hover.rect.top,
              left: hover.rect.left,
              width: hover.rect.width,
              height: hover.rect.height,
              outline: `2px solid ${STATUS_COLOR[hover.status]}`,
              background: 'rgba(14,165,233,0.10)',
              borderRadius: 2,
            }}
          />
          <div
            style={{
              position: 'fixed',
              zIndex: Z,
              pointerEvents: 'none',
              top: Math.max(4, hover.rect.top - 24),
              left: hover.rect.left,
              maxWidth: '92vw',
              padding: '3px 7px',
              borderRadius: 4,
              background: '#0f172a',
              color: '#fff',
              font: '500 11px/1.3 ui-monospace, monospace',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {renderSummary(hover)} · {locToRef(hover.loc)}
          </div>
        </>
      )}

      {/* พาเนลรายละเอียด (ปักหมุดหลังคลิก) — ชิดขวาของคอลัมน์ปุ่ม dev */}
      {active && pinned && (
        <div
          style={{
            position: 'fixed',
            left: 56,
            bottom: 84,
            zIndex: Z,
            width: 360,
            maxWidth: '92vw',
            background: '#0f172a',
            color: '#e2e8f0',
            borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
            font: '500 12px/1.45 ui-monospace, monospace',
            overflow: 'hidden',
          }}
        >
          {/* header: role + size + actions */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 10px',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontWeight: 700,
                color: STATUS_COLOR[pinned.status],
              }}
            >
              {pinned.fontPx}px · {pinned.roleHint}
              {pinned.status !== 'ok' ? ' ⚠' : ''}
            </span>
            <span style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
              <button
                type="button"
                onClick={() => copy(pinned)}
                title="คัดลอกบล็อก"
                style={iconBtn}
              >
                <Copy size={14} />
              </button>
              <button
                type="button"
                onClick={() => setPinned(null)}
                title="ปิด"
                style={iconBtn}
              >
                <X size={14} />
              </button>
            </span>
          </div>

          {/* body */}
          <div style={{ padding: '8px 10px', display: 'grid', gap: 4 }}>
            {pinned.text && (
              <div style={{ color: '#fff' }}>
                “{pinned.text}”
              </div>
            )}
            <div style={{ color: '#94a3b8' }}>
              lh {pinned.lh} · w{pinned.weight}
              {pinned.note ? ` · ${pinned.note}` : ''}
            </div>
            <div style={{ color: '#cbd5e1', wordBreak: 'break-word' }}>
              {pinned.hasSize ? pinned.tokens || '(no type classes)' : `${pinned.tokens || '(no type classes)'} — inherited`}
            </div>
            <div style={{ color: '#38bdf8', wordBreak: 'break-all' }}>{locToRef(pinned.loc)}</div>
          </div>
        </div>
      )}

      {/* flash ยืนยันการคัดลอก */}
      {flash && (
        <div
          style={{
            position: 'fixed',
            zIndex: Z,
            left: 12,
            top: 12,
            pointerEvents: 'none',
            maxWidth: '92vw',
            padding: '8px 12px',
            borderRadius: 8,
            background: '#16a34a',
            color: '#fff',
            font: '500 12px/1.3 ui-monospace, monospace',
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
          }}
        >
          คัดลอกแล้ว: {flash}
        </div>
      )}
    </div>,
    document.body
  );
};

// ปุ่มกลม dev (ไอคอนล้วน) — active = sky
const devCircleBtn = (on: boolean): CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 36,
  height: 36,
  borderRadius: 9999,
  border: '1px solid rgba(0,0,0,0.12)',
  background: on ? '#0ea5e9' : '#1e293b',
  color: '#fff',
  cursor: 'pointer',
  boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
});

const iconBtn: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 28,
  height: 28,
  borderRadius: 6,
  border: '1px solid rgba(255,255,255,0.14)',
  background: 'rgba(255,255,255,0.06)',
  color: '#e2e8f0',
  cursor: 'pointer',
};
