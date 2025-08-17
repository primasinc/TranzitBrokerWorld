import { db } from '../config/firebase';
import { collection, addDoc, updateDoc, doc, getDocs, query, where, serverTimestamp, getDoc } from 'firebase/firestore';

// Unified types that work for both user types
export type UnifiedPartnerRequestStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';

export interface UnifiedPartnerRequest {
  id?: string;
  poNumber: string;
  loadId: string;
  userId: string; // Generic user ID (could be shipper or broker)
  userType: 'shipper' | 'broker'; // Dynamic user type
  carrierId: string;
  status: UnifiedPartnerRequestStatus;
  createdAt: any;
  updatedAt: any;
  offer?: number;
  type?: string;
}

export interface UnifiedLoadRequestNotification {
  id?: string;
  carrierId: string;
  userId: string; // Generic user ID
  userType: 'shipper' | 'broker'; // Dynamic user type
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
    companyName?: string; // Generic company name (shipper or broker)
    poNumber?: string;
    carrierOption?: string;
  };
  createdAt: any;
  updatedAt: any;
}

// Unified function that works for both user types
export const createUnifiedPartnerRequest = async (
  data: Omit<UnifiedPartnerRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'>,
  userType: 'shipper' | 'broker'
) => {
  // Fetch the load to enforce canonical rule
  const loadSnap = await getDoc(doc(db, 'loads', data.loadId));
  const load = loadSnap.data();
  if (!load) {
    throw new Error(`Cannot create ${userType} partner request: load not found.`);
  }
  
  const isMarketplace = load.isMarketplace === true && !load.carrierId;
  const isPartner = load.isMarketplace === false && !!load.carrierId;
  if (!isMarketplace && !isPartner) {
    throw new Error(`Cannot create ${userType} partner request: load must be a marketplace load (isMarketplace === true, no carrier) or a partner load (isMarketplace === false, has carrier).`);
  }
  
  try {
    // 1. Create unified partner request (single collection for both user types)
    const ref = collection(db, 'partnerRequests'); // Single collection
    const docRef = await addDoc(ref, {
      ...data,
      userType, // Store the user type for dynamic handling
      status: 'pending' as UnifiedPartnerRequestStatus,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    // 2. Create corresponding notification for carrier
    try {
      // Validate required data for notification
      if (!data.poNumber || !data.carrierId || !data.userId) {
        console.warn(`[createUnifiedPartnerRequest] Missing required data for ${userType} notification creation:`, { 
          poNumber: data.poNumber, 
          carrierId: data.carrierId, 
          userId: data.userId 
        });
        return docRef.id; // Still return partner request ID even if notification fails
      }
      
      // Create notification with unified type and dynamic routing
      const notificationRef = collection(db, 'notifications');
      const notificationData = {
        poNumber: data.poNumber,
        carrierId: data.carrierId,
        userId: data.userId, // Generic field
        userType: userType, // Store user type for dynamic handling
        recipientId: data.carrierId,
        type: 'unified_partner_request', // Single type for both
        status: 'pending',
        message: `${userType.charAt(0).toUpperCase() + userType.slice(1)} partner request for PO ${data.poNumber}`,
        read: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        requiresAction: true
      };
      
      const notificationDocRef = await addDoc(notificationRef, notificationData);
      console.log(`[createUnifiedPartnerRequest] ${userType} notification created successfully:`, notificationDocRef.id);
      
      // 3. Verify notification creation
      const verificationQuery = query(
        collection(db, 'notifications'),
        where('poNumber', '==', data.poNumber),
        where('carrierId', '==', data.carrierId),
        where('type', '==', 'unified_partner_request')
      );
      const verificationSnap = await getDocs(verificationQuery);
      
      if (verificationSnap.empty) {
        console.warn(`[createUnifiedPartnerRequest] ${userType} notification creation verification failed`);
      } else {
        console.log(`[createUnifiedPartnerRequest] ${userType} notification creation verified successfully`);
      }
      
    } catch (notificationError) {
      // Log error but don't break partner request creation
      console.error(`[createUnifiedPartnerRequest] ${userType} notification creation failed:`, notificationError);
      // Partner request still gets created successfully
    }
    
    return docRef.id;
  } catch (error) {
    console.error(`[createUnifiedPartnerRequest] ${userType} partner request creation failed:`, error);
    throw error;
  }
};

// Unified function for sending load requests
export const sendUnifiedLoadRequestToCarrier = async (
  carrierId: string,
  userId: string,
  userType: 'shipper' | 'broker',
  shippingScheduleId: string,
  loadDetails: UnifiedLoadRequestNotification['loadDetails']
) => {
  // Fetch user profile for senderName (works for both shippers and brokers)
  let senderName = '';
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      const userProfile = userDoc.data();
      senderName = userProfile.companyName || userProfile.displayName || '';
    }
  } catch (err) {
    console.error(`[sendUnifiedLoadRequestToCarrier] Error fetching ${userType} profile:`, err);
  }

  const notificationRef = collection(db, 'notifications');
  const notificationData: Omit<UnifiedLoadRequestNotification, 'id'> & { 
    recipientId: string; 
    type: string; 
    message: string; 
    senderName: string; 
    read: boolean;
    userType: string; // Store user type for dynamic handling
  } = {
    carrierId,
    userId, // Generic field
    userType, // Store user type for dynamic handling
    recipientId: carrierId, // Ensure carrier receives the notification
    shippingScheduleId,
    status: 'pending',
    loadDetails,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    type: 'unified_load_request', // Single type for both
    message: `You have a new load request from a ${userType}.`,
    senderName,
    read: false
  };

  const docRef = await addDoc(notificationRef, notificationData);
  console.log(`[sendUnifiedLoadRequestToCarrier] ${userType} load request notification created:`, docRef.id);
  return docRef.id;
};

// Unified function for updating partner request status
export const updateUnifiedPartnerRequestStatus = async (
  requestId: string,
  status: UnifiedPartnerRequestStatus,
  offer?: number
) => {
  try {
    const requestRef = doc(db, 'partnerRequests', requestId);
    const updateData: Partial<UnifiedPartnerRequest> = {
      status,
      updatedAt: serverTimestamp()
    };

    if (offer !== undefined) {
      updateData.offer = offer;
    }

    await updateDoc(requestRef, updateData);
    console.log('[updateUnifiedPartnerRequestStatus] Status updated successfully:', status);
    
    return true;
  } catch (error) {
    console.error('[updateUnifiedPartnerRequestStatus] Failed to update status:', error);
    throw error;
  }
};

// Unified function for getting partner requests (works for both user types)
export const getUnifiedPartnerRequests = async (userId: string, userType: 'shipper' | 'broker') => {
  try {
    const requestsQuery = query(
      collection(db, 'partnerRequests'),
      where('userId', '==', userId),
      where('userType', '==', userType)
    );
    
    const snapshot = await getDocs(requestsQuery);
    const requests: UnifiedPartnerRequest[] = [];
    
    snapshot.forEach(doc => {
      requests.push({
        id: doc.id,
        ...doc.data()
      } as UnifiedPartnerRequest);
    });
    
    return requests;
  } catch (error) {
    console.error(`[getUnifiedPartnerRequests] Failed to fetch ${userType} requests:`, error);
    throw error;
  }
};

// Unified function for updating load request status
export const updateUnifiedLoadRequestStatus = async (
  poNumber: string,
  status: UnifiedLoadRequestNotification['status'],
  counterOffer?: number
) => {
  console.log('[updateUnifiedLoadRequestStatus] Called with:', { poNumber, status, counterOffer });
  
  try {
    // Find notifications for this PO (works for both user types)
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('poNumber', '==', poNumber),
      where('type', '==', 'unified_load_request')
    );
    
    const notificationsSnap = await getDocs(notificationsQuery);
    if (notificationsSnap.empty) {
      throw new Error(`No unified load request notification found for PO ${poNumber}`);
    }
    
    // Update all matching notifications
    const updatePromises = notificationsSnap.docs.map(async (docSnapshot) => {
      const notificationRef = doc(db, 'notifications', docSnapshot.id);
      const updateData: Partial<UnifiedLoadRequestNotification> = {
        status,
        updatedAt: serverTimestamp()
      };

      if (counterOffer !== undefined) {
        // SAFE ACCESS: Check if loadDetails exists before spreading
        const currentData = docSnapshot.data() as UnifiedLoadRequestNotification;
        updateData.loadDetails = {
          ...(currentData.loadDetails || {}),
          rate: counterOffer
        };
      }

      return updateDoc(notificationRef, updateData);
    });
    
    await Promise.all(updatePromises);
    console.log('[updateUnifiedLoadRequestStatus] All unified load request notifications updated successfully');
    
    return true;
  } catch (error) {
    console.error('[updateUnifiedLoadRequestStatus] Failed to update notifications:', error);
    throw error;
  }
};
