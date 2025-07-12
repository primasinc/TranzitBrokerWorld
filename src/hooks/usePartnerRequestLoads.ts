import { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { PartnerRequest } from '../services/partnerRequestService';

/**
 * Hook to fetch authoritative load data for partner requests for the current carrier.
 * @returns { merged: { partnerRequest: any, load: any | null, po: any | null }[], loading: boolean, error: string | null }
 */
export function usePartnerRequestLoads() {
  const { user } = useAuth();
  const [merged, setMerged] = useState<{ partnerRequest: any, load: any | null, po: any | null }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchPartnerRequests() {
      if (!user || !user.uid) {
        setMerged([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const partnerRequestsQ = query(
          collection(db, 'partnerRequests'),
          where('carrierId', '==', user.uid),
          where('status', '==', 'pending')
        );
        const partnerRequestsSnap = await getDocs(partnerRequestsQ);
        const partnerRequests = partnerRequestsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const results: { partnerRequest: any, load: any | null, po: any | null }[] = [];
        for (const req of partnerRequests) {
          const partnerReq = req as PartnerRequest;
          const poNumber = partnerReq.poNumber;
          let load = null;
          let po = null;
          if (poNumber) {
            const loadQ = query(collection(db, 'loads'), where('poNumber', '==', poNumber));
            const loadSnap = await getDocs(loadQ);
            if (!loadSnap.empty) {
              load = loadSnap.docs[0].data();
            }
            const poQ = query(collection(db, 'purchaseOrders'), where('poNumber', '==', poNumber));
            const poSnap = await getDocs(poQ);
            if (!poSnap.empty) {
              po = poSnap.docs[0].data();
            }
          }
          results.push({ partnerRequest: partnerReq, load, po });
        }
        if (isMounted) setMerged(results);
      } catch (err) {
        if (isMounted) setError((err as Error).message || 'Unknown error');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchPartnerRequests();
    return () => { isMounted = false; };
  }, [user]);

  return { merged, loading, error };
} 