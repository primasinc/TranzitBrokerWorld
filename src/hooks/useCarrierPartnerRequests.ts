import { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

export interface PurchaseOrder {
  id?: string;
  poNumber?: string;
  status?: string;
  selectedCarrier?: { id: string };
  [key: string]: any;
}

export function useCarrierPartnerRequests() {
  const { user } = useAuth();
  const [partnerRequests, setPartnerRequests] = useState<{ po: PurchaseOrder, load: any }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !user.uid) {
      setPartnerRequests([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    async function fetchPartnerPOs() {
      if (!user || !user.uid) return;
      const posSnapshot = await getDocs(query(
        collection(db, 'purchaseOrders'),
        where('selectedCarrier.id', '==', user.uid),
        where('status', '==', 'Active')
      ));
      const pos: PurchaseOrder[] = posSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const requests: { po: PurchaseOrder, load: any }[] = [];
      for (const po of pos) {
        const loadSnap = await getDocs(query(collection(db, 'loads'), where('poNumber', '==', po.poNumber || '')));
        if (!loadSnap.empty) {
          requests.push({ po, load: loadSnap.docs[0].data() });
        }
      }
      setPartnerRequests(requests);
      setLoading(false);
    }
    fetchPartnerPOs();
  }, [user]);

  return { partnerRequests, loading };
} 