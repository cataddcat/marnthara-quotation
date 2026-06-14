import { StateCreator } from 'zustand';
import { AppState } from '../useAppStore';
import { Room, ItemData } from '@/types';
import { ITEM_TYPES, FAVORITE_CATEGORIES, DEFAULT_JOB_STATUS } from '@/config/enums';
import { DEFAULT_SHOP_CONFIG } from '@/config/constants';
import { isAreaItem } from '@/lib/type-guards';
import { newUuid } from '@/lib/id';

// [REFACTOR] Renamed from RoomSlice to ProjectSlice to reflect broader scope
export interface ProjectSlice {
  rooms: Room[]; // Keep 'rooms' for backward compatibility

  // Actions
  addRoom: (name?: string) => void;
  updateRoom: (roomId: string, data: Partial<Room>) => void;
  removeRoom: (roomId: string) => void;
  duplicateRoom: (roomId: string) => void;
  toggleRoomSuspension: (roomId: string) => void;

  // คืน id ที่ store gen ให้ — ผู้เรียกต้องใช้ id นี้อ้างถึงรายการตอน update รอบถัดไป
  addItem: (roomId: string, data: Omit<ItemData, 'id'>) => string;
  updateItem: (roomId: string, itemId: string, data: Partial<ItemData>) => void;
  removeItem: (roomId: string, itemId: string) => void;
  duplicateItem: (roomId: string, itemId: string) => void;

  // จัดเรียงลำดับ (drag-reorder ใน Room Dashboard) — index-based, bounds-safe
  reorderRooms: (fromIndex: number, toIndex: number) => void;
  reorderItems: (roomId: string, fromIndex: number, toIndex: number) => void;
  // ย้าย item ข้ามห้อง (drag ห้อง A → B)
  moveItemToRoom: (fromRoomId: string, itemId: string, toRoomId: string, toIndex: number) => void;

  updatePriceByCode: (category: string, code: string, newPrice: number) => number;

  // Lifecycle Actions
  resetProject: () => void; // Level 1
  factoryReset: () => void; // Level 3
}

const generateId = () => newUuid();

/** ย้ายสมาชิก array จาก index หนึ่งไปอีก index — คืน ref เดิมถ้า no-op (index เท่ากัน/นอกช่วง) */
function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= arr.length || to >= arr.length) return arr;
  const next = arr.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export const createProjectSlice: StateCreator<
  AppState,
  [['zustand/persist', unknown], ['temporal', unknown]],
  [],
  ProjectSlice
> = (set, get) => ({
  rooms: [],

  addRoom: (name) =>
    set((state) => ({
      rooms: [
        ...state.rooms,
        {
          id: generateId(),
          name: name || `ห้อง ${state.rooms.length + 1}`,
          items: [],
          is_suspended: false,
        },
      ],
    })),

  updateRoom: (roomId, data) =>
    set((state) => ({
      rooms: state.rooms.map((r) => (r.id === roomId ? { ...r, ...data } : r)),
    })),

  removeRoom: (roomId) =>
    set((state) => ({
      rooms: state.rooms.filter((r) => r.id !== roomId),
    })),

  duplicateRoom: (roomId) =>
    set((state) => {
      const target = state.rooms.find((r) => r.id === roomId);
      if (!target) return state;
      const copy: Room = {
        ...target,
        id: generateId(),
        name: `${target.name} (Copy)`,
        items: target.items.map((item) => ({ ...item, id: generateId() })),
      };
      return { rooms: [...state.rooms, copy] };
    }),

  toggleRoomSuspension: (roomId) =>
    set((state) => ({
      rooms: state.rooms.map((r) =>
        r.id === roomId ? { ...r, is_suspended: !r.is_suspended } : r
      ),
    })),

  // store เป็นเจ้าของการ gen id เสมอ (กัน id ซ้ำ/ค้างจาก caller) และ "คืน id จริง" กลับไป
  // เพื่อให้ผู้เรียก (ItemModal) อ้างถึง draft เดิมตอน auto-save/บันทึกครั้งถัดไปได้ตรงรายการ
  // — เดิมผู้เรียก gen id เองแล้วส่งมา แต่ store เมินทิ้ง → updateItem รอบถัดไปหา id ไม่เจอ →
  //   ค่าที่แก้ (เช่น "ความสูง") หายเงียบ ๆ ตอนเพิ่มสินค้าครั้งแรก
  addItem: (roomId, itemData) => {
    const id = generateId();
    set((state) => ({
      rooms: state.rooms.map((room) => {
        if (room.id !== roomId) return room;
        return {
          ...room,
          items: [...room.items, { ...itemData, id } as ItemData],
        };
      }),
    }));
    return id;
  },

  updateItem: (roomId, itemId, data) =>
    set((state) => ({
      rooms: state.rooms.map((room) => {
        if (room.id !== roomId) return room;
        return {
          ...room,
          items: room.items.map((item) =>
            item.id === itemId ? ({ ...item, ...data } as ItemData) : item
          ),
        };
      }),
    })),

  removeItem: (roomId, itemId) =>
    set((state) => ({
      rooms: state.rooms.map((room) => {
        if (room.id !== roomId) return room;
        return {
          ...room,
          items: room.items.filter((item) => item.id !== itemId),
        };
      }),
    })),

  duplicateItem: (roomId, itemId) =>
    set((state) => ({
      rooms: state.rooms.map((room) => {
        if (room.id !== roomId) return room;
        const targetIndex = room.items.findIndex((i) => i.id === itemId);
        if (targetIndex === -1) return room;

        const target = room.items[targetIndex];
        const copy = { ...target, id: generateId() };

        const newItems = [...room.items];
        newItems.splice(targetIndex + 1, 0, copy);

        return { ...room, items: newItems };
      }),
    })),

  reorderRooms: (fromIndex, toIndex) =>
    set((state) => {
      const rooms = arrayMove(state.rooms, fromIndex, toIndex);
      return rooms === state.rooms ? state : { rooms };
    }),

  reorderItems: (roomId, fromIndex, toIndex) =>
    set((state) => {
      let changed = false;
      const rooms = state.rooms.map((room) => {
        if (room.id !== roomId) return room;
        const items = arrayMove(room.items, fromIndex, toIndex);
        if (items === room.items) return room;
        changed = true;
        return { ...room, items };
      });
      return changed ? { rooms } : state;
    }),

  moveItemToRoom: (fromRoomId, itemId, toRoomId, toIndex) =>
    set((state) => {
      if (fromRoomId === toRoomId) return state; // ห้องเดียวกัน → ใช้ reorderItems
      const fromRoom = state.rooms.find((r) => r.id === fromRoomId);
      const item = fromRoom?.items.find((i) => i.id === itemId);
      if (!fromRoom || !item) return state;
      return {
        rooms: state.rooms.map((room) => {
          if (room.id === fromRoomId) {
            return { ...room, items: room.items.filter((i) => i.id !== itemId) };
          }
          if (room.id === toRoomId) {
            const items = room.items.slice();
            items.splice(Math.max(0, Math.min(toIndex, items.length)), 0, item);
            return { ...room, items };
          }
          return room;
        }),
      };
    }),

  updatePriceByCode: (category, code, newPrice) => {
    let updateCount = 0;
    const priceStr = String(newPrice); // Normalize to string for inputs

    set((state) => ({
      rooms: state.rooms.map((room) => ({
        ...room,
        items: room.items.map((item) => {
          // Logic: Match Item Type & Code -> Update Price Field
          if (
            category === FAVORITE_CATEGORIES.CURTAIN_MAIN &&
            item.type === ITEM_TYPES.CURTAIN &&
            item.code === code
          ) {
            updateCount++;
            return { ...item, price_per_m_raw: priceStr };
          } else if (
            category === FAVORITE_CATEGORIES.CURTAIN_SHEER &&
            item.type === ITEM_TYPES.CURTAIN &&
            item.sheer_code === code
          ) {
            updateCount++;
            return { ...item, sheer_price_per_m: priceStr };
          } else if (
            category === FAVORITE_CATEGORIES.WALLPAPER &&
            item.type === ITEM_TYPES.WALLPAPER &&
            item.wallpaper_code === code
          ) {
            updateCount++;
            return { ...item, price_per_roll: priceStr }; // string เหมือนทุกฟิลด์ราคาในฟอร์ม
          } else if (category === item.type && isAreaItem(item) && item.code === code) {
            updateCount++;
            return { ...item, price_sqyd: priceStr };
          }
          return item;
        }),
      })),
    }));
    return updateCount;
  },

  resetProject: () =>
    set(() => ({
      rooms: [],
      customer: {
        name: '',
        phone: '',
        address: '',
        taxId: '',
        installationAddress: '',
        useSameAddress: true,
        showInstallationAddress: true,
      },
      discount: { type: 'amount', value: 0, is_enabled: false },
      // เงินของงาน (มัดจำ/รายจ่ายจริง) ผูกกับงาน ไม่ใช่ร้าน — งานใหม่เริ่มศูนย์
      receipts: [],
      expenses: [],
      // สถานะงานกลับเป็นเริ่มต้น (live field ของ JobsSlice)
      jobStatus: DEFAULT_JOB_STATUS,
    })),

  factoryReset: () => {
    // ── ล้างข้อมูลทั้งหมด (เหมือนติดตั้งแอพใหม่) ──
    // 1) reset state ในหน่วยความจำให้ clean "ก่อน" — กัน persist เขียนข้อมูลเก่ากลับ
    //    (onClose ของ modal จะ trigger closeModal → re-persist state ปัจจุบันหลัง factoryReset)
    get().resetProject(); // rooms / customer / discount
    get().resetProductionCosts(); // ค่าแรง/บริการ/อุปกรณ์/ผ้า/วอลฯ/พื้นที่ → default
    set(() => ({ favorites: {}, shopConfig: DEFAULT_SHOP_CONFIG }));

    // 2) ล้าง persisted storage ทุกตัว (main + theme + experience) ไม่ใช่แค่ key เดียว
    localStorage.clear();

    // 3) hard reload → re-init จาก default ทั้งหมด
    window.location.reload();
  },
});
