import React, { useRef, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useAppStore } from '@/store/useAppStore';
import { ITEM_CONFIG } from '@/config/constants';
import { fmtDimension } from '@/utils/formatters';
import { useReactToPrint } from 'react-to-print';
import { LookbookDocument } from '@/components/features/LookbookDocument';

interface LookbookModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LookbookModal: React.FC<LookbookModalProps> = ({ isOpen, onClose }) => {
  const rooms = useAppStore((state) => state.rooms);
  const printRef = useRef<HTMLDivElement>(null);

  // ใช้ State isPrinting เพื่อควบคุม UI
  const [isPrinting, setIsPrinting] = useState(false);

  // [FIX] Removed strict type definition UseReactToPrintOptions to avoid TS error
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `QC_Lookbook_${new Date().toISOString().split('T')[0]}`,
    onBeforeGetContent: () => {
      setIsPrinting(true);
      return Promise.resolve();
    },
    onAfterPrint: () => setIsPrinting(false),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Lookbook / รายการสินค้า (Preview)"
      maxWidth="2xl"
    >
      <div className="space-y-6 pb-safe-area">
        {rooms.map((room) => (
          <div key={room.id} className="bg-muted/20 rounded-2xl p-4 border border-border">
            <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
              🏠 {room.name}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {room.items
                .filter((i) => !i.is_suspended)
                .map((item) => (
                  <div
                    key={item.id}
                    className="bg-card p-3 rounded-xl border border-border shadow-sm flex flex-col"
                  >
                    <div className="aspect-[4/3] bg-muted/30 rounded-lg mb-2 flex items-center justify-center overflow-hidden relative">
                      {/* Placeholder for visual preview */}
                      <div className="text-xs text-muted-foreground">Preview</div>
                    </div>
                    <div className="mt-auto">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-semibold text-sm text-card-foreground">
                          {ITEM_CONFIG[item.type]?.name}
                        </span>
                        {'width_m' in item && (
                          <div className="bg-primary text-primary-foreground text-xs font-mono px-1.5 py-0.5 rounded">
                            {fmtDimension(item.width_m)} × {fmtDimension(item.height_m)}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1 mt-auto">
                        {'fabric_variant' in item && <div>• วัสดุ/ผ้า: {item.fabric_variant}</div>}
                        {'code' in item && item.code && (
                          <div>
                            • รหัส: <span className="font-mono font-bold">{item.code}</span>
                          </div>
                        )}
                        {'adjustment_side' in item && <div>• ปรับ: {item.adjustment_side}</div>}
                        {item.notes && <div className="text-warning mt-1">⚠ {item.notes}</div>}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end pt-4 border-t border-border">
        <Button onClick={onClose}>ปิดหน้าต่าง</Button>
        {/* ใช้ isPrinting เพื่อ Disable ปุ่มและแสดงสถานะ */}
        <Button
          onClick={() => handlePrint()}
          disabled={isPrinting}
          className="ml-2 bg-primary text-primary-foreground"
        >
          {isPrinting ? 'กำลังเตรียม...' : 'พิมพ์ Lookbook'}
        </Button>
      </div>

      <div style={{ display: 'none' }}>
        <div ref={printRef}>
          <LookbookDocument />
        </div>
      </div>
    </Modal>
  );
};
