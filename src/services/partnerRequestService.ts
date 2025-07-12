import { db } from '../config/firebase';
import { collection, addDoc, updateDoc, doc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';

export interface PartnerRequest {
  id?: string;
  poNumber: string;
  loadId: string;
  shipperId: string;
  carrierId: string;
  status?: 'pending' | 'accepted' | 'declined' | 'cancelled'; // Make optional
  createdAt: any;
  updatedAt: any;
  offer?: number; // Optional offer amount for make offer
  type?: string; // Optional type (e.g., 'make_offer')
}

export const createPartnerRequest = async (data: Omit<PartnerRequest, 'id' | 'createdAt' | 'updatedAt'>) => {
  const ref = collection(db, 'partnerRequests');
  const docRef = await addDoc(ref, {
    ...data,
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
};

export const updatePartnerRequestStatus = async (id: string, status: PartnerRequest['status']) => {
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