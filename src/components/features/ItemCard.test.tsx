// src/components/features/ItemCard.test.tsx
// ItemCard — collapsed/expanded, edit/duplicate/suspend actions (store-driven)

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ItemCard } from './ItemCard';
import { useAppStore } from '@/store/useAppStore';
import { asItemData, makeCurtain } from '@/test/factories';

const store = () => useAppStore.getState();
const ITEM = asItemData(makeCurtain({ id: 'i1' }));
// makeCurtain ใช้ style 'จีบ' → title การ์ดแสดงประเภท+รูปแบบ = "ผ้าม่าน ม่านจีบ"
const TITLE = 'ผ้าม่าน ม่านจีบ';

const seedRoom = () => {
  useAppStore.setState({
    rooms: [{ id: 'r1', name: 'A', is_suspended: false, items: [ITEM] }],
    fabricCosts: {},
    accessoryCosts: {},
    laborCosts: {},
  });
};

beforeEach(seedRoom);

const renderCard = (onEdit = vi.fn()) =>
  render(<ItemCard item={ITEM} index={0} roomId="r1" onEdit={onEdit} />);

describe('ItemCard — collapsed/expanded', () => {
  it('แสดงชื่อประเภท+รูปแบบ (ผ้าม่าน ม่านจีบ) + ยังไม่โชว์ปุ่ม action ตอน collapse', () => {
    renderCard();
    expect(screen.getByText(TITLE)).toBeInTheDocument();
    expect(screen.queryByText('แก้ไข')).not.toBeInTheDocument();
  });

  it('คลิก header → expand → โชว์ปุ่ม action', () => {
    renderCard();
    fireEvent.click(screen.getByText(TITLE));
    expect(screen.getByText('แก้ไข')).toBeInTheDocument();
  });
});

describe('ItemCard — actions', () => {
  it('ปุ่มแก้ไข → เรียก onEdit', () => {
    const onEdit = vi.fn();
    renderCard(onEdit);
    fireEvent.click(screen.getByText(TITLE));
    fireEvent.click(screen.getByText('แก้ไข'));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('ปุ่มคัดลอก → duplicateItem (items เพิ่มเป็น 2)', () => {
    renderCard();
    fireEvent.click(screen.getByText(TITLE));
    fireEvent.click(screen.getByTitle('คัดลอก'));
    expect(store().rooms[0].items).toHaveLength(2);
  });

  it('ปุ่มพัก → updateItem ตั้ง is_suspended = true', () => {
    renderCard();
    fireEvent.click(screen.getByText(TITLE));
    fireEvent.click(screen.getByTitle('พักรายการ (ไม่นับยอด)'));
    expect(store().rooms[0].items[0].is_suspended).toBe(true);
  });
});
