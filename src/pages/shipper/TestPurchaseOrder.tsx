import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { PurchaseOrderForm } from '../../components/shipper/forms/PurchaseOrderForm';
import { db } from '../../firebase';
import { doc, updateDoc, addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';

export const TestPurchaseOrder: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { editingPO, isEditing } = location.state || {};
  const { user } = useAuth();

  const handleSubmit = async (data: any) => {
    console.log('DEBUG: TestPurchaseOrder handleSubmit called', data);
    try {
      if (!user?.uid) {
        alert('User ID not found. Please make sure you are logged in.');
        return;
      }
      // Geocode vendor (pickup) address
      let pickupPosition: [number, number] = [0, 0];
      let pickupAddress = '';
      try {
        const vendor = data.vendorInfo || {};
        pickupAddress = `${vendor.streetAddress || ''}, ${vendor.cityStateZip || ''}`;
        const accessToken = process.env.REACT_APP_MAPBOX_TOKEN;
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(pickupAddress)}.json?access_token=${accessToken}`
        );
        const geoData = await response.json();
        if (geoData.features && geoData.features.length > 0) {
          pickupPosition = geoData.features[0].center;
        }
      } catch (err) {
        console.warn('Geocoding failed for pickup address:', pickupAddress, err);
      }
      // Geocode delivery address
      let deliveryPosition: [number, number] = [0, 0];
      let deliveryAddress = '';
      try {
        const shipTo = data.shipTo || {};
        deliveryAddress = `${shipTo.streetAddress || ''}, ${shipTo.cityStateZip || ''}`;
        const accessToken = process.env.REACT_APP_MAPBOX_TOKEN;
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(deliveryAddress)}.json?access_token=${accessToken}`
        );
        const geoData = await response.json();
        if (geoData.features && geoData.features.length > 0) {
          deliveryPosition = geoData.features[0].center;
        }
      } catch (err) {
        console.warn('Geocoding failed for delivery address:', deliveryAddress, err);
      }
      // Prepare PO data
      const poData = {
        ...data,
        vendorInfo: {
          ...data.vendorInfo,
          position: pickupPosition
        },
        pickupLocation: {
          address: pickupAddress,
          position: pickupPosition
        },
        deliveryLocation: {
          address: deliveryAddress,
          position: deliveryPosition
        },
        updatedAt: new Date().toISOString(),
        userId: user?.uid || ''
      };
      // --- EDITING EXISTING PO ---
      if (isEditing && editingPO?.id) {
        const poRef = doc(db, 'purchaseOrders', editingPO.id);
        // Fetch the existing PO to avoid overwriting important fields
        const existingPOSnap = await getDocs(query(collection(db, 'purchaseOrders'), where('poNumber', '==', editingPO.poNumber)));
        let existingPO = {};
        if (!existingPOSnap.empty) {
          existingPO = existingPOSnap.docs[0].data();
        }
        await updateDoc(poRef, { ...existingPO, ...poData, items: data.items || [] });
        // Update corresponding load
        const loadsSnapshot = await getDocs(query(collection(db, 'loads'), where('poNumber', '==', editingPO.poNumber)));
        for (const loadDocSnap of loadsSnapshot.docs) {
          await updateDoc(doc(db, 'loads', loadDocSnap.id), {
            ...poData,
            items: data.items || [],
            title: `${data.vendorInfo?.name || 'Pickup'} to ${data.shipTo?.name || 'Delivery'}`,
            status: data.status || 'open',
            updatedAt: new Date().toISOString(),
            shipperId: user?.uid || '',
          });
        }
        // If PO number changed, create new PO and load, and cancel old ones
        if (data.poNumber && data.poNumber !== editingPO.poNumber) {
          // Cancel old PO and loads
          await updateDoc(poRef, { status: 'cancelled' });
          for (const loadDocSnap of loadsSnapshot.docs) {
            await updateDoc(doc(db, 'loads', loadDocSnap.id), { status: 'cancelled' });
          }
          // Create new PO and load
          const newOrder = { ...poData, poNumber: data.poNumber, items: data.items || [] };
          const newPOSnap = await addDoc(collection(db, 'purchaseOrders'), newOrder);
          const newLoad = {
            ...poData,
            items: data.items || [],
            title: `${data.vendorInfo?.name || 'Pickup'} to ${data.shipTo?.name || 'Delivery'}`,
            poNumber: data.poNumber,
            status: 'open',
            createdAt: new Date().toISOString(),
            shipperId: user?.uid || '',
            isMarketplace: !(data.carrierOption === 'carrier' && data.selectedCarrier && data.selectedCarrier.id)
          };
          await addDoc(collection(db, 'loads'), newLoad);
        }
        alert('Purchase order updated successfully.');
        navigate('/shipper/orders');
        return;
      }
      // --- CREATING NEW PO OR UPDATING EXISTING (DUPLICATE PREVENTION) ---
      const poNumber = data.poNumber || `PO-${Math.floor(Math.random() * 100000)}`;
      const existingPOSnapshot = await getDocs(query(collection(db, 'purchaseOrders'), where('poNumber', '==', poNumber)));
      let poId = null;
      let foundActive = false;
      let foundCompleted = false;
      existingPOSnapshot.forEach(docSnap => {
        const poData = docSnap.data();
        const status = (poData.status || '').toLowerCase();
        if (status !== 'cancelled' && status !== 'completed') {
          poId = docSnap.id;
          foundActive = true;
        }
        if (status === 'completed') {
          foundCompleted = true;
        }
      });
      if (foundActive && poId) {
        // Update the existing active PO
        const poRef = doc(db, 'purchaseOrders', poId);
        await updateDoc(poRef, { ...poData, poNumber, updatedAt: new Date().toISOString(), items: data.items || [] });
        // Update corresponding load
        const loadsSnapshot = await getDocs(query(collection(db, 'loads'), where('poNumber', '==', poNumber)));
        for (const loadDocSnap of loadsSnapshot.docs) {
          await updateDoc(doc(db, 'loads', loadDocSnap.id), {
            ...poData,
            items: data.items || [],
            title: `${data.vendorInfo?.name || 'Pickup'} to ${data.shipTo?.name || 'Delivery'}`,
            status: data.status || 'open',
            updatedAt: new Date().toISOString(),
            shipperId: user?.uid || '',
          });
        }
        alert('Purchase order updated successfully.');
        navigate('/shipper/orders');
        return;
      } else if (foundCompleted) {
        alert('A completed PO with this number already exists. Please use a different PO number.');
        return;
      } else {
        // Create new PO
        const newOrder = {
          ...poData,
          poNumber,
          date: data.date || new Date().toISOString().split('T')[0],
          vendor: data.vendorInfo?.name || '',
          amount: data.total || 0,
          rate: data.rate || 0,
          items: data.items || [],
          deliveryDate: data.shipTo?.deliveryDate || '',
          status: data.carrierOption ? 'Active' : 'Processing',
          shippingScheduleStatus: data.carrierOption ? 'Carrier Pending' : 'Open',
          vendorInfo: {
            ...data.vendorInfo,
            position: pickupPosition
          },
          pickupLocation: {
            address: pickupAddress,
            position: pickupPosition
          },
          deliveryLocation: {
            address: deliveryAddress,
            position: deliveryPosition
          },
          userId: user?.uid || ''
        };
        const poDocRef = await addDoc(collection(db, 'purchaseOrders'), newOrder);
        // Create new load
        const newLoad = {
          ...poData,
          items: data.items || [],
          title: `${data.vendorInfo?.name || 'Pickup'} to ${data.shipTo?.name || 'Delivery'}`,
          pickupLocation: {
            address: pickupAddress,
            position: pickupPosition
          },
          deliveryLocation: {
            address: deliveryAddress,
            position: deliveryPosition
          },
          rate: data.rate || 0,
          poNumber,
          status: 'open',
          createdAt: new Date().toISOString(),
          shipperId: user.uid,
          isMarketplace: !(data.carrierOption === 'carrier' && data.selectedCarrier && data.selectedCarrier.id)
        };
        await addDoc(collection(db, 'loads'), newLoad);
        alert('Purchase order created successfully.');
        if (data.carrierOption === 'carrier') {
          navigate('/shipper/partners', { state: { poData: newOrder } });
        } else {
          // Ensure status is correct for shipping schedule
          await updateDoc(poDocRef, { shippingScheduleStatus: 'Open', status: 'Processing' });
          navigate('/shipper/schedule');
        }
        return;
      }
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