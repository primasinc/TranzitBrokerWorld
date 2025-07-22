import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { PartnerRequest, PartnerRequestStatus } from '../services/partnerRequestService';

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
    let unsubscribe: (() => void) | undefined;

    async function fetchPartnerRequests() {
      if (!user || !user.uid) {
        setMerged([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      
      try {
        // Use real-time listener for partner requests
        const partnerRequestsQ = query(
          collection(db, 'partnerRequests'),
          where('carrierId', '==', user.uid),
          where('status', '==', 'pending' as PartnerRequestStatus)
        );
        
        unsubscribe = onSnapshot(partnerRequestsQ, async (snapshot) => {
          if (!isMounted) return;
          
          const partnerRequests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          
          if (partnerRequests.length === 0) {
            setMerged([]);
            setLoading(false);
            return;
          }
          
          // Get all unique PO numbers for batch querying
          const poNumbers = [...new Set(partnerRequests.map(req => (req as any).poNumber))];
          
          // Fetch loads and POs in parallel for better performance
          const [loadsSnap, posSnap] = await Promise.all([
            getDocs(query(collection(db, 'loads'), where('poNumber', 'in', poNumbers))),
            getDocs(query(collection(db, 'purchaseOrders'), where('poNumber', 'in', poNumbers)))
          ]);
          
          // Create lookup maps for O(1) access
          const loadsMap = new Map();
          loadsSnap.docs.forEach(doc => {
            const data = doc.data() as any;
            loadsMap.set(data.poNumber, { id: doc.id, ...data });
          });
          
          const posMap = new Map();
          posSnap.docs.forEach(doc => {
            const data = doc.data() as any;
            posMap.set(data.poNumber, { id: doc.id, ...data });
          });
          
          // Build results using lookup maps
          const results = partnerRequests.map(req => ({
            partnerRequest: req,
            load: loadsMap.get((req as any).poNumber) || null,
            po: posMap.get((req as any).poNumber) || null
          }));
          
          // Filter out invalid partner requests (missing PO or load)
          const filteredResults = results.filter(({ partnerRequest, load, po }) => {
            return po && po.poNumber && load && load.pickupLocation && load.deliveryLocation &&
                   // Safety check: only include loads that are truly partnered (not marketplace)
                   // Partner loads must have isMarketplace: false AND carrierId field
                   load.isMarketplace === false && 'carrierId' in load && load.carrierId === user.uid &&
                   // Exclude loads that have been rejected (no carrierId or status is rejected)
                   load.carrierId && load.status !== 'rejected';
          });
          
          if (isMounted) {
            setMerged(filteredResults);
            setLoading(false);
          }
        }, (err) => {
          if (isMounted) {
            setError((err as Error).message || 'Unknown error');
            setLoading(false);
          }
        });
        
      } catch (err) {
        if (isMounted) {
          setError((err as Error).message || 'Unknown error');
          setLoading(false);
        }
      }
    }
    
    fetchPartnerRequests();
    
    return () => { 
      isMounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user]);

  return { merged, loading, error };
} 