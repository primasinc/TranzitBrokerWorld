import { db } from '../config/firebase';
import { collection, addDoc, updateDoc, doc, getDocs, query, where, serverTimestamp, getDoc } from 'firebase/firestore';

// Strict type definition for broker partner request statuses
export type BrokerPartnerRequestStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';

export interface BrokerPartnerRequest {
  id?: string;
  poNumber: string;
  loadId: string;
  brokerId: string; // Changed from userId to brokerId
  carrierId: string;
  status: BrokerPartnerRequestStatus;
  createdAt: any;
  updatedAt: any;
  offer?: number;
  type?: string;
}

export const createBrokerPartnerRequest = async (data: Omit<BrokerPartnerRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => {
  // Fetch the load to enforce canonical rule
  const loadSnap = await getDoc(doc(db, 'loads', data.loadId));
  const load = loadSnap.data();
  if (!load) {
    throw new Error('Cannot create broker partner request: load not found.');
  }
  
  const isMarketplace = load.isMarketplace === true && !load.carrierId;
  const isPartner = load.isMarketplace === false && !!load.carrierId;
  if (!isMarketplace && !isPartner) {
    throw new Error('Cannot create broker partner request: load must be a marketplace load (isMarketplace === true, no carrier) or a partner load (isMarketplace === false, has carrier).');
  }
  
  try {
    // 1. Create broker partner request in UNIFIED collection
    const ref = collection(db, 'partnerRequests'); // Use unified collection
    const docRef = await addDoc(ref, {
      ...data,
      userType: 'broker', // Add userType for unified handling
      status: 'pending' as BrokerPartnerRequestStatus,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    // 2. Create corresponding notification for carrier
    try {
      // Validate required data for notification
      if (!data.poNumber || !data.carrierId || !data.brokerId) {
        console.warn('[createBrokerPartnerRequest] Missing required data for notification creation:', { 
          poNumber: data.poNumber, 
          carrierId: data.carrierId, 
          brokerId: data.brokerId 
        });
        return docRef.id; // Still return partner request ID even if notification fails
      }
      
      // Create notification with unified type for broker requests
      const notificationRef = collection(db, 'notifications');
      const notificationData = {
        poNumber: data.poNumber,
        carrierId: data.carrierId,
        brokerId: data.brokerId, // Keep brokerId for backward compatibility
        userId: data.brokerId, // Add userId for unified handling
        userType: 'broker', // Add userType for unified handling
        recipientId: data.carrierId,
        type: 'unified_partner_request', // Use unified type
        status: 'pending',
        message: `Broker partner request for PO ${data.poNumber}`,
        read: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        requiresAction: true
      };
      
      const notificationDocRef = await addDoc(notificationRef, notificationData);
      console.log('[createBrokerPartnerRequest] Notification created successfully:', notificationDocRef.id);
      
      // 3. Verify notification creation
      const verificationQuery = query(
        collection(db, 'notifications'),
        where('poNumber', '==', data.poNumber),
        where('carrierId', '==', data.carrierId),
        where('type', '==', 'unified_partner_request')
      );
      const verificationSnap = await getDocs(verificationQuery);
      
      if (verificationSnap.empty) {
        console.warn('[createBrokerPartnerRequest] Notification creation verification failed');
      } else {
        console.log('[createBrokerPartnerRequest] Notification creation verified successfully');
      }
      
    } catch (notificationError) {
      // Log error but don't break partner request creation
      console.error('[createBrokerPartnerRequest] Notification creation failed:', notificationError);
      // Partner request still gets created successfully
    }
    
    return docRef.id;
  } catch (error) {
    console.error('[createBrokerPartnerRequest] Broker partner request creation failed:', error);
    throw error;
  }
};

export const updateBrokerPartnerRequestStatus = async (
  requestId: string,
  status: BrokerPartnerRequestStatus,
  offer?: number
) => {
  try {
    const requestRef = doc(db, 'partnerRequests', requestId); // Use unified collection
    const updateData: Partial<BrokerPartnerRequest> = {
      status,
      updatedAt: serverTimestamp()
    };

    if (offer !== undefined) {
      updateData.offer = offer;
    }

    await updateDoc(requestRef, updateData);
    console.log('[updateBrokerPartnerRequestStatus] Status updated successfully:', status);
    
    return true;
  } catch (error) {
    console.error('[updateBrokerPartnerRequestStatus] Failed to update status:', error);
    throw error;
  }
};

export const getBrokerPartnerRequests = async (brokerId: string) => {
  try {
    const requestsQuery = query(
      collection(db, 'partnerRequests'), // Use unified collection
      where('brokerId', '==', brokerId),
      where('userType', '==', 'broker') // Filter by userType for brokers
    );
    
    const snapshot = await getDocs(requestsQuery);
    const requests: BrokerPartnerRequest[] = [];
    
    snapshot.forEach(doc => {
      requests.push({
        id: doc.id,
        ...doc.data()
      } as BrokerPartnerRequest);
    });
    
    return requests;
  } catch (error) {
    console.error('[getBrokerPartnerRequests] Failed to fetch requests:', error);
    throw error;
  }
};
