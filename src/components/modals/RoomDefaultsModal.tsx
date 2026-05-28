import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAppStore } from '@/store/useAppStore';
import { Save } from 'lucide-react';

interface RoomDefaultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string | null;
}

export const RoomDefaultsModal: React.FC<RoomDefaultsModalProps> = ({
  isOpen,
  onClose,
  roomId,
}) => {
  const room = useAppStore((state) => state.rooms.find((r) => r.id === roomId));
  const updateRoomDefaults = useAppStore((state) => state.updateRoomDefaults);

  const defs = room?.room_defaults || {};

  const [width, setWidth] = useState<string>(String(defs.width_m || ''));
  const [height, setHeight] = useState<string>(String(defs.height_m || ''));
  const [fabricPrice, setFabricPrice] = useState<string>(String(defs.default_fabric_price || ''));
  const [wallpaperPrice, setWallpaperPrice] = useState<string>(
    String(defs.default_wallpaper_price || '')
  );
  const [blindPrice, setBlindPrice] = useState<string>(String(defs.default_blind_price || ''));

  const handleSave = () => {
    if (roomId) {
      updateRoomDefaults(roomId, {
        width_m: width,
        height_m: height,
        default_fabric_price: fabricPrice,
        default_wallpaper_price: wallpaperPrice,
        default_blind_price: blindPrice,
      });
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="ตั้งค่าเริ่มต้นห้อง">
      <div className="space-y-4">
        <Input label="ความกว้าง (ม.)" value={width} onChange={(e) => setWidth(e.target.value)} />
        <Input label="ความสูง (ม.)" value={height} onChange={(e) => setHeight(e.target.value)} />

        <div className="pt-2 border-t border-slate-100">
          <h4 className="text-sm font-medium text-slate-900 mb-2">ราคาเริ่มต้น (Defaults)</h4>
          <Input
            label="ผ้า (บาท/ม.)"
            value={fabricPrice}
            onChange={(e) => setFabricPrice(e.target.value)} // [FIXED] Used setter
          />
          <div className="grid grid-cols-2 gap-3 mt-2">
            <Input
              label="วอลล์ (บาท/ม้วน)"
              value={wallpaperPrice}
              onChange={(e) => setWallpaperPrice(e.target.value)} // [FIXED] Used setter
            />
            <Input
              label="มู่ลี่ (บาท/ตร.ล.)"
              value={blindPrice}
              onChange={(e) => setBlindPrice(e.target.value)} // [FIXED] Used setter
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="ghost" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button onClick={handleSave} className="gap-2">
            <Save className="w-4" /> บันทึก
          </Button>
        </div>
      </div>
    </Modal>
  );
};
