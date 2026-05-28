import React from 'react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { Save, X } from 'lucide-react';

interface FormLayoutProps {
  children: React.ReactNode;
  icon?: React.ReactNode;
  title?: string;
  onCancel: () => void;
  onSave?: () => void;
  isSubmitting?: boolean;
  saveLabel?: string;
  className?: string;
  footerContent?: React.ReactNode; // Content เสริมใน Footer เช่น ยอดรวม
  saveDisabled?: boolean; // ✅ เพิ่ม prop นี้
}

export const FormLayout = ({
  children,
  icon,
  title,
  onCancel,
  onSave,
  isSubmitting = false,
  saveLabel = 'บันทึก',
  className,
  footerContent,
  saveDisabled = false,
}: FormLayoutProps) => {
  return (
    <div className={cn("flex flex-col h-full", className)}>
      
      {/* 1. Header (Optional - ปกติ Modal มี Header อยู่แล้ว แต่อันนี้สำหรับใช้ใน Page ปกติได้ด้วย) */}
      {(icon || title) && (
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border/40 shrink-0 animate-in slide-in-from-left-2">
          {icon && (
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary shadow-sm">
              {icon}
            </div>
          )}
          {title && (
             <h2 className="text-xl font-bold text-foreground tracking-tight">{title}</h2>
          )}
        </div>
      )}

      {/* 2. Content Body - จัดระเบียบ Grid ให้อัตโนมัติ */}
      <div className="flex-1 space-y-6 pb-4">
        {/* ใช้ max-w เพื่อให้อ่านง่ายบนจอใหญ่ */}
        <div className="max-w-3xl mx-auto w-full space-y-6">
           {children}
        </div>
      </div>

      {/* 3. Sticky Action Footer */}
      {/* ใช้ sticky bottom-0 เพื่อให้เกาะล่างสุดของ Container ที่ Scroll ได้ */}
      <div className="sticky bottom-0 -mx-6 -mb-6 px-6 py-4 bg-background/80 backdrop-blur-md border-t border-border z-10 mt-auto transition-all">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row gap-4 items-center justify-between">
          
          {/* Footer Info (เช่น ราคารวม) */}
          <div className="w-full sm:w-auto text-center sm:text-left">
             {footerContent}
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-3 w-full sm:w-auto">
            <Button 
              variant="ghost" 
              type="button" 
              onClick={onCancel} 
              className="flex-1 sm:flex-none text-muted-foreground hover:bg-muted"
            >
              <X className="w-4 h-4 mr-2" /> ยกเลิก
            </Button>
            
            <Button
              type={onSave ? 'button' : 'submit'}
              onClick={onSave}
              disabled={isSubmitting || saveDisabled}
              className={cn(
                "flex-1 sm:flex-none min-w-[140px] shadow-lg shadow-primary/20",
                "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  กำลังบันทึก...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Save className="w-4 h-4" /> {saveLabel}
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};