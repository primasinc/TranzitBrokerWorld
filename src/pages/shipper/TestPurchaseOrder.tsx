import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { PurchaseOrderForm } from '../../components/shipper/forms/PurchaseOrderForm';

export const TestPurchaseOrder: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const addOrder = location.state?.addOrder;

  const handleSubmit = (data: any) => {
    if (addOrder) {
      // Map form data to PurchaseOrder type
      const newOrder = {
        poNumber: data.poNumber || `PO-${Math.floor(Math.random() * 100000)}`,
        date: data.date || new Date().toISOString().split('T')[0],
        vendor: data.vendorInfo?.name || '',
        amount: data.total || 0,
        status: 'Processing',
        items: data.items?.length || 0,
        deliveryDate: data.shipTo?.deliveryDate || ''
      };
      addOrder(newOrder);
    }
    navigate('/shipper/purchase-orders');
  };

  const handleCancel = () => {
    navigate('/shipper/purchase-orders');
  };

  return (
    <div>
      <h1>Test Purchase Order Form</h1>
      <PurchaseOrderForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </div>
  );
}; 