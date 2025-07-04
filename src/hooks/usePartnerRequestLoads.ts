import { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Hook to fetch authoritative load data for partner request notifications.
 * @param partnerRequests Array of partner request notifications
 * @returns { merged: { notification: any, load: any | null }[], loading: boolean, error: string | null }
 */
export function usePartnerRequestLoads(partnerRequests: any[]) {
  const [merged, setMerged] = useState<{ notification: any, load: any | null }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchLoads() {
      setLoading(true);
      setError(null);
      try {
        const results: { notification: any, load: any | null }[] = [];
        for (const notification of partnerRequests) {
          const poNumber = notification.loadDetails?.poNumber || notification.poNumber;
          let load = null;
          if (poNumber) {
            const q = query(collection(db, 'loads'), where('poNumber', '==', poNumber));
            const snap = await getDocs(q);
            if (!snap.empty) {
              load = snap.docs[0].data();
            }
          }
          results.push({ notification, load });
        }
        if (isMounted) setMerged(results);
      } catch (err) {
        if (isMounted) setError((err as Error).message || 'Unknown error');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    if (partnerRequests && partnerRequests.length > 0) {
      fetchLoads();
    } else {
      setMerged([]);
    }
    return () => { isMounted = false; };
  }, [JSON.stringify(partnerRequests)]);

  return { merged, loading, error };
} 