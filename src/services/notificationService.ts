import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, getDoc } from 'firebase/firestore';

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
  counterOffer?: number
) => {
  const notificationRef = doc(db, 'notifications', notificationId);
  const updateData: Partial<LoadRequestNotification> = {
    status,
    updatedAt: serverTimestamp()
  };

  if (counterOffer !== undefined) {
    // Get the current notification data
    const notificationDoc = await getDoc(notificationRef);
    const currentData = notificationDoc.data() as LoadRequestNotification;
    
    // Update only the rate while preserving other load details
    updateData.loadDetails = {
      ...currentData.loadDetails,
      rate: counterOffer
    };
  }

  await updateDoc(notificationRef, updateData);

  // Get the notification data for further processing
  const notificationDoc = await getDoc(notificationRef);
  const notifData = notificationDoc.data() as LoadRequestNotification;

  if (status === 'accepted') {
    if (notifData?.shippingScheduleId) {
      // Update the shipping schedule status to 'Active'
      const scheduleRef = doc(db, 'purchaseOrders', notifData.shippingScheduleId);
      await updateDoc(scheduleRef, { status: 'Active' });
    }
    // Notify the shipper
    if (notifData?.shipperId) {
      const shipperNotificationRef = collection(db, 'notifications');
      await addDoc(shipperNotificationRef, {
        shipperId: notifData.shipperId,
        recipientId: notifData.shipperId,
        carrierId: notifData.carrierId,
        shippingScheduleId: notifData.shippingScheduleId,
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
        shippingScheduleId: notifData.shippingScheduleId,
        status: 'accepted',
        type: 'shipper_accept_counter',
        message: 'Shipper accepted your counter offer.',
        loadDetails: notifData.loadDetails,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
    // --- Add load to 'loads' collection for carrier's My Loads ---
    const loadsRef = collection(db, 'loads');
    await addDoc(loadsRef, {
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
      updatedAt: serverTimestamp()
    });
  } else if (status === 'rejected') {
    // Update the shipping schedule status to 'Rejected'
    if (notifData?.shippingScheduleId) {
      const scheduleRef = doc(db, 'purchaseOrders', notifData.shippingScheduleId);
      await updateDoc(scheduleRef, { status: 'Rejected' });
    }
    // Notify the shipper of rejection
    if (notifData?.shipperId) {
      const shipperNotificationRef = collection(db, 'notifications');
      await addDoc(shipperNotificationRef, {
        shipperId: notifData.shipperId,
        recipientId: notifData.shipperId,
        carrierId: notifData.carrierId,
        shippingScheduleId: notifData.shippingScheduleId,
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
        shippingScheduleId: notifData.shippingScheduleId,
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
        shippingScheduleId: notifData.shippingScheduleId,
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