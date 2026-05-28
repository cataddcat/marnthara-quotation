import { useState, useEffect, useRef, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { RoomSlider } from '@/components/features/RoomSlider';
import { EmptyState } from '@/components/features/EmptyState';
import { useAppStore } from '@/store/useAppStore';
import { useThemeStore } from '@/store/useThemeStore';
import { ToastContainer } from '@/components/ui/Toast';
import { AlertDialog } from '@/components/ui/AlertDialog';
import { Button } from '@/components/ui/Button';
import { ModalManager } from '@/components/managers/ModalManager';
import { ItemData } from '@/types';
import { ITEM_TYPES } from '@/config/enums';
import { Home, Plus } from 'lucide-react';

function App() {
  const rooms = useAppStore((state) => state.rooms);
  const openModal = useAppStore((state) => state.openModal);
  const addRoom = useAppStore((state) => state.addRoom);
  const favorites = useAppStore((state) => state.favorites);
  const fabricCosts = useAppStore((state) => state.fabricCosts);
  const batchUpdateFabricCosts = useAppStore((state) => state.batchUpdateFabricCosts);

  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(
    () => (rooms.length > 0 ? rooms[0].id : null)
  );
  const [prevRoomCount, setPrevRoomCount] = useState(rooms.length);
  const [viewMode, setViewMode] = useState<'focus' | 'overview'>('focus');

  // Auto-select newly added rooms via state-derived comparison
  if (rooms.length !== prevRoomCount) {
    setPrevRoomCount(rooms.length);
    if (rooms.length > prevRoomCount && rooms.length > 0) {
      const newestId = rooms[rooms.length - 1].id;
      if (selectedRoomId !== newestId) {
        setSelectedRoomId(newestId);
        setViewMode('focus');
      }
    }
  }

  // Derived: resolve active room — falls back to first room if selection is stale/missing
  const activeRoomId = useMemo(
    () =>
      rooms.length === 0
        ? null
        : selectedRoomId && rooms.some((r) => r.id === selectedRoomId)
          ? selectedRoomId
          : rooms[0].id,
    [rooms, selectedRoomId]
  );

  const setActiveRoomId = setSelectedRoomId;

  // Theme Initialization
  const theme = useThemeStore((state) => state.theme);
  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
  }, [theme]);

  // Migration Logic: Transfer legacy costs from favorites to fabricCosts vault
  const hasMigratedRef = useRef(false);

  useEffect(() => {
    if (hasMigratedRef.current) return;

    const legacyCosts: Record<string, number> = {};
    let hasLegacy = false;

    Object.values(favorites)
      .flat()
      .forEach((fav) => {
        if (fav.cost_per_yard && fav.cost_per_yard > 0) {
          if (!fabricCosts[fav.code]) {
            legacyCosts[fav.code] = fav.cost_per_yard;
            hasLegacy = true;
          }
        }
      });

    if (hasLegacy) {
      console.log('📦 System: Migrating legacy costs to vault...', legacyCosts);
      batchUpdateFabricCosts(legacyCosts);
    }

    hasMigratedRef.current = true;
  }, [favorites, fabricCosts, batchUpdateFabricCosts]);

  const handleOpenMainMenu = () => openModal('mainMenu');
  const handleOpenDiscount = () => openModal('discount');
  const handleOpenOverview = () =>
    openModal('projectOverview', {
      onNavigateToRoom: (roomId: string) => {
        setActiveRoomId(roomId);
        setViewMode('focus');
      },
    });

  const handleAddItem = (roomId: string) => {
    openModal('item', {
      mode: 'add',
      roomId: roomId,
      itemType: ITEM_TYPES.CURTAIN,
    });
  };

  const handleEditItem = (roomId: string, item: ItemData) => {
    openModal('item', {
      mode: 'edit',
      roomId: roomId,
      itemId: item.id,
      itemType: item.type,
      initialData: item,
    });
  };

  const handleRoomDefaults = (roomId: string) => {
    openModal('roomDefaults', { roomId });
  };

  return (
    <>
      <MainLayout
        onOpenMainMenu={handleOpenMainMenu}
        onOpenDiscount={handleOpenDiscount}
        onOpenOverview={handleOpenOverview}
        activeRoomId={activeRoomId}
        onNavigateRoom={setActiveRoomId}
        viewMode={viewMode}
        onSetViewMode={setViewMode}
      >
        {rooms.length > 0 ? (
          <RoomSlider
            rooms={rooms}
            activeRoomId={activeRoomId}
            onSetActiveRoom={setActiveRoomId}
            viewMode={viewMode}
            onSetViewMode={setViewMode}
            onAddItem={handleAddItem}
            onEditItem={handleEditItem}
            onOpenDefaults={handleRoomDefaults}
          />
        ) : (
          <EmptyState
            icon={Home}
            title="เริ่มโครงการใหม่"
            description="เพิ่มห้องแรกเพื่อเริ่มสร้างใบเสนอราคา"
            action={
              <Button onClick={() => addRoom()} className="gap-2">
                <Plus className="w-4 h-4" />
                เพิ่มห้องแรก
              </Button>
            }
          />
        )}
      </MainLayout>
      <ModalManager />
      <ToastContainer />
      <AlertDialog />
    </>
  );
}

export default App;
