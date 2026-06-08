import React from 'react';
import { Customer } from '@/types';
import { cn } from '@/lib/utils';

interface Props {
  customer: Customer;
}

/** Customer + site-location block — rendered on the first page only. */
export const CustomerSection: React.FC<Props> = ({ customer }) => {
  const showSite = customer.showInstallationAddress !== false;
  const isSameAddr = customer.useSameAddress !== false;
  const siteAddressDisplay = isSameAddr
    ? '(สถานที่ติดตั้งเดียวกับที่อยู่ลูกค้า)'
    : customer.installationAddress || '-';

  return (
    <section className="mb-3 border border-slate-300 rounded-xl flex overflow-hidden bg-white">
      <div className={cn('p-3', showSite ? 'flex-[1.2]' : 'flex-1')}>
        <div className="flex items-center gap-2 mb-2">
          <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded">
            ข้อมูลลูกค้า (Customer)
          </h3>
        </div>
        <div className="space-y-1.5 text-sm">
          <div className="grid grid-cols-[80px_1fr] gap-2">
            <span className="text-slate-500 font-medium">ชื่อลูกค้า:</span>
            <span className="font-bold text-slate-900 text-[13px]">{customer.name || '-'}</span>
          </div>
          <div className="grid grid-cols-[80px_1fr] gap-2">
            <span className="text-slate-500 font-medium">ที่อยู่:</span>
            <span className="text-slate-800 leading-snug">{customer.address || '-'}</span>
          </div>
          <div className="grid grid-cols-[80px_1fr] gap-2">
            <span className="text-slate-500 font-medium">เบอร์โทร:</span>
            <div className="flex gap-4">
              <span className="font-mono text-slate-800">{customer.phone || '-'}</span>
              {customer.taxId && (
                <span className="text-slate-600">
                  <span className="font-medium text-slate-500 mr-1">Tax ID:</span>
                  {customer.taxId}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {showSite && (
        <>
          <div className="w-px bg-slate-200 my-3"></div>
          <div className="flex-1 p-3 bg-slate-50/30">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded">
                สถานที่ติดตั้ง (Site Location)
              </h3>
            </div>
            <div
              className={cn(
                'text-sm leading-relaxed',
                isSameAddr ? 'text-slate-400 italic' : 'text-slate-700'
              )}
            >
              {siteAddressDisplay}
            </div>
          </div>
        </>
      )}
    </section>
  );
};
