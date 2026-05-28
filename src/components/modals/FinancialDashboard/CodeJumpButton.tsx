// src/components/modals/FinancialDashboard/CodeJumpButton.tsx

import { ExternalLink } from 'lucide-react';

interface CodeJumpButtonProps {
  code: string;
  tab: string;
  onJump: (code: string, tab: string) => void;
}

// Fabric code button — กดกระโดดไปคลังผ้า
export const CodeJumpButton = ({ code, tab, onJump }: CodeJumpButtonProps) => (
  <button
    onClick={(e) => {
      e.stopPropagation();
      onJump(code, tab);
    }}
    className="inline-flex items-center gap-0.5 text-[10px] font-mono text-primary hover:underline underline-offset-2 active:opacity-70"
    title={`เปิดคลังผ้าสำหรับรหัส ${code}`}
  >
    ({code})
    <ExternalLink className="w-2.5 h-2.5 opacity-70" />
  </button>
);
