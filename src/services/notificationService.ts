import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';

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
): Promise<string> => {
  try {
    const notification: Omit<LoadRequestNotification, 'id'> = {
      carrierId,
      shipperId,
      shippingScheduleId,
      status: 'pending',
      loadDetails,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'notifications'), notification);
    return docRef.id;
  } catch (error) {
    console.error('Error sending load request notification:', error);
    throw error;
  }
};

export const updateLoadRequestStatus = async (
  notificationId: string,
  status: LoadRequestNotification['status']
): Promise<void> => {
  try {
    const notificationRef = doc(db, 'notifications', notificationId);
    await updateDoc(notificationRef, {
      status,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating load request status:', error);
    throw error;
  }
}; 