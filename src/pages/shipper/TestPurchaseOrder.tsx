import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { PurchaseOrderForm } from '../../components/shipper/forms/PurchaseOrderForm';
import { db } from '../../firebase';
import { doc, updateDoc, addDoc, collection } from 'firebase/firestore';

export const TestPurchaseOrder: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { editingPO, isEditing } = location.state || {};

  const handleSubmit = async (data: any) => {
    try {
      if (isEditing && editingPO?.id) {
        // Update existing PO
        const poRef = doc(db, 'purchaseOrders', editingPO.id);
        await updateDoc(poRef, {
          ...data,
          updatedAt: new Date().toISOString()
        });
      } else {
        // Create new PO
        const newOrder = {
          poNumber: data.poNumber || `PO-${Math.floor(Math.random() * 100000)}`,
          date: data.date || new Date().toISOString().split('T')[0],
          vendor: data.vendorInfo?.name || '',
          amount: data.total || 0,
          status: 'Processing',
          items: data.items?.length || 0,
          deliveryDate: data.shipTo?.deliveryDate || '',
          ...data
        };
        // Add to Firestore
        await addDoc(collection(db, 'purchaseOrders'), newOrder);
      }
      navigate('/shipper/orders');
    } catch (error) {
      console.error('Error saving PO:', error);
      alert('Failed to save purchase order. Please try again.');
    }
  };

  const handleCancel = () => {
    navigate('/shipper/orders');
  };

  return (
    <div>
      <h1>{isEditing ? 'Edit Purchase Order' : 'Create Purchase Order'}</h1>
      <PurchaseOrderForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        initialData={editingPO}
      />
    </div>
  );
}; 