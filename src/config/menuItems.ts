// src/config/menuItems.ts
// ────────────────────────────────────────────────────────────────────────────
// นิยามรายการ "เมนูหลัก" แบบ data-driven (flat array ของ entries) — แทน JSX ตายตัวเดิม
// เพื่อให้ drag-reorder ได้ (โหมดปรับแต่งเมนู, dev tool) + bake ลำดับเป็น default ในไฟล์นี้
//
// ลำดับ = ตำแหน่งใน array; "หมวดของรายการ" = หัวข้อ (section) ที่อยู่ก่อนหน้ามัน →
// ลากข้ามหัวข้อ = ย้ายหมวดเอง (ไม่ต้องเก็บ sectionId แยก). tone ของรายการเป็นของตัวเอง.
// ────────────────────────────────────────────────────────────────────────────

import type { ElementType } from 'react';
import {
  FolderKanban,
  LayoutDashboard,
  User,
  Users,
  FileText,
  MessageSquareText,
  BookOpen,
  Layers,
  Percent,
  TrendingUp,
  ShieldCheck,
  Settings,
  Calculator,
  Database,
  History,
} from 'lucide-react';
import type { MenuGroup, MenuIconTone } from '@/config/dataTones';

/** คีย์ของ action — MainMenuModal map ไป handler (เปิด modal) จริง */
export type MenuAction =
  | 'jobs'
  | 'overview'
  | 'customer'
  | 'customerDirectory'
  | 'pdf'
  | 'copySummary'
  | 'lookbook'
  | 'materialSummary'
  | 'discount'
  | 'costDashboard'
  | 'productionSettings'
  | 'shopSettings'
  | 'formulaDocs'
  | 'data'
  | 'undoHistory';

/** บล็อกพิเศษ (เนื้อหา bespoke ใน MainMenuModal) ที่ลาก-ย้ายได้เหมือนรายการเมนู */
export type MenuBlockId = 'account' | 'role' | 'appearance';

export type MenuEntry =
  | { kind: 'section'; id: string; label: string; tone: MenuGroup }
  | {
      kind: 'item';
      id: string;
      label: string;
      desc?: string;
      icon: ElementType;
      tone: MenuIconTone;
      action: MenuAction;
      /** ต้นทุน/กำไร = ความลับร้าน → wrap AdminGate (พนักงานไม่เห็น) */
      adminOnly?: boolean;
    }
  | { kind: 'block'; id: MenuBlockId; label: string };

/**
 * ลำดับ default ของเมนู — "bake" ลำดับใหม่ได้ที่นี่ (ย้ายบรรทัดใน array นี้)
 * id ของรายการ = คีย์ action (สะดวก); id ของหัวข้อขึ้นต้น 'sec-' (ไม่ชนกับรายการ)
 */
export const MENU_ENTRIES: MenuEntry[] = [
  // ── บล็อกบัญชี/ตั้งค่า (บนสุด — ลาก-ย้ายได้ในโหมดปรับแต่ง) ──
  { kind: 'block', id: 'account', label: 'บัญชี & ซิงค์' },
  { kind: 'block', id: 'role', label: 'การ์ดผู้ดูแล (PIN)' },
  { kind: 'block', id: 'appearance', label: 'ธีม & โหมด' },

  // ── A · งาน & ลูกค้า ──
  { kind: 'section', id: 'sec-jobs', label: 'งาน & ลูกค้า', tone: 'jobs' },
  { kind: 'item', id: 'jobs', label: 'งานทั้งหมด', desc: 'สลับงาน · ดูความคืบหน้าทุกงาน', icon: FolderKanban, tone: 'jobs', action: 'jobs' },
  { kind: 'item', id: 'overview', label: 'ภาพรวมห้อง', desc: 'ดูทุกห้องแบบแดชบอร์ด', icon: LayoutDashboard, tone: 'jobs', action: 'overview' },
  { kind: 'item', id: 'customer', label: 'ลูกค้างานนี้', desc: 'แก้ชื่อ/ที่อยู่บนเอกสาร', icon: User, tone: 'jobs', action: 'customer' },
  { kind: 'item', id: 'customerDirectory', label: 'ฐานลูกค้า', desc: 'เลือกลูกค้า · เปิดงานใหม่', icon: Users, tone: 'jobs', action: 'customerDirectory' },

  // ── B · ส่งให้ลูกค้า ──
  { kind: 'section', id: 'sec-deliver', label: 'ส่งให้ลูกค้า', tone: 'deliver' },
  { kind: 'item', id: 'pdf', label: 'ใบเสนอราคา', icon: FileText, tone: 'deliver', action: 'pdf' },
  { kind: 'item', id: 'copySummary', label: 'คัดลอกสรุป', desc: 'ส่ง LINE คุยลูกค้า/ช่าง', icon: MessageSquareText, tone: 'deliver', action: 'copySummary' },
  { kind: 'item', id: 'lookbook', label: 'Lookbook', desc: 'แคตตาล็อกโชว์ผลงาน', icon: BookOpen, tone: 'deliver', action: 'lookbook' },

  // ── C · ราคา & เงิน (ต้นทุน/กำไรเฉพาะผู้ดูแล) ──
  { kind: 'section', id: 'sec-money', label: 'ราคา & เงิน', tone: 'money' },
  { kind: 'item', id: 'materialSummary', label: 'สินค้า & ราคา', desc: 'รหัส/ราคาจากผู้ผลิต (อ่านอย่างเดียว)', icon: Layers, tone: 'material', action: 'materialSummary' },
  { kind: 'item', id: 'discount', label: 'จัดการส่วนลด', desc: 'ลดท้ายบิล / โปรโมชัน', icon: Percent, tone: 'discount', action: 'discount' },
  { kind: 'item', id: 'costDashboard', label: 'การเงินของงาน', desc: 'มัดจำ · จ่ายจริง · คงเหลือ · ทุนที่รู้', icon: TrendingUp, tone: 'money', action: 'costDashboard', adminOnly: true },
  { kind: 'item', id: 'productionSettings', label: 'โครงสร้างต้นทุน', desc: 'ค่าแรง / ค่าบริการ', icon: ShieldCheck, tone: 'cost', action: 'productionSettings', adminOnly: true },

  // ── D · ระบบ & ร้าน ──
  { kind: 'section', id: 'sec-system', label: 'ระบบ & ร้าน', tone: 'system' },
  { kind: 'item', id: 'shopSettings', label: 'ตั้งค่าร้านค้า', icon: Settings, tone: 'system', action: 'shopSettings' },
  { kind: 'item', id: 'formulaDocs', label: 'อธิบายสูตร', desc: 'ตรวจสอบวิธีคิดเงิน', icon: Calculator, tone: 'system', action: 'formulaDocs' },
  { kind: 'item', id: 'data', label: 'สำรองข้อมูล', desc: 'นำเข้า / ส่งออกข้อมูล', icon: Database, tone: 'system', action: 'data' },
  { kind: 'item', id: 'undoHistory', label: 'ประวัติการแก้ไข', desc: 'ย้อน/ทำซ้ำการแก้ไขงานนี้', icon: History, tone: 'system', action: 'undoHistory' },
];

/** id ทั้งหมดที่รู้จัก (ใช้ reconcile กับลำดับที่ persist ไว้) */
export const MENU_ENTRY_IDS = MENU_ENTRIES.map((e) => e.id);
