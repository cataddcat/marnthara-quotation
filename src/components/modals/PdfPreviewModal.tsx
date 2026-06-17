import React, { useEffect, useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Dialog, DialogPanel, Transition, TransitionChild } from '@headlessui/react';
import { Button } from '@/components/ui/Button';
import { PrintDocument, DocumentType } from '@/components/print/PrintDocument';
import { useExperienceMode } from '@/hooks/useExperienceMode';
import { useAppStore } from '@/store/useAppStore';
import { buildDocFileBase, formatDocCode } from '@/lib/docName';
import { Printer, FileText, Truck, Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({ isOpen, onClose }) => {
  const componentRef = useRef<HTMLDivElement>(null);
  const { isDetail } = useExperienceMode();
  const customer = useAppStore((s) => s.customer);
  const ensureCustomerIdentity = useAppStore((s) => s.ensureCustomerIdentity);

  // [UPDATED] Default to Quotation
  const [docType, setDocType] = useState<DocumentType>('quotation');
  const [isPrinting, setIsPrinting] = useState(false);
  // PrintDocument re-measures on every docType change and reports the page count
  // back via onPageCount, so this stays in sync without a manual reset.
  const [pageCount, setPageCount] = useState(0);

  // backfill id แบบ lazy ตอนเปิด preview → ชื่อไฟล์ PDF มี customer.id พร้อมใช้
  useEffect(() => {
    if (isOpen) ensureCustomerIdentity();
  }, [isOpen, ensureCustomerIdentity]);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    // มาตรฐานชื่อเอกสาร: <ประเภท>_<ลูกค้า>_<รหัส>_<YYYYMMDD>
    documentTitle: buildDocFileBase(
      docType,
      customer.name,
      formatDocCode({ id: customer.id, code: customer.code, seq: customer.docSeq ?? 1 })
    ),
    onBeforeGetContent: () => {
      return new Promise<void>((resolve) => {
        setIsPrinting(true);
        // Wait for scale animation to reset or layout to settle
        setTimeout(resolve, 300);
      });
    },
    onAfterPrint: () => {
      setIsPrinting(false);
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  // [UPDATED] Standard Business Document Flow
  const tabs = [
    { id: 'quotation', label: '1. ใบเสนอราคา', icon: FileText },
    { id: 'delivery', label: '2. ใบส่งมอบงาน', icon: Truck },
    { id: 'receipt', label: '3. ใบเสร็จรับเงิน', icon: Receipt },
  ];

  return (
    <Transition show={isOpen} as={React.Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        <TransitionChild
          as={React.Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
        </TransitionChild>

        <div className="fixed inset-0 flex items-center justify-center p-0 sm:p-6">
          <TransitionChild
            as={React.Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95 translate-y-4"
            enterTo="opacity-100 scale-100 translate-y-0"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100 translate-y-0"
            leaveTo="opacity-0 scale-95 translate-y-4"
          >
            <DialogPanel className="w-full max-w-6xl h-[100dvh] sm:h-[90vh] bg-slate-100 rounded-none sm:rounded-xl shadow-2xl flex flex-col overflow-hidden">
              {/* Toolbar */}
              <div className="bg-white border-b border-slate-200 p-4 pt-[calc(1rem+var(--safe-top))] sm:pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0 z-10">
                <div className="flex p-1 bg-slate-100 rounded-xl w-full sm:w-auto overflow-x-auto">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = docType === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setDocType(tab.id as DocumentType)}
                        className={cn(
                          'flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all whitespace-nowrap',
                          isActive
                            ? 'bg-white text-slate-900 shadow-sm font-semibold'
                            : 'text-slate-500 hover:text-slate-700'
                        )}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-sm">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex gap-3 w-full sm:w-auto items-center">
                  {/* โหมดละเอียด: show the computed page count before handing off to the browser. */}
                  {isDetail && pageCount > 0 && (
                    <span className="hidden sm:inline-flex items-center gap-1.5 text-sm text-slate-500 font-mono whitespace-nowrap">
                      <FileText className="w-4 h-4" strokeWidth={1.5} />
                      {pageCount} หน้า
                    </span>
                  )}
                  <Button variant="outline" onClick={onClose} className="flex-1 sm:flex-none">
                    ปิด
                  </Button>
                  <Button
                    onClick={() => handlePrint()}
                    className="flex-1 sm:flex-none bg-slate-900 text-white hover:bg-slate-800"
                  >
                    <Printer className="w-4 h-4 mr-2" strokeWidth={1.5} /> พิมพ์เอกสาร
                  </Button>
                </div>
              </div>

              {/* Preview Area — paginated stack of A4 sheets (each sheet carries its
                  own shadow); scaled down for on-screen visibility. */}
              <div className="flex-1 overflow-y-auto bg-slate-500/10 p-4 sm:p-8 pb-[calc(1rem+var(--safe-bottom))] sm:pb-8 flex justify-center items-start">
                <div
                  className={cn(
                    'origin-top transition-all duration-300',
                    isPrinting ? 'scale-100' : 'scale-[0.6] sm:scale-[0.75] lg:scale-[0.85]'
                  )}
                >
                  <PrintDocument
                    ref={componentRef}
                    docType={docType}
                    onPageCount={setPageCount}
                  />
                </div>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
};
