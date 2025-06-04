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
}; 