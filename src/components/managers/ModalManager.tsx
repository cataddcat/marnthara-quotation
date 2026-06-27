// src/components/managers/ModalManager.tsx

import React from 'react';
import { useAppStore } from '@/store/useAppStore';
import { modalPropsAs } from '@/store/slices/ModalSlice';

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
import { CodeDetailModal } from '@/components/modals/CodeDetailModal';
import { JobsModal } from '@/components/modals/JobsModal';
import { SignInModal } from '@/components/modals/SignInModal';
import { CustomerDirectoryModal } from '@/components/modals/CustomerDirectoryModal';
import { AdminPinModal } from '@/components/modals/AdminPinModal';
import { UndoHistoryModal } from '@/components/modals/UndoHistoryModal';

export const ModalManager: React.FC<{ onOpenOverview?: () => void }> = ({ onOpenOverview }) => {
  const { activeModal, modalProps, closeModal, openModal, openCounts } = useAppStore();

  const isVisible = (type: string) => activeModal === type;

  // narrow modalProps ตาม activeModal — helper จาก ModalSlice
  const itemProps = modalPropsAs(activeModal, modalProps, 'item');
  const materialSummaryProps = modalPropsAs(activeModal, modalProps, 'materialSummary');
  const projectOverviewProps = modalPropsAs(activeModal, modalProps, 'projectOverview');
  const codeDetailProps = modalPropsAs(activeModal, modalProps, 'codeDetail');
  const adminPinProps = modalPropsAs(activeModal, modalProps, 'adminPin');

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
      />

      <CustomerModal isOpen={isVisible('customer')} onClose={closeModal} />

      <PdfPreviewModal isOpen={isVisible('pdf')} onClose={closeModal} />

      <ShopSettingsModal
        key={`shop-${openCounts.shopSettings ?? 0}`}
        isOpen={isVisible('shopSettings')}
        onClose={closeModal}
      />

      <DiscountModal
        key={`discount-${openCounts.discount ?? 0}`}
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
        key={`cost-${openCounts.costDashboard ?? 0}`}
        isOpen={isVisible('costDashboard')}
        onClose={closeModal}
      />

      <FormulaDocsModal
        key={`fd-${openCounts.formulaDocs ?? 0}`}
        isOpen={isVisible('formulaDocs')}
        onClose={closeModal}
      />

      <MaterialSummaryModal
        key={`ms-${openCounts.materialSummary ?? 0}`}
        isOpen={isVisible('materialSummary')}
        onClose={closeModal}
        initialTab={materialSummaryProps?.initialTab}
        initialCategory={materialSummaryProps?.initialCategory}
        prefillCode={materialSummaryProps?.prefillCode}
      />

      <CopySummaryModal
        key={`cs-${openCounts.copySummary ?? 0}`}
        isOpen={isVisible('copySummary')}
        onClose={closeModal}
      />

      <CodeDetailModal
        key={`cd-${openCounts.codeDetail ?? 0}`}
        isOpen={isVisible('codeDetail')}
        onClose={closeModal}
        code={codeDetailProps?.code}
        category={codeDetailProps?.category}
      />

      <JobsModal
        key={`jobs-${openCounts.jobs ?? 0}`}
        isOpen={isVisible('jobs')}
        onClose={closeModal}
      />

      <SignInModal
        key={`signin-${openCounts.signIn ?? 0}`}
        isOpen={isVisible('signIn')}
        onClose={closeModal}
      />

      <CustomerDirectoryModal
        key={`custdir-${openCounts.customerDirectory ?? 0}`}
        isOpen={isVisible('customerDirectory')}
        onClose={closeModal}
      />

      <AdminPinModal
        key={`adminpin-${openCounts.adminPin ?? 0}`}
        isOpen={isVisible('adminPin')}
        onClose={closeModal}
        intent={adminPinProps?.intent ?? 'unlock'}
        onSuccess={adminPinProps?.onSuccess}
      />

      <UndoHistoryModal
        key={`undo-${openCounts.undoHistory ?? 0}`}
        isOpen={isVisible('undoHistory')}
        onClose={closeModal}
      />

      <MainMenuModal
        isOpen={isVisible('mainMenu')}
        onClose={closeModal}
        onOpenOverview={onOpenOverview}
        onOpenJobs={() => openModal('jobs')}
        onOpenSignIn={() => openModal('signIn')}
        onOpenCustomerDirectory={() => openModal('customerDirectory')}
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
