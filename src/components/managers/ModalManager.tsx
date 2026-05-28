// src/components/managers/ModalManager.tsx

import React from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useUIStore } from '@/store/useUIStore';
import { ItemData } from '@/types';

// Import Modals
import { ItemModal } from '@/components/modals/ItemModal';
import { CustomerModal } from '@/components/modals/CustomerModal';
import { PdfPreviewModal } from '@/components/modals/PdfPreviewModal';
import { ShopSettingsModal } from '@/components/modals/ShopSettingsModal';
import { DiscountModal } from '@/components/modals/DiscountModal';
import { RoomDefaultsModal } from '@/components/modals/RoomDefaultsModal';
import { DataModal } from '@/components/modals/DataModal';
import { LookbookModal } from '@/components/modals/LookbookModal';
import { ProjectOverviewModal } from '@/components/modals/ProjectOverviewModal';
import { MainMenuModal } from '@/components/modals/MainMenuModal';
import { ProductionSettingsModal } from '@/components/modals/ProductionSettingsModal';
import { FinancialDashboardModal } from '@/components/modals/FinancialDashboardModal';
import { FormulaStudioModal } from '@/components/modals/FormulaStudioModal'; // ✅ Import
import { MaterialSummaryModal } from '@/components/modals/MaterialSummaryModal';

export const ModalManager: React.FC = () => {
  const { activeModal, modalProps, closeModal, openModal, addItem, updateItem } = useAppStore();
  const addToast = useUIStore((state) => state.addToast);

  const isVisible = (type: string) => activeModal === type;

  // Handler for Item Form Submit (Add/Edit)
  const handleItemSubmit = (data: ItemData) => {
    const { roomId, mode, itemId } = modalProps;

    if (!roomId) return;

    if (mode === 'edit' && itemId) {
      updateItem(roomId, itemId, data);
      addToast('success', 'บันทึกการแก้ไขเรียบร้อย');
    } else {
      addItem(roomId, data);
      addToast('success', 'เพิ่มรายการใหม่เรียบร้อย');
    }
    closeModal();
  };

  if (!activeModal) return null;

  return (
    <>
      <ItemModal
        isOpen={isVisible('item')}
        onClose={closeModal}
        roomId={modalProps.roomId}
        itemId={modalProps.itemId}
        itemType={modalProps.itemType}
        initialData={modalProps.initialData}
        mode={modalProps.mode}
        onSubmit={handleItemSubmit}
      />

      <CustomerModal isOpen={isVisible('customer')} onClose={closeModal} />

      <PdfPreviewModal isOpen={isVisible('pdf')} onClose={closeModal} />

      <ShopSettingsModal isOpen={isVisible('shopSettings')} onClose={closeModal} />

      <DiscountModal
        key={isVisible('discount') ? 'discount-open' : 'discount-closed'}
        isOpen={isVisible('discount')}
        onClose={closeModal}
      />

      <DataModal isOpen={isVisible('data')} onClose={closeModal} />

      <LookbookModal isOpen={isVisible('lookbook')} onClose={closeModal} />

      <ProjectOverviewModal
        isOpen={isVisible('projectOverview')}
        onClose={closeModal}
        onNavigateToRoom={modalProps.onNavigateToRoom}
      />

      <RoomDefaultsModal
        key={modalProps.roomId || 'defaults'}
        isOpen={isVisible('roomDefaults')}
        onClose={closeModal}
        roomId={modalProps.roomId}
      />

      <ProductionSettingsModal isOpen={isVisible('productionSettings')} onClose={closeModal} />

      {/* ✅ FIX 2: เปลี่ยน key จาก 'open'/'closed' เป็น 'cost-open'/'cost-closed' */}
      <FinancialDashboardModal
        key={isVisible('costDashboard') ? 'cost-open' : 'cost-closed'}
        isOpen={isVisible('costDashboard')} 
        onClose={closeModal} 
      />
      
      {/* ✅ Formula Studio */}
      <FormulaStudioModal 
  key={isVisible('formulaStudio') ? 'fs-open' : 'fs-closed'} // ✅ เพิ่มบรรทัดนี้: เพื่อ Force Reset State ทุกครั้งที่เปิด
  isOpen={isVisible('formulaStudio')} 
  onClose={closeModal} 
/>

      <MaterialSummaryModal
        key={isVisible('materialSummary') ? 'ms-open' : 'ms-closed'}
        isOpen={isVisible('materialSummary')}
        onClose={closeModal}
        initialTab={modalProps.initialTab}
        initialCategory={modalProps.initialCategory}
      />

      <MainMenuModal
        isOpen={isVisible('mainMenu')}
        onClose={closeModal}
        onOpenPdf={() => openModal('pdf')}
        onOpenLookbook={() => openModal('lookbook')}
        onOpenCustomer={() => openModal('customer')}
        onOpenShopSettings={() => openModal('shopSettings')}
        onOpenDiscount={() => openModal('discount')}
        onOpenData={() => openModal('data')}
        onOpenProductionSettings={() => openModal('productionSettings')}
        onOpenCostDashboard={() => openModal('costDashboard')}
        onOpenFormulaStudio={() => openModal('formulaStudio')}
        onOpenMaterialSummary={() => openModal('materialSummary')}
      />
    </>
  );
};