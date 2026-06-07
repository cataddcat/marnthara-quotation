import React, { useState } from 'react';
import { useInventory } from '@/hooks/useInventory';
import { useAppStore } from '@/store/useAppStore';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { fmtTH } from '@/utils/formatters';

interface FavoritePickerProps {
  category: string;
  currentValue?: { code: string; price: number };
  onSelect: (data: { code: string; price: number }) => void;
}

export const FavoritePicker: React.FC<FavoritePickerProps> = ({
  category,
  currentValue,
  onSelect,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // ✅ FIX: ต้อง Destructure { items } ออกมา เพราะ Hook ส่งกลับเป็น Object แล้ว
  const { items: myFavorites } = useInventory(category);

  const addFavorite = useAppStore((state) => state.addFavorite);

  const handleSaveCurrent = () => {
    if (!currentValue || !currentValue.code) return;
    addFavorite(category, {
      code: currentValue.code,
      default_price_per_m: currentValue.price,
      note: 'บันทึกด่วน',
    });
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
      >
        เลือกจากรายการ ({myFavorites.length})
      </Button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-1 w-64 max-h-60 overflow-y-auto bg-popover border border-border rounded-xl shadow-md z-50 p-1">
            {myFavorites.length === 0 ? (
              <div className="p-3 text-center text-xs text-muted-foreground">ไม่มีรายการบันทึก</div>
            ) : (
              myFavorites.map((fav) => (
                <button
                  key={fav.id}
                  type="button"
                  onClick={() => {
                    onSelect({ code: fav.code, price: fav.default_price_per_m });
                    setIsOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-accent rounded-lg text-sm flex justify-between items-center group"
                >
                  <div className="flex flex-col overflow-hidden">
                    <span className="font-medium text-foreground truncate">{fav.code}</span>
                    {fav.note && (
                      <span className="text-xs text-muted-foreground truncate">{fav.note}</span>
                    )}
                  </div>
                  {/* แสดงราคาขาย */}
                  {fav.default_price_per_m > 0 && (
                    <span className="text-xs font-mono text-muted-foreground group-hover:text-foreground shrink-0 ml-2">
                      {fmtTH(fav.default_price_per_m)}
                    </span>
                  )}
                </button>
              ))
            )}

            {currentValue && currentValue.code && (
              <div className="pt-2 mt-1 border-t border-border">
                <button
                  onClick={handleSaveCurrent}
                  className="w-full flex items-center justify-center gap-2 text-xs text-foreground hover:bg-muted py-2 rounded-lg transition-colors"
                >
                  <Plus className="w-3 h-3" strokeWidth={1.5} /> บันทึก "{currentValue.code}"
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
