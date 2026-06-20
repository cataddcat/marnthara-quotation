import { useState, useEffect, useRef, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { RoomSlider } from '@/components/features/RoomSlider';
import { type DashboardDensity } from '@/components/features/RoomDashboard';
import { EmptyState } from '@/components/features/EmptyState';
import { useAppStore } from '@/store/useAppStore';
import { useThemeStore, THEME_CLASSES, THEME_DOM_CLASSES } from '@/store/useThemeStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useUIStore } from '@/store/useUIStore';
import { startSync, stopSync } from '@/lib/sync/syncEngine';
import { shouldRemindBackup, daysSinceBackup } from '@/lib/backup-reminder';
import { useExperienceMode } from '@/hooks/useExperienceMode';
import { useUndoRedoShortcuts } from '@/hooks/useUndoRedo';
import { ToastContainer } from '@/components/ui/Toast';
import { AlertDialog } from '@/components/ui/AlertDialog';
import { Button } from '@/components/ui/Button';
import { ModalManager } from '@/components/managers/ModalManager';
import { ConflictBanner } from '@/components/features/ConflictBanner';
import { DevInspector } from '@/components/dev/DevInspector';
import { ItemData } from '@/types';
import { ITEM_TYPES } from '@/config/enums';
import { Home, Plus } from 'lucide-react';

function App() {
  const rooms = useAppStore((state) => state.rooms);
  const currentJobId = useAppStore((state) => state.currentJobId);
  const openModal = useAppStore((state) => state.openModal);
  const addRoom = useAppStore((state) => state.addRoom);
  const favorites = useAppStore((state) => state.favorites);
  const fabricCosts = useAppStore((state) => state.fabricCosts);
  const batchUpdateFabricCosts = useAppStore((state) => state.batchUpdateFabricCosts);
  const { isField } = useExperienceMode();

  // คีย์ลัด Undo/Redo ทั้งแอป (Ctrl/Cmd+Z · Ctrl+Shift+Z / Ctrl+Y) — ไม่จับตอนพิมพ์ในช่องกรอก
  useUndoRedoShortcuts();

  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(
    () => (rooms.length > 0 ? rooms[0].id : null)
  );
  const [prevRoomCount, setPrevRoomCount] = useState(rooms.length);
  const [prevJobId, setPrevJobId] = useState(currentJobId);
  const [viewMode, setViewMode] = useState<'focus' | 'overview'>('focus');
  // ความหนาแน่นแดชบอร์ดภาพรวม — compact (การ์ดสรุปขนาดคงที่) ⇄ detailed (item เต็ม + ลากข้ามห้อง)
  const [dashboardDensity, setDashboardDensity] = useState<DashboardDensity>('compact');

  // ปรับ selection ตอน render แบบ state-derived (เลี่ยง setState ใน effect)
  if (currentJobId !== prevJobId) {
    // สลับงาน → ห้องคนละชุด: โฟกัสห้องแรกของงานใหม่ + sync prevRoomCount กันบล็อกล่างยิงซ้ำ
    setPrevJobId(currentJobId);
    setPrevRoomCount(rooms.length);
    setSelectedRoomId(rooms.length > 0 ? rooms[0].id : null);
    setViewMode('focus');
  } else if (rooms.length !== prevRoomCount) {
    // Auto-select newly added rooms
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

  // Auth init — subscribe onAuthStateChanged ครั้งเดียว (no-op ถ้ายังไม่ตั้งค่า Firebase)
  useEffect(() => {
    useAuthStore.getState().init();
  }, []);

  // Cloud sync — เริ่มเมื่อ sign-in, หยุดเมื่อ sign-out / เปลี่ยนบัญชี
  const authStatus = useAuthStore((state) => state.status);
  const authUid = useAuthStore((state) => state.uid);
  useEffect(() => {
    if (authStatus === 'signed-in' && authUid) {
      startSync(authUid);
      return () => stopSync();
    }
  }, [authStatus, authUid]);

  // เตือนสำรองข้อมูล (เฉพาะ local-only — signed-in มี Firestore เป็น backup แล้ว) ครั้งเดียว/เซสชัน
  const addToast = useUIStore((state) => state.addToast);
  const remindedRef = useRef(false);
  useEffect(() => {
    if (remindedRef.current || authStatus === 'loading' || authStatus === 'signed-in') return;
    remindedRef.current = true;
    const st = useAppStore.getState();
    const hasContent = st.rooms.length > 0 || st.jobs.length > 0;
    if (hasContent && shouldRemindBackup(7)) {
      const d = daysSinceBackup();
      addToast(
        'warning',
        'แนะนำสำรองข้อมูล',
        d === null
          ? 'ยังไม่เคยสำรอง — เมนู › สำรองข้อมูล › Backup (หรือเข้าสู่ระบบเพื่อซิงค์ cloud)'
          : `สำรองล่าสุด ${Math.floor(d)} วันก่อน — เมนู › สำรองข้อมูล › Backup`
      );
    }
  }, [authStatus, addToast]);

  // Theme Initialization
  const theme = useThemeStore((state) => state.theme);
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove(...THEME_CLASSES);
    root.classList.add(...THEME_DOM_CLASSES[theme]);
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
  const handleOpenJobs = () => openModal('jobs');
  const handleOpenDiscount = () => openModal('discount');
  const handleOpenOverview = () => {
    // ละเอียด (detail): สลับเข้า/ออกแดชบอร์ดทุกห้อง (overview viewMode — รวมมือถือโหมดละเอียด)
    // หน้างาน (field): เปิดสรุปแบบ drawer (ใช้คุยราคากับลูกค้าหน้างาน)
    if (!isField) {
      setViewMode((m) => (m === 'overview' ? 'focus' : 'overview'));
      return;
    }
    openModal('projectOverview', {
      onNavigateToRoom: (roomId: string) => {
        setActiveRoomId(roomId);
        setViewMode('focus');
      },
    });
  };

  // หน้าหลัก — กลับไปจุดเริ่มต้น: โหมดโฟกัสห้องแรก + เลื่อนขึ้นบนสุด
  const handleGoHome = () => {
    setViewMode('focus');
    if (rooms.length > 0) setActiveRoomId(rooms[0].id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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

  return (
    <>
      <MainLayout
        onOpenMainMenu={handleOpenMainMenu}
        onOpenJobs={handleOpenJobs}
        onOpenDiscount={handleOpenDiscount}
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
            dashboardDensity={dashboardDensity}
            onSetDashboardDensity={setDashboardDensity}
            onAddItem={handleAddItem}
            onEditItem={handleEditItem}
            onGoHome={handleGoHome}
            onOpenMainMenu={handleOpenMainMenu}
            onOpenOverview={handleOpenOverview}
          />
        ) : (
          <EmptyState
            icon={Home}
            title="เริ่มโครงการใหม่"
            description="เพิ่มห้องแรก แล้วลงรายการผ้าม่าน/ของตกแต่ง · วัดขนาด คำนวณราคา ทุน เงินของงาน"
            action={
              <Button onClick={() => addRoom()} className="gap-2">
                <Plus className="w-4 h-4" />
                เพิ่มห้องแรก
              </Button>
            }
          />
        )}
      </MainLayout>
      <ModalManager onOpenOverview={handleOpenOverview} />
      <ConflictBanner />
      <ToastContainer />
      <AlertDialog />
      {/* Dev-only: คลิกองค์ประกอบเพื่อคัดลอก ไฟล์:บรรทัด ไปบอก AI (ตัดออกจาก prod) */}
      {import.meta.env.DEV && <DevInspector />}
    </>
  );
}

export default App;
