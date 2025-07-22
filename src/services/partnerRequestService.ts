import { db } from '../config/firebase';
import { collection, addDoc, updateDoc, doc, getDocs, query, where, serverTimestamp, getDoc } from 'firebase/firestore';

// Strict type definition for partner request statuses
export type PartnerRequestStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';

export interface PartnerRequest {
  id?: string;
  poNumber: string;
  loadId: string;
  userId: string;
  carrierId: string;
  status: PartnerRequestStatus; // Make required and strictly typed
  createdAt: any;
  updatedAt: any;
  offer?: number; // Optional offer amount for make offer
  type?: string; // Optional type (e.g., 'make_offer')
}

export const createPartnerRequest = async (data: Omit<PartnerRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => {
  // Fetch the load to enforce canonical rule
  const loadSnap = await getDoc(doc(db, 'loads', data.loadId));
  const load = loadSnap.data();
  if (!load) {
    throw new Error('Cannot create partner request: load not found.');
  }
  const isMarketplace = load.isMarketplace === true && !load.carrierId;
  const isPartner = load.isMarketplace === false && !!load.carrierId;
  if (!isMarketplace && !isPartner) {
    throw new Error('Cannot create partner request: load must be a marketplace load (isMarketplace === true, no carrier) or a partner load (isMarketplace === false, has carrier).');
  }
  
  try {
    // 1. Create partner request
    const ref = collection(db, 'partnerRequests');
    const docRef = await addDoc(ref, {
      ...data,
      status: 'pending' as PartnerRequestStatus, // Explicitly set to pending
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    // 2. Create corresponding notification for carrier
    try {
      // Validate required data for notification
      if (!data.poNumber || !data.carrierId || !data.userId) {
        console.warn('[createPartnerRequest] Missing required data for notification creation:', { 
          poNumber: data.poNumber, 
          carrierId: data.carrierId, 
          userId: data.userId 
        });
        return docRef.id; // Still return partner request ID even if notification fails
      }
      
      // Create notification with type 'partner_request' for updateLoadRequestStatus to find
      const notificationRef = collection(db, 'notifications');
      const notificationData = {
        poNumber: data.poNumber,
        carrierId: data.carrierId,
        shipperId: data.userId,
        recipientId: data.carrierId,
        type: 'partner_request',
        status: 'pending',
        message: `Partner request for PO ${data.poNumber}`,
        read: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        requiresAction: true
      };
      
      const notificationDocRef = await addDoc(notificationRef, notificationData);
      console.log('[createPartnerRequest] Notification created successfully:', notificationDocRef.id);
      
      // 3. Verify notification creation
      const verificationQuery = query(
        collection(db, 'notifications'),
        where('poNumber', '==', data.poNumber),
        where('carrierId', '==', data.carrierId),
        where('type', '==', 'partner_request')
      );
      const verificationSnap = await getDocs(verificationQuery);
      
      if (verificationSnap.empty) {
        console.warn('[createPartnerRequest] Notification creation verification failed');
      } else {
        console.log('[createPartnerRequest] Notification creation verified successfully');
      }
      
    } catch (notificationError) {
      // Log error but don't break partner request creation
      console.error('[createPartnerRequest] Notification creation failed:', notificationError);
      // Partner request still gets created successfully
    }
    
    return docRef.id;
  } catch (error) {
    console.error('[createPartnerRequest] Partner request creation failed:', error);
    throw error;
  }
};

export const updatePartnerRequestStatus = async (id: string, status: PartnerRequestStatus) => {
  // Validate status is a valid partner request status
  const validStatuses: PartnerRequestStatus[] = ['pending', 'accepted', 'declined', 'cancelled'];
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid partner request status: ${status}. Valid statuses are: ${validStatuses.join(', ')}`);
  }
  
  const ref = doc(db, 'partnerRequests', id);
  await updateDoc(ref, { status, updatedAt: serverTimestamp() });
};

export const getPendingPartnerRequestsForCarrier = async (carrierId: string) => {
  const ref = collection(db, 'partnerRequests');
  const q = query(ref, where('carrierId', '==', carrierId), where('status', '==', 'pending'));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PartnerRequest[];
};

export const getPartnerRequestsForLoadOrPO = async (carrierId: string, poNumber: string, loadId?: string) => {
  const ref = collection(db, 'partnerRequests');
  let q = query(ref, where('carrierId', '==', carrierId), where('poNumber', '==', poNumber));
  if (loadId) {
    q = query(ref, where('carrierId', '==', carrierId), where('poNumber', '==', poNumber), where('loadId', '==', loadId));
  }
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PartnerRequest[];
}; 