import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PurchaseOrderForm } from '../../components/shipper/forms/PurchaseOrderForm';

export const TestPurchaseOrder: React.FC = () => {
  const navigate = useNavigate();

  const handleSubmit = (data: any) => {
    console.log('Form submitted:', data);
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