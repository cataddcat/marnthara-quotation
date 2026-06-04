// src/components/managers/ModalManager.tsx

import React from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useUIStore } from '@/store/useUIStore';
import { ItemData } from '@/types';
import { modalPropsAs } from '@/store/slices/UISlice';

// Import Modals
import { ItemModal } from '@/components/modals/ItemModal';
import { CustomerModal } from '@/components/modals/CustomerModal';
import { PdfPreviewModal } from '@/components/modals/PdfPreviewModal';
import { ShopSettingsModal } from '@/components/modals/ShopSettingsModal';
import { DiscountModal } from '@/components/modals/DiscountModal';
import { DataModal } from '@/components/modals/DataModal';
import { LookbookModal } from '@/components/modals/LookbookModal';
import { ProjectOverviewModal } from '@/components/modals/ProjectOverviewModal';
import { MainMenuModal } from '@/components/modals/MainMenuModal';
import { ProductionSettingsModal } from '@/components/modals/ProductionSettingsModal';
import { FinancialDashboardModal } from '@/components/modals/FinancialDashboard';
import { FormulaDocsModal } from '@/components/modals/FormulaDocsModal';
import { MaterialSummaryModal } from '@/components/modals/MaterialSummaryModal';
import { CopySummaryModal } from '@/components/modals/CopySummaryModal';

export const ModalManager: React.FC = () => {
  const { activeModal, modalProps, closeModal, openModal, addItem, updateItem } = useAppStore();
  const addToast = useUIStore((state) => state.addToast);

  const isVisible = (type: string) => activeModal === type;

  // narrow modalProps ตาม activeModal — helper จาก UISlice
  const itemProps = modalPropsAs(activeModal, modalProps, 'item');
  const materialSummaryProps = modalPropsAs(activeModal, modalProps, 'materialSummary');
  const projectOverviewProps = modalPropsAs(activeModal, modalProps, 'projectOverview');

  // Handler for Item Form Submit (Add/Edit)
  const handleItemSubmit = (data: ItemData) => {
    if (!itemProps?.roomId) return;
    const { roomId, mode, itemId } = itemProps;

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
        roomId={itemProps?.roomId}
        itemId={itemProps?.itemId}
        itemType={itemProps?.itemType}
        initialData={itemProps?.initialData}
        mode={itemProps?.mode}
        onSubmit={handleItemSubmit}
      />

      <CustomerModal isOpen={isVisible('customer')} onClose={closeModal} />

      <PdfPreviewModal isOpen={isVisible('pdf')} onClose={closeModal} />

      <ShopSettingsModal
        key={isVisible('shopSettings') ? 'shop-open' : 'shop-closed'}
        isOpen={isVisible('shopSettings')}
        onClose={closeModal}
      />

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
        onNavigateToRoom={projectOverviewProps?.onNavigateToRoom}
      />

      <ProductionSettingsModal isOpen={isVisible('productionSettings')} onClose={closeModal} />

      <FinancialDashboardModal
        key={isVisible('costDashboard') ? 'cost-open' : 'cost-closed'}
        isOpen={isVisible('costDashboard')}
        onClose={closeModal}
      />

      <FormulaDocsModal
        key={isVisible('formulaDocs') ? 'fd-open' : 'fd-closed'}
        isOpen={isVisible('formulaDocs')}
        onClose={closeModal}
      />

      <MaterialSummaryModal
        key={isVisible('materialSummary') ? 'ms-open' : 'ms-closed'}
        isOpen={isVisible('materialSummary')}
        onClose={closeModal}
        initialTab={materialSummaryProps?.initialTab}
        initialCategory={materialSummaryProps?.initialCategory}
      />

      <CopySummaryModal
        key={isVisible('copySummary') ? 'cs-open' : 'cs-closed'}
        isOpen={isVisible('copySummary')}
        onClose={closeModal}
      />

      <MainMenuModal
        isOpen={isVisible('mainMenu')}
        onClose={closeModal}
        onOpenPdf={() => openModal('pdf')}
        onOpenCopySummary={() => openModal('copySummary')}
        onOpenLookbook={() => openModal('lookbook')}
        onOpenCustomer={() => openModal('customer')}
        onOpenShopSettings={() => openModal('shopSettings')}
        onOpenDiscount={() => openModal('discount')}
        onOpenData={() => openModal('data')}
        onOpenProductionSettings={() => openModal('productionSettings')}
        onOpenCostDashboard={() => openModal('costDashboard')}
        onOpenFormulaDocs={() => openModal('formulaDocs')}
        onOpenMaterialSummary={() => openModal('materialSummary', {})}
      />
    </>
  );
};
