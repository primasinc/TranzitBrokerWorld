import React from 'react';
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
    try {
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
      if (isEditing && editingPO?.id) {
        // Editing existing PO: always update by Firestore ID
        const poRef = doc(db, 'purchaseOrders', editingPO.id);
        await updateDoc(poRef, {
          ...data,
          updatedAt: new Date().toISOString()
        });
        // Update the corresponding load (by poNumber)
        const loadsSnapshot = await getDocs(collection(db, 'loads'));
        let found = false;
        loadsSnapshot.forEach(async loadDocSnap => {
          const loadData = loadDocSnap.data();
          if (loadData.poNumber === editingPO.poNumber) {
            found = true;
            await updateDoc(doc(db, 'loads', loadDocSnap.id), {
              title: `${data.vendorInfo?.name || 'Pickup'} to ${data.shipTo?.name || 'Delivery'}`,
              pickupLocation: {
                address: data.vendorInfo?.streetAddress || '',
                position: data.vendorInfo?.position || [0,0]
              },
              deliveryLocation: {
                address: data.shipTo?.streetAddress || '',
                position: data.shipTo?.position || [0,0]
              },
              rate: data.rate || 0,
              status: data.status || 'open',
              updatedAt: new Date().toISOString(),
              shipperId: user?.uid || '',
            });
          }
        });
        // If PO number changed, create new PO and load, and remove old ones
        if (data.poNumber && data.poNumber !== editingPO.poNumber) {
          // Create new PO
          const newOrder = {
            ...data,
            poNumber: data.poNumber,
            updatedAt: new Date().toISOString()
          };
          await addDoc(collection(db, 'purchaseOrders'), newOrder);
          // Create new load
          const newLoad = {
            title: `${data.vendorInfo?.name || 'Pickup'} to ${data.shipTo?.name || 'Delivery'}`,
            pickupLocation: {
              address: data.vendorInfo?.streetAddress || '',
              position: data.vendorInfo?.position || [0,0]
            },
            deliveryLocation: {
              address: data.shipTo?.streetAddress || '',
              position: data.shipTo?.position || [0,0]
            },
            rate: data.rate || 0,
            poNumber: data.poNumber,
            status: data.status || 'open',
            createdAt: new Date().toISOString(),
            shipperId: user?.uid || '',
          };
          await addDoc(collection(db, 'loads'), newLoad);
          // Remove old PO and load
          await updateDoc(poRef, { status: 'cancelled' });
          loadsSnapshot.forEach(async loadDocSnap => {
            const loadData = loadDocSnap.data();
            if (loadData.poNumber === editingPO.poNumber) {
              await updateDoc(doc(db, 'loads', loadDocSnap.id), { status: 'cancelled' });
            }
          });
        }
      } else {
        // Not editing: check for existing non-cancelled PO with same poNumber
        const poNumber = data.poNumber || `PO-${Math.floor(Math.random() * 100000)}`;
        const existingPOSnapshot = await getDocs(query(collection(db, 'purchaseOrders'), where('poNumber', '==', poNumber)));
        let poId = null;
        let foundActive = false;
        existingPOSnapshot.forEach(docSnap => {
          const poData = docSnap.data();
          if ((poData.status || '').toLowerCase() !== 'cancelled') {
            poId = docSnap.id;
            foundActive = true;
          }
        });
        if (foundActive && poId) {
          // Update the existing active PO
          const poRef = doc(db, 'purchaseOrders', poId);
          await updateDoc(poRef, {
            ...data,
            poNumber,
            updatedAt: new Date().toISOString()
          });
        } else {
          // Create new PO
          const newOrder = {
            poNumber,
            date: data.date || new Date().toISOString().split('T')[0],
            vendor: data.vendorInfo?.name || '',
            amount: data.total || 0,
            rate: data.rate || 0,
            items: data.items?.length || 0,
            deliveryDate: data.shipTo?.deliveryDate || '',
            ...data,
            status: data.carrierOption ? 'Active' : 'Processing',
            shippingScheduleStatus: data.carrierOption ? 'Active' : 'Open',
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
            }
          };
          const poDocRef = await addDoc(collection(db, 'purchaseOrders'), newOrder);
          poId = poDocRef.id;
        }
        // Also create or update a load in the 'loads' collection for carrier visibility
        if (!user?.uid) {
          alert('User ID not found. Please make sure you are logged in.');
          return;
        }
        const loadsSnapshot = await getDocs(query(collection(db, 'loads'), where('poNumber', '==', poNumber)));
        if (!loadsSnapshot.empty) {
          // Update the existing load
          const loadDocRef = doc(db, 'loads', loadsSnapshot.docs[0].id);
          await updateDoc(loadDocRef, {
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
            updatedAt: new Date().toISOString(),
            shipperId: user.uid,
          });
        } else {
          // Create new load
          const loadDoc = {
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
          };
          await addDoc(collection(db, 'loads'), loadDoc);
        }
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