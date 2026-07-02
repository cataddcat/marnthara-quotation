import { Package } from 'lucide-react';

// ─── Shared empty state (แท็บวัสดุ/ราง/อุปกรณ์ + คลัง ใช้ร่วม) ──────────────────

export const EmptyHint = ({ message, sub }: { message: string; sub: string }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
    <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center">
      <Package className="w-6 h-6 text-muted-foreground opacity-40" strokeWidth={1.5} />
    </div>
    <div>
      <p className="font-semibold text-foreground">{message}</p>
      <p className="text-sm text-muted-foreground mt-1">{sub}</p>
    </div>
  </div>
);
