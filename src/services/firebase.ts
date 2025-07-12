import app, { storage, auth, db } from '../config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export { 
  app as firebaseApp, 
  storage as firebaseStorage, 
  auth as firebaseAuth,
  db as firebaseDb 
}; 

/**
 * Fetch a purchase order by its poNumber from Firestore.
 * Returns the first matching PO or null if not found.
 */
export async function getPurchaseOrderByPONumber(poNumber: string) {
  if (!poNumber) return null;
  const poSnapshot = await getDocs(query(collection(db, 'purchaseOrders'), where('poNumber', '==', poNumber)));
  if (poSnapshot.empty) return null;
  return { id: poSnapshot.docs[0].id, ...poSnapshot.docs[0].data() };
} 