import { db } from '../config/firebase';
import { collection, addDoc, updateDoc, doc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';

// Strict type definition for partner request statuses
export type PartnerRequestStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';

export interface PartnerRequest {
  id?: string;
  poNumber: string;
  loadId: string;
  shipperId: string;
  carrierId: string;
  status: PartnerRequestStatus; // Make required and strictly typed
  createdAt: any;
  updatedAt: any;
  offer?: number; // Optional offer amount for make offer
  type?: string; // Optional type (e.g., 'make_offer')
}

export const createPartnerRequest = async (data: Omit<PartnerRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => {
  const ref = collection(db, 'partnerRequests');
  const docRef = await addDoc(ref, {
    ...data,
    status: 'pending' as PartnerRequestStatus, // Explicitly set to pending
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
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