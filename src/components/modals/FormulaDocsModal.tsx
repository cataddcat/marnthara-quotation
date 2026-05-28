// src/components/modals/FormulaDocsModal.tsx
// 📚 Modal อธิบายสูตรคำนวณทั้งหมด — read-only
// แสดงสูตร + ค่าจริงจาก src/config/formulas.ts (live)
// คำอธิบายเป็นข้อความ static — ถ้าเปลี่ยน logic ใน strategy ต้องอัพเดต modal นี้ด้วย

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { FORMULAS } from '@/config/formulas';
import { useAppStore } from '@/store/useAppStore';
import {
  BookOpen,
  Layers,
  Scroll,
  Square,
  Wrench,
  DollarSign,
  AlertTriangle,
} from 'lucide-react';

interface FormulaDocsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Small helper components for visual consistency
const Section: React.FC<{
  title: string;
  icon: React.ElementType;
  iconColor: string;
  children: React.ReactNode;
}> = ({ title, icon: Icon, iconColor, children }) => (
  <section className="bg-card border border-border/60 rounded-2xl p-4 space-y-3">
    <div className="flex items-center gap-2">
      <Icon className={`w-5 h-5 ${iconColor}`} />
      <h2 className="font-bold text-foreground">{title}</h2>
    </div>
    <div className="space-y-3 text-sm text-foreground/80 leading-relaxed">{children}</div>
  </section>
);

const Code: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <code className="bg-muted px-1.5 py-0.5 rounded text-[12px] font-mono text-primary">
    {children}
  </code>
);

const Formula: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="bg-muted/50 border-l-2 border-primary/40 pl-3 py-2 rounded text-[13px] font-mono text-foreground/90 my-1">
    {children}
  </div>
);

const Note: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200/50 rounded-lg p-2.5 flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400">
    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
    <div>{children}</div>
  </div>
);

export const FormulaDocsModal: React.FC<FormulaDocsModalProps> = ({ isOpen, onClose }) => {
  const c = FORMULAS.curtain;
  const w = FORMULAS.wallpaper;
  const a = FORMULAS.area;
  const m = FORMULAS.materials;
  const vatRate = useAppStore((s) => s.shopConfig.baseVatRate);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="อธิบายสูตรคำนวณ" variant="fullscreen">
      <div className="flex flex-col h-full bg-background overflow-y-auto pb-safe-area">
        <div className="p-4 space-y-4 max-w-3xl mx-auto">
          {/* Intro */}
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 text-sm text-foreground/80 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-primary">
              <BookOpen className="w-4 h-4" /> คู่มืออธิบายสูตรคำนวณ
            </div>
            <p>
              เอกสารนี้แสดงสูตรทั้งหมดที่ระบบใช้คำนวณราคาและวัสดุ ค่าทุกตัวมาจากไฟล์{' '}
              <Code>src/config/formulas.ts</Code> นักพัฒนาแก้ไฟล์เดียวนี้แล้ว build ใหม่
              ค่าทั้งระบบจะอัพเดตทันที
            </p>
          </div>

          {/* ── 🧵 ผ้าม่าน ── */}
          <Section title="🧵 ผ้าม่าน (Curtain)" icon={Layers} iconColor="text-emerald-500">
            <div>
              <p className="font-semibold text-foreground mb-1">ปริมาณผ้าที่ต้องสั่ง (Production Yards)</p>
              <Formula>
                ผ้า (เมตร) = (กว้าง × ตัวคูณ) + เผื่อชาย ({c.hem_offset} ม.)
                <br />
                ผ้า (หลา) = ผ้า (เมตร) ÷ {c.yard_conversion}
                <br />
                ปัดขึ้นทศนิยม 2 ตำแหน่ง
              </Formula>
              <p className="text-xs text-muted-foreground">
                ตัวคูณตาม style:
                <br />• ลอน → ดูตารางลอนด้านล่าง
                <br />• จีบ → {c.multiplier_pleated}
                <br />• ตาไก่ → {c.multiplier_eyelet}
                <br />• พับ (Roman) → ใช้สูตร additive: (กว้าง × {c.multiplier_roman}) + {c.roman_blind_offset} ม.
              </p>
            </div>

            <Note>
              <strong>หมายเหตุ yard_conversion:</strong> ระบบใช้ ÷ {c.yard_conversion} (1 ม. ≈{' '}
              {(1 / c.yard_conversion).toFixed(3)} หลา) — เผื่อ shrinkage + ตัดผิด ~
              {((1 / c.yard_conversion / 1.0936 - 1) * 100).toFixed(1)}%
              <br />
              📐 มาตรฐานสากล: ÷ 0.9144 (1 ม. = 1.0936 หลา exact)
            </Note>

            <div>
              <p className="font-semibold text-foreground mb-1">ตารางลอน (Wave Spacings)</p>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border/60">
                    <th className="text-left py-1.5 font-medium text-muted-foreground">ระยะกระดุม</th>
                    <th className="text-right py-1.5 font-medium text-muted-foreground">ตัวคูณ</th>
                    <th className="text-left py-1.5 pl-3 font-medium text-muted-foreground">ชื่อเรียก</th>
                  </tr>
                </thead>
                <tbody>
                  {c.wave_spacings.map((wave) => (
                    <tr key={wave.spacing} className="border-b border-border/30">
                      <td className="py-1.5 font-mono">{wave.spacing} ซม.</td>
                      <td className="py-1.5 text-right font-mono">×{wave.multiplier}</td>
                      <td className="py-1.5 pl-3 text-muted-foreground">{wave.label}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div>
              <p className="font-semibold text-foreground mb-1">ราคาขาย vs ปริมาณผลิต</p>
              <p className="text-xs text-muted-foreground">
                ราคาขายคิดตาม <strong>ความกว้างหน้าต่าง × ราคาต่อเมตร</strong> เพื่อให้ลูกค้าเข้าใจง่าย
                <br />
                ส่วนสูตรด้านบนคือปริมาณผ้าที่ต้องสั่งซื้อจริง (ใช้ใน Pro Mode + Material Summary)
              </p>
            </div>

            <div>
              <p className="font-semibold text-foreground mb-1">ทึบ + โปร่ง (DOUBLE)</p>
              <p className="text-xs text-muted-foreground">
                ผ้าทึบและผ้าโปร่งคิดแยกกัน ใช้ตัวคูณเดียวกันตาม style
                <br />
                ค่าแรงเย็บผ้าโปร่งคิดแยกใต้คีย์ <Code>'ผ้าโปร่ง'</Code> ใน laborCosts (Cost Vault)
                <br />
                Brackets × {m.bracket_double_multiplier} (รับน้ำหนัก 2 ชั้น)
              </p>
            </div>
          </Section>

          {/* ── 📜 วอลเปเปอร์ ── */}
          <Section title="📜 วอลเปเปอร์ (Wallpaper)" icon={Scroll} iconColor="text-violet-500">
            <Formula>
              แผ่นต่อม้วน = floor({w.roll_length} / (สูง + {w.waste_margin}))
              <br />
              แผ่นที่ต้องการ = ceil(กว้างรวม / {w.roll_width})
              <br />
              จำนวนม้วน = ceil(แผ่นที่ต้องการ / แผ่นต่อม้วน)
            </Formula>
            <p className="text-xs text-muted-foreground">
              หน้ากว้างม้วน: {w.roll_width} ม. · ความยาวม้วน: {w.roll_length} ม. · เผื่อตัด/match
              pattern: {w.waste_margin} ม.
            </p>
            <Note>
              ถ้าผนังสูงเกินม้วน (สูง &gt; {w.roll_length} ม.) ระบบจะแสดง warning ใน Financial Dashboard
              เพราะคำนวณจำนวนม้วนไม่ได้ — ต้องเปลี่ยนม้วนหรือต่อชิ้น
            </Note>
          </Section>

          {/* ── 📐 พื้นที่ (มู่ลี่/ฉาก/มุ้ง) ── */}
          <Section title="📐 พื้นที่ (มู่ลี่/ฉาก/มุ้ง)" icon={Square} iconColor="text-sky-500">
            <Formula>
              พื้นที่ (ตร.ม.) = กว้าง × สูง
              <br />
              พื้นที่ (ตร.ล.) = ตร.ม. × {a.sqm_to_sqyd}
              <br />
              ถ้า &lt; {a.min_yield} ตร.ล. → ใช้ {a.min_yield} (Minimum Yield)
            </Formula>
            <p className="text-xs text-muted-foreground">
              ตัวคูณแปลง: 1 ตร.ม. = {a.sqm_to_sqyd} ตร.ล. (สากล 1 ตร.ม. = 1.196 ตร.ล.)
              <br />
              Minimum yield ป้องกัน micro-orders (เช่น มู่ลี่ขนาด 50×50 ซม.)
            </p>
          </Section>

          {/* ── 🔧 วัสดุ BOM ── */}
          <Section title="🔧 วัสดุ (Bill of Materials)" icon={Wrench} iconColor="text-amber-500">
            <div>
              <p className="font-semibold text-foreground mb-1">ขาแขวน (Brackets)</p>
              <Formula>
                จำนวน = ceil(กว้าง / {m.bracket_spacing}) + 1
                <br />
                DOUBLE → × {m.bracket_double_multiplier} (รับน้ำหนัก 2 ชั้น)
              </Formula>
              <p className="text-xs text-muted-foreground">
                สมมุติฐาน: ระยะ {m.bracket_spacing} ม. เหมาะกับเพดานทั่วไป — เพดานยิปซัมอาจต้อง 0.9 ม.
              </p>
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1">ห่วงตาไก่ (Eyelet Rings)</p>
              <Formula>
                จำนวน = ceil(กว้าง × {c.multiplier_wave} / {m.eyelet_spacing})
              </Formula>
              <p className="text-xs text-muted-foreground">
                ระยะห่าง {m.eyelet_spacing * 100} ซม./ห่วง — มาตรฐานช่างไทย
              </p>
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1">ตะขอจีบ (Pin Hooks)</p>
              <Formula>
                จำนวน = ceil(กว้าง × {c.multiplier_pleated} / {m.pin_spacing}) + {m.pin_extra}
              </Formula>
              <p className="text-xs text-muted-foreground">
                ระยะห่าง {m.pin_spacing * 100} ซม./ตะขอ + เผื่อ {m.pin_extra} ตะขอ
              </p>
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1">เทปลอน (Wave Tape)</p>
              <Formula>ความยาว = กว้าง × {c.multiplier_wave} เมตร</Formula>
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1">ชุดราง Roman</p>
              <Formula>จำนวน = {m.roman_sets_per_window} ชุด/หน้าต่าง</Formula>
              <Note>หน้าต่างกว้างมาก (&gt; 3 ม.) อาจต้องเพิ่มชุด — ต้อง adjust manual</Note>
            </div>
          </Section>

          {/* ── 💰 ภาษี + กำไร ── */}
          <Section title="💰 ภาษี / ส่วนลด / กำไร" icon={DollarSign} iconColor="text-rose-500">
            <div>
              <p className="font-semibold text-foreground mb-1">ภาษีมูลค่าเพิ่ม (VAT)</p>
              <Formula>
                netTotal = ราคารวม − ส่วนลด
                <br />
                VAT = netTotal × {vatRate}/100
                <br />
                ราคารวมสุดท้าย = netTotal + VAT
              </Formula>
              <p className="text-xs text-muted-foreground">
                VAT ปัจจุบัน: <strong>{vatRate}%</strong> (ปรับได้ที่ "ตั้งค่าร้าน") — ตามกฎหมายไทย 7%
              </p>
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1">อัตรากำไร (Gross Margin)</p>
              <Formula>กำไร % = ((ราคาขาย − ต้นทุน) / ราคาขาย) × 100</Formula>
              <p className="text-xs text-muted-foreground">
                เกณฑ์ใน Financial Dashboard (ปรับได้แบบ ad-hoc):
                <br />• กำไร ≥ 30% → 🟢 profit
                <br />• 0 ≤ กำไร &lt; 30% → 🟡 warning
                <br />• กำไร &lt; 0 → 🔴 loss
                <br />• ไม่ทราบทุน → ⚪ unknown
              </p>
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1">Priority Chain ของต้นทุนผ้า</p>
              <p className="text-xs text-muted-foreground">
                ระบบลุก up ต้นทุนตามลำดับ:
                <br />
                1. <strong>Vault</strong> — รหัสผ้าใน <Code>fabricCosts[code]</Code>
                <br />
                2. <strong>กรอกตรง</strong> — <Code>price_sqyd</Code> ในฟอร์ม
                <br />
                3. <strong>Pro Mode</strong> — <Code>_cost_fabric</Code> override ทั้งก้อน
                <br />
                4. <strong>หาไม่เจอ</strong> → flag "ไม่ทราบทุน" (สถานะเทา)
              </p>
            </div>
          </Section>

          {/* Footer */}
          <div className="text-center text-xs text-muted-foreground/60 py-4 border-t border-border/30">
            ค่าทั้งหมดอ่านจาก <Code>src/config/formulas.ts</Code> ในเวลา compile
            <br />
            หากต้องปรับสูตร นักพัฒนาแก้ไฟล์ → build → ทุกค่าอัพเดตทันที
          </div>
        </div>
      </div>
    </Modal>
  );
};
