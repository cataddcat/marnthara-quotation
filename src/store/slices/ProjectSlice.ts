import { StateCreator } from 'zustand';
import { AppState } from '../useAppStore';
import { Room, ItemData } from '@/types';
import { ITEM_TYPES, FAVORITE_CATEGORIES } from '@/config/enums';
import { isAreaItem } from '@/lib/type-guards';

// [REFACTOR] Renamed from RoomSlice to ProjectSlice to reflect broader scope
export interface ProjectSlice {
  rooms: Room[]; // Keep 'rooms' for backward compatibility

  // Actions
  addRoom: (name?: string) => void;
  updateRoom: (roomId: string, data: Partial<Room>) => void;
  removeRoom: (roomId: string) => void;
  duplicateRoom: (roomId: string) => void;
  toggleRoomSuspension: (roomId: string) => void;
  updateRoomDefaults: (roomId: string, defaults: Partial<Room['room_defaults']>) => void;

  addItem: (roomId: string, data: Omit<ItemData, 'id'>) => void;
  updateItem: (roomId: string, itemId: string, data: Partial<ItemData>) => void;
  removeItem: (roomId: string, itemId: string) => void;
  duplicateItem: (roomId: string, itemId: string) => void;

  updatePriceByCode: (category: string, code: string, newPrice: number) => number;

  // Lifecycle Actions
  resetProject: () => void; // Level 1
  factoryReset: () => void; // Level 3
}

const generateId = () => Math.random().toString(36).substring(2, 9);

export const createProjectSlice: StateCreator<
  AppState,
  [['zustand/persist', unknown], ['temporal', unknown]],
  [],
  ProjectSlice
> = (set) => ({
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
          room_defaults: {},
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

  updateRoomDefaults: (roomId, defaults) =>
    set((state) => ({
      rooms: state.rooms.map((r) =>
        r.id === roomId ? { ...r, room_defaults: { ...r.room_defaults, ...defaults } } : r
      ),
    })),

  addItem: (roomId, itemData) =>
    set((state) => ({
      rooms: state.rooms.map((room) => {
        if (room.id !== roomId) return room;
        return {
          ...room,
          items: [...room.items, { ...itemData, id: generateId() } as ItemData],
        };
      }),
    })),

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
            return { ...item, price_per_roll: newPrice };
          } else if (category === item.type && isAreaItem(item) && item.code === code) {
            updateCount++;
            return { ...item, price_sqyd: newPrice };
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
    })),

  factoryReset: () => {
    localStorage.removeItem('marnthara.input.v6.4');
    window.location.reload();
  },
});
