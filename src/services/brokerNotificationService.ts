import { db } from '../config/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc, query, where, getDocs, updateDoc } from 'firebase/firestore';

export interface BrokerLoadRequestNotification {
  id?: string;
  carrierId: string;
  brokerId: string; // Changed from shipperId to brokerId
  shippingScheduleId: string;
  loadId?: string;
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
    brokerCompany?: string; // Changed from shipperCompany to brokerCompany
    poNumber?: string;
    carrierOption?: string;
  };
  createdAt: any;
  updatedAt: any;
}

export const sendBrokerLoadRequestToCarrier = async (
  carrierId: string,
  brokerId: string,
  shippingScheduleId: string,
  loadDetails: BrokerLoadRequestNotification['loadDetails']
) => {
  // Fetch broker profile for senderName
  let senderName = '';
  try {
    const brokerDoc = await getDoc(doc(db, 'users', brokerId));
    if (brokerDoc.exists()) {
      const brokerProfile = brokerDoc.data();
      senderName = brokerProfile.companyName || brokerProfile.displayName || '';
    }
  } catch (err) {
    console.error('[sendBrokerLoadRequestToCarrier] Error fetching broker profile:', err);
  }

  const notificationRef = collection(db, 'notifications');
  const notificationData: Omit<BrokerLoadRequestNotification, 'id'> & { 
    recipientId: string; 
    type: string; 
    message: string; 
    senderName: string; 
    read: boolean;
    brokerId: string; // Keep brokerId for backward compatibility
    userId: string; // Add userId for unified handling
    userType: string; // Add userType for unified handling
  } = {
    carrierId,
    brokerId, // Keep brokerId for backward compatibility
    userId: brokerId, // Add userId for unified handling
    userType: 'broker', // Add userType for unified handling
    recipientId: carrierId, // Ensure carrier receives the notification
    shippingScheduleId,
    status: 'pending',
    loadDetails,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    type: 'unified_load_request', // Use unified type
    message: 'You have a new load request from a broker.',
    senderName,
    read: false
  };

  const docRef = await addDoc(notificationRef, notificationData);
  console.log('[sendBrokerLoadRequestToCarrier] Broker load request notification created:', docRef.id);
  return docRef.id;
};

export const updateBrokerLoadRequestStatus = async (
  poNumber: string,
  status: BrokerLoadRequestNotification['status'],
  counterOffer?: number
) => {
  console.log('[updateBrokerLoadRequestStatus] Called with:', { poNumber, status, counterOffer });
  
  try {
    // Find notifications for this PO and broker using unified type
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('poNumber', '==', poNumber),
      where('type', '==', 'unified_load_request') // Use unified type
    );
    
    const notificationsSnap = await getDocs(notificationsQuery);
    if (notificationsSnap.empty) {
      throw new Error(`No unified load request notification found for PO ${poNumber}`);
    }
    
    // Update all matching notifications
    const updatePromises = notificationsSnap.docs.map(async (docSnapshot) => {
      const notificationRef = doc(db, 'notifications', docSnapshot.id);
      const updateData: Partial<BrokerLoadRequestNotification> = {
        status,
        updatedAt: serverTimestamp()
      };

      if (counterOffer !== undefined) {
        // SAFE ACCESS: Check if loadDetails exists before spreading
        const currentData = docSnapshot.data() as BrokerLoadRequestNotification;
        updateData.loadDetails = {
          ...(currentData.loadDetails || {}),
          rate: counterOffer
        };
      }

      return updateDoc(notificationRef, updateData);
    });
    
    await Promise.all(updatePromises);
    console.log('[updateBrokerLoadRequestStatus] All unified load request notifications updated successfully');
    
    return true;
  } catch (error) {
    console.error('[updateBrokerLoadRequestStatus] Failed to update notifications:', error);
    throw error;
  }
};
