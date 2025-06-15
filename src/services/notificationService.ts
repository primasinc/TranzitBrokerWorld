import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, getDoc, query, where, getDocs, setDoc } from 'firebase/firestore';

export interface LoadRequestNotification {
  id?: string;
  carrierId: string;
  shipperId: string;
  shippingScheduleId: string;
  status: 'pending' | 'accepted' | 'rejected' | 'counter_offer';
  loadDetails: {
    pickupLocation: {
      address: string;
      city: string;
      state: string;
      zipCode: string;
      date: string;
      time: string;
    };
    deliveryLocation: {
      address: string;
      city: string;
      state: string;
      zipCode: string;
      date: string;
      time: string;
    };
    dimensions: {
      length: number;
      width: number;
      height: number;
    };
    weight: number;
    rate: number;
    shipperCompany?: string;
    poNumber?: string;
    carrierOption?: string;
  };
  createdAt: any;
  updatedAt: any;
}

export const sendLoadRequestToCarrier = async (
  carrierId: string,
  shipperId: string,
  shippingScheduleId: string,
  loadDetails: LoadRequestNotification['loadDetails']
) => {
  const notificationRef = collection(db, 'notifications');
  const notificationData: Omit<LoadRequestNotification, 'id'> = {
    carrierId,
    shipperId,
    shippingScheduleId,
    status: 'pending',
    loadDetails,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  const docRef = await addDoc(notificationRef, notificationData);
  return docRef.id;
};

export const updateLoadRequestStatus = async (
  notificationId: string,
  status: LoadRequestNotification['status'],
  poNumber: string,
  counterOffer?: number
) => {
  console.log('[updateLoadRequestStatus] Called with:', { notificationId, status, poNumber, counterOffer });
  const notificationRef = doc(db, 'notifications', notificationId);
  const updateData: Partial<LoadRequestNotification> = {
    status,
    updatedAt: serverTimestamp()
  };

  if (counterOffer !== undefined) {
    const notificationDoc = await getDoc(notificationRef);
    const currentData = notificationDoc.data() as LoadRequestNotification;
    updateData.loadDetails = {
      ...currentData.loadDetails,
      rate: counterOffer
    };
  }

  await updateDoc(notificationRef, updateData);

  const notificationDoc = await getDoc(notificationRef);
  const notifData = notificationDoc.data() as LoadRequestNotification;

  if (status === 'accepted') {
    // Determine if this is a partnered carrier or marketplace
    let isPartnered = false;
    if (notifData?.loadDetails?.carrierOption) {
      isPartnered = notifData.loadDetails.carrierOption === 'carrier';
    }
    try {
      await acceptLoadForPO(poNumber, notifData.carrierId, isPartnered);
    } catch (err) {
      console.error('[updateLoadRequestStatus] Error in acceptLoadForPO:', err);
    }
    // --- Ensure a shipment exists for this PO and shipper ---
    if (notifData?.shipperId && poNumber) {
      const shipmentsQuery = query(
        collection(db, 'shipments'),
        where('shipperId', '==', notifData.shipperId),
        where('poNumber', '==', poNumber)
      );
      const shipmentsSnap = await getDocs(shipmentsQuery);
      if (shipmentsSnap.empty) {
        // Create a new shipment document
        const shipmentData = {
          shipperId: notifData.shipperId,
          poNumber,
          origin: notifData.loadDetails?.pickupLocation?.address || '',
          destination: notifData.loadDetails?.deliveryLocation?.address || '',
          carrier: {
            id: notifData.carrierId,
            name: notifData.loadDetails?.shipperCompany || ''
          },
          scheduledPickup: notifData.loadDetails?.pickupLocation?.date ? new Date(notifData.loadDetails.pickupLocation.date) : new Date(),
          scheduledDelivery: notifData.loadDetails?.deliveryLocation?.date ? new Date(notifData.loadDetails.deliveryLocation.date) : new Date(),
          status: 'in_progress',
          cost: notifData.loadDetails?.rate || 0,
          isOnTime: true,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        console.log('[updateLoadRequestStatus] Creating shipment:', shipmentData);
        if (shipmentData.poNumber && shipmentData.shipperId && shipmentData.carrier.id) {
          await addDoc(collection(db, 'shipments'), shipmentData);
          console.log('[updateLoadRequestStatus] Shipment successfully created.');
        } else {
          console.error('[updateLoadRequestStatus] Missing required fields for shipment:', shipmentData);
        }
      }
    } else {
      console.error('[updateLoadRequestStatus] Missing shipperId or poNumber for shipment creation:', { shipperId: notifData?.shipperId, poNumber });
    }
    // --- Add load to 'loads' collection for carrier's My Loads ---
    const loadsRef = collection(db, 'loads');
    const loadData = {
      carrierId: notifData.carrierId,
      shipperId: notifData.shipperId,
      title: notifData.loadDetails?.shipperCompany || 'Load',
      shipper: notifData.loadDetails?.shipperCompany || '',
      pickup: {
        location: notifData.loadDetails?.pickupLocation?.address || '',
        time: notifData.loadDetails?.pickupLocation?.date || '',
        status: 'pending'
      },
      delivery: {
        location: notifData.loadDetails?.deliveryLocation?.address || '',
        time: notifData.loadDetails?.deliveryLocation?.date || '',
        status: 'pending'
      },
      status: 'active',
      payment: notifData.loadDetails?.rate || 0,
      weight: notifData.loadDetails?.weight?.toString() || '',
      dimensions: `${notifData.loadDetails?.dimensions?.length || ''}x${notifData.loadDetails?.dimensions?.width || ''}x${notifData.loadDetails?.dimensions?.height || ''}`,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      poNumber: poNumber || '',
    };
    console.log('[updateLoadRequestStatus] Creating load for carrier:', loadData);
    if (loadData.carrierId && loadData.shipperId && loadData.poNumber) {
      await addDoc(loadsRef, loadData);
      console.log('[updateLoadRequestStatus] Load successfully created for carrier.');
    } else {
      console.error('[updateLoadRequestStatus] Missing required fields for load:', loadData);
    }
    // Notify the shipper
    if (notifData?.shipperId) {
      const shipperNotificationRef = collection(db, 'notifications');
      await addDoc(shipperNotificationRef, {
        shipperId: notifData.shipperId,
        recipientId: notifData.shipperId,
        carrierId: notifData.carrierId,
        poNumber: poNumber,
        status: 'accepted',
        type: 'carrier_accept',
        message: 'Carrier has accepted your load request.',
        loadDetails: notifData.loadDetails,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
    // Notify the carrier if this is a response to a counter offer
    if (notifData?.carrierId) {
      const carrierNotificationRef = collection(db, 'notifications');
      await addDoc(carrierNotificationRef, {
        carrierId: notifData.carrierId,
        recipientId: notifData.carrierId,
        shipperId: notifData.shipperId,
        poNumber: poNumber,
        status: 'accepted',
        type: 'shipper_accept_counter',
        message: 'Shipper accepted your counter offer.',
        loadDetails: notifData.loadDetails,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
  } else if (status === 'rejected') {
    // Update the shipping schedule status to 'Cancelled'
    let cancelRef = null;
    if (poNumber) {
      const poSnapshot = await getDocs(query(collection(db, 'purchaseOrders'), where('poNumber', '==', poNumber)));
      if (!poSnapshot.empty) {
        cancelRef = doc(db, 'purchaseOrders', poSnapshot.docs[0].id);
      }
    }
    if (cancelRef) {
      try {
        await updateDoc(cancelRef, { status: 'Cancelled', shippingScheduleStatus: 'Cancelled' });
        console.log('[updateLoadRequestStatus] Cancelled PO for poNumber:', poNumber);
      } catch (err) {
        console.error('[updateLoadRequestStatus] Error cancelling PO:', err);
      }
    }
    // Notify the shipper of rejection
    if (notifData?.shipperId) {
      const shipperNotificationRef = collection(db, 'notifications');
      await addDoc(shipperNotificationRef, {
        shipperId: notifData.shipperId,
        recipientId: notifData.shipperId,
        carrierId: notifData.carrierId,
        poNumber: poNumber,
        status: 'rejected',
        type: 'carrier_reject',
        message: 'Carrier has rejected your load request.',
        loadDetails: notifData.loadDetails,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        requiresAction: true
      });
    }
    // Notify the carrier if this is a response to a counter offer
    if (notifData?.carrierId) {
      const carrierNotificationRef = collection(db, 'notifications');
      await addDoc(carrierNotificationRef, {
        carrierId: notifData.carrierId,
        recipientId: notifData.carrierId,
        shipperId: notifData.shipperId,
        poNumber: poNumber,
        status: 'rejected',
        type: 'shipper_reject_counter',
        message: 'Shipper rejected your counter offer.',
        loadDetails: notifData.loadDetails,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
  } else if (status === 'counter_offer' && counterOffer !== undefined) {
    // Notify the shipper of the counter offer
    if (notifData?.shipperId) {
      const shipperNotificationRef = collection(db, 'notifications');
      await addDoc(shipperNotificationRef, {
        shipperId: notifData.shipperId,
        recipientId: notifData.shipperId,
        carrierId: notifData.carrierId,
        poNumber: poNumber,
        status: 'counter_offer',
        type: 'carrier_counter_offer',
        message: `Carrier has made a counter offer of $${counterOffer.toFixed(2)}.`,
        loadDetails: {
          ...notifData.loadDetails,
          rate: counterOffer
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        requiresAction: true
      });
    }
  }
};

export const acceptLoadForPO = async (
  poNumber: string,
  carrierId: string,
  isPartnered: boolean
) => {
  console.log('[acceptLoadForPO] Called with:', { poNumber, carrierId, isPartnered });
  // 1. Find PO by poNumber
  const poSnapshot = await getDocs(query(collection(db, 'purchaseOrders'), where('poNumber', '==', poNumber)));
  if (poSnapshot.empty) {
    console.error('[acceptLoadForPO] PO not found for poNumber:', poNumber);
    throw new Error('PO not found');
  }
  const poDoc = poSnapshot.docs[0];
  const poId = poDoc.id;

  // 2. Fetch carrier profile
  let carrierProfile: Record<string, any> = {};
  try {
    const carrierDoc = await getDoc(doc(db, 'users', carrierId));
    if (carrierDoc.exists()) {
      carrierProfile = carrierDoc.data();
    }
  } catch (err) {
    console.error('[acceptLoadForPO] Error fetching carrier profile:', err);
  }

  // 3. Prepare carrier info
  const carrierInfo = {
    id: carrierId,
    companyName: carrierProfile.companyName || '',
    email: carrierProfile.email || '',
    acceptedAt: new Date().toISOString(),
    status: isPartnered ? 'approved' : 'pending'
  };

  // 4. Write to carriers subcollection
  try {
    await setDoc(doc(db, 'purchaseOrders', poId, 'carriers', carrierId), carrierInfo);
    console.log('[acceptLoadForPO] Added carrier to PO carriers subcollection.');
  } catch (err) {
    console.error('[acceptLoadForPO] Error writing carrier subcollection:', err);
  }

  // 5. Update PO summary fields
  try {
    await updateDoc(doc(db, 'purchaseOrders', poId), {
      shippingScheduleStatus: isPartnered ? 'Active' : 'Carrier Review',
      status: 'Active',
      [isPartnered ? 'approvedCarrier' : 'pendingCarrier']: carrierInfo
    });
    console.log('[acceptLoadForPO] Updated PO with carrier info and status.');
  } catch (err) {
    console.error('[acceptLoadForPO] Error updating PO:', err);
  }
}; 