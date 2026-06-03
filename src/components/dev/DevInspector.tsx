import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Crosshair } from 'lucide-react';

/**
 * DevInspector — เครื่องมือ dev: คลิกองค์ประกอบบนแอป → คัดลอก "ไฟล์:บรรทัด" ลง clipboard
 * เพื่อบอก AI ได้ตรงจุด (แก้ปัญหา "ไม่รู้ว่าส่วนนี้คืออะไร/อยู่ไฟล์ไหน")
 *
 * ทำงานคู่กับ babel plugin (scripts/babel-plugin-data-loc.cjs) ที่ฝัง data-loc บน host element
 * ตอน vite serve เท่านั้น — App.tsx render คอมโพเนนต์นี้ภายใต้ import.meta.env.DEV
 */

interface HoverInfo {
  rect: { top: number; left: number; width: number; height: number };
  loc: string; // "<path>:<line>:<col>"
}

// เหนือทุก modal (modal ใช้ z-50/51)
const Z = 2147483000;

// "<path>:<line>:<col>" → "<path>:<line>" (ตัด column ออกให้สั้น พร้อมวางบอก AI)
const locToRef = (loc: string): string => {
  const parts = loc.split(':');
  return parts.length > 2 ? parts.slice(0, -1).join(':') : loc;
};

export const DevInspector = () => {
  const [active, setActive] = useState(false);
  const [hover, setHover] = useState<HoverInfo | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showFlash = useCallback((msg: string) => {
    setFlash(msg);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), 2200);
  }, []);

  // คีย์ลัด: Alt+L สลับโหมด, Esc ปิด (เปิดฟังเสมอใน dev)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'l' || e.key === 'L')) {
        e.preventDefault();
        setActive((v) => !v);
      } else if (e.key === 'Escape') {
        setActive(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ฟัง mousemove/click เฉพาะตอนเปิดโหมด
  useEffect(() => {
    // ปิดโหมด → ไม่ต้องเคลียร์ hover (render guard ด้วย `active && hover` อยู่แล้ว)
    if (!active) return;
    document.body.style.cursor = 'crosshair';

    // ละเว้น element ของ inspector เอง (ปุ่ม/กรอบ) เพื่อให้ปุ่มทำงานปกติ
    const isOwn = (el: Element | null) => !!el && !!el.closest('[data-devinspector]');
    const nearestLoc = (el: Element | null) =>
      (el?.closest('[data-loc]') as HTMLElement | null) ?? null;

    const onMove = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (isOwn(target)) {
        setHover(null);
        return;
      }
      const el = nearestLoc(target);
      if (!el) {
        setHover(null);
        return;
      }
      const r = el.getBoundingClientRect();
      setHover({
        rect: { top: r.top, left: r.left, width: r.width, height: r.height },
        loc: el.getAttribute('data-loc') || '',
      });
    };

    const onClick = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (isOwn(target)) return;
      const el = nearestLoc(target);
      if (!el) return;
      e.preventDefault();
      e.stopPropagation();
      const ref = locToRef(el.getAttribute('data-loc') || '');
      if (!ref) return;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(ref).catch(() => {});
      }
      showFlash(ref);
    };

    document.addEventListener('mousemove', onMove, true);
    document.addEventListener('click', onClick, true);
    return () => {
      document.body.style.cursor = '';
      document.removeEventListener('mousemove', onMove, true);
      document.removeEventListener('click', onClick, true);
    };
  }, [active, showFlash]);

  // เคลียร์ timer ตอน unmount
  useEffect(
    () => () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
    },
    []
  );

  return createPortal(
    <div data-devinspector="">
      {/* ปุ่มลอย toggle */}
      <button
        type="button"
        onClick={() => setActive((v) => !v)}
        title="ระบุตำแหน่งโค้ด (Alt+L) — คลิกองค์ประกอบเพื่อคัดลอก ไฟล์:บรรทัด"
        style={{
          position: 'fixed',
          left: 12,
          bottom: 12,
          zIndex: Z,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 12px',
          borderRadius: 9999,
          border: '1px solid rgba(0,0,0,0.12)',
          background: active ? '#0ea5e9' : '#1e293b',
          color: '#fff',
          font: '600 12px/1 system-ui, sans-serif',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
        }}
      >
        <Crosshair size={14} />
        {active ? 'ระบุตำแหน่ง: เปิด (Esc ปิด)' : 'ระบุตำแหน่ง'}
      </button>

      {/* กรอบไฮไลต์ + tooltip path:line */}
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
              outline: '2px solid #0ea5e9',
              background: 'rgba(14,165,233,0.12)',
              borderRadius: 2,
            }}
          />
          <div
            style={{
              position: 'fixed',
              zIndex: Z,
              pointerEvents: 'none',
              top: Math.max(4, hover.rect.top - 22),
              left: hover.rect.left,
              maxWidth: '92vw',
              padding: '3px 6px',
              borderRadius: 4,
              background: '#0ea5e9',
              color: '#fff',
              font: '500 11px/1.2 ui-monospace, monospace',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {locToRef(hover.loc)}
          </div>
        </>
      )}

      {/* flash ยืนยันการคัดลอก */}
      {flash && (
        <div
          style={{
            position: 'fixed',
            zIndex: Z,
            left: 12,
            bottom: 56,
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
