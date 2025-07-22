import { useEffect, useState, useCallback, useMemo } from 'react';
import { collection, getDocs, query, limit, startAfter, orderBy, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getAuth } from 'firebase/auth';
import { getApp } from 'firebase/app';

export interface AvailableLoad {
  id: string;
  title: string;
  pickupLocation: {
    address: string;
    position: [number, number];
  };
  deliveryLocation: {
    address: string;
    position: [number, number];
  };
  rate?: number;
  poNumber?: string;
  isMarketplace?: boolean;
  carrierId?: string; // Add carrierId to track if load has been accepted
  status?: string; // <-- add status here
  companyInfo?: any;
  // Add other fields as needed
}

// Cache for loads data
const loadsCache = new Map<string, { data: AvailableLoad[], timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function haversineDistance([lng1, lat1]: [number, number], [lng2, lat2]: [number, number]) {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c * 0.621371; // miles
}

function isNonEmptyString(val: any): val is string {
  return typeof val === 'string' && val.length > 0;
}

export function useAvailableLoads(
  carrierLocation: [number, number] | null, 
  radiusMiles: number = 100,
  pageSize: number = 20 // Increased for better UX
) {
  const [loads, setLoads] = useState<AvailableLoad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<any>(null);

  const cacheKey = `${carrierLocation?.join(',') || 'no-location'}-${radiusMiles}`;
  
  const getCachedData = useCallback(() => {
    const cached = loadsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }, [cacheKey]);

  // --- Switch to real-time updates with onSnapshot ---
  useEffect(() => {
    setLoading(true);
    const baseQuery = query(collection(db, 'loads'));
    const unsubscribe = onSnapshot(baseQuery, (snapshot) => {
      let allLoads: AvailableLoad[] = [];
      if (!snapshot.empty) {
        allLoads = snapshot.docs.map(doc => {
          const data = doc.data();
          console.log('[DEBUG] Raw load from Firestore:', data); // Debug log
          const mappedLoad: any = {
            id: doc.id,
            title: data.title || '—',
            pickupLocation: {
              address: data.pickupLocation?.address || '—',
              position: Array.isArray(data.pickupLocation?.position) && data.pickupLocation.position.length === 2 ? data.pickupLocation.position : [0, 0],
            },
            deliveryLocation: {
              address: data.deliveryLocation?.address || '—',
              position: Array.isArray(data.deliveryLocation?.position) && data.deliveryLocation.position.length === 2 ? data.deliveryLocation.position : [0, 0],
            },
            rate: typeof data.rate === 'number' ? data.rate : 0,
            poNumber: data.poNumber || '',
            isMarketplace: data.isMarketplace,
            companyInfo: data.companyInfo,
            status: data.status || 'open',
          };
          if (typeof data.carrierId !== 'undefined' && data.isMarketplace !== true) {
            mappedLoad.carrierId = data.carrierId;
          }
          return mappedLoad;
        });
      }
      console.log('[DEBUG] All loads fetched:', allLoads);
      
      // Validate data consistency
      const inconsistent = allLoads.filter(load => 
        (load.isMarketplace === true && 'carrierId' in load) ||
        (load.isMarketplace === false && !('carrierId' in load))
      );
      if (inconsistent.length > 0) {
        console.warn('[DATA INCONSISTENCY] Found loads with inconsistent flags:', inconsistent);
      }
      
      // Filter by status (exclude cancelled, completed, or rejected)
      let filtered = allLoads.filter(load => 
        !['cancelled', 'completed', 'rejected'].includes((load.status || '').toLowerCase())
      );
      console.log('[DEBUG] After status filter:', filtered);
      if (carrierLocation) {
        filtered = filtered.filter(load => {
          const dist = haversineDistance(carrierLocation, load.pickupLocation.position);
          return dist <= radiusMiles;
        });
        console.log('[DEBUG] After location filter:', filtered);
      }
      // Only require that load.poNumber exists (if at all)
      filtered = filtered.filter(load => !!load.poNumber);
      console.log('[DEBUG] After PO number filter:', filtered);
      setLoads(filtered);
      setLoading(false);
    }, (err) => {
      setError(err.message || 'Failed to fetch loads');
      setLoading(false);
    });
    return () => unsubscribe();
  }, [carrierLocation, radiusMiles, cacheKey]);

  // Load more function for pagination
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      // This part of the pagination logic needs to be re-evaluated with onSnapshot
      // For now, it will just re-fetch the entire list if new loads are added.
      // A more sophisticated approach would involve a separate listener for new loads.
      // For now, we'll keep the original fetchLoads logic, but it might not be accurate
      // with real-time updates if new loads are added.
      // The original fetchLoads function relied on lastDoc, which is no longer available
      // with onSnapshot. This needs to be addressed for proper pagination.
      // For now, we'll remove the pagination logic that relied on lastDoc.
      // If new loads are added, the entire list will be refetched.
      // This is a limitation of the current onSnapshot implementation for pagination.
      // A proper solution would involve a separate listener for new loads.
      // For now, we'll just set loading to false and remove the pagination logic
      // that relied on lastDoc.
      setLoading(false); // Ensure loading is false before re-fetching
      // The original fetchLoads function was removed, so we'll just set loading to false.
      // If new loads are added, the list will be refetched.
    }
  }, [loading, hasMore]); // Removed fetchLoads from dependencies

  // Initial load
  useEffect(() => {
    setLastDoc(null); // No longer needed with onSnapshot
    setHasMore(true); // No longer needed with onSnapshot
    // The initial fetchLoads(true) call is removed as it's now handled by onSnapshot.
    // If you need to fetch on mount, you might need a separate listener or a different approach.
  }, [carrierLocation, radiusMiles]);

  // Cleanup cache on unmount
  useEffect(() => {
    return () => {
      // Clean old cache entries
      const now = Date.now();
      for (const [key, value] of loadsCache.entries()) {
        if (now - value.timestamp > CACHE_DURATION) {
          loadsCache.delete(key);
        }
      }
    };
  }, []);

  return { loads, loading, error, hasMore, loadMore };
} 

/**
 * Returns the filtered marketplace loads, excluding those with matching partner requests or accepted loads.
 * @param availableLoads Array of loads from useAvailableLoads
 * @param partnerRequests Array of partner requests (with poNumber and loadId)
 */
export function getFilteredMarketplaceLoads(availableLoads: AvailableLoad[], partnerRequests: any[]): AvailableLoad[] {
  // Marketplace loads: isMarketplace: true, NO carrierId field at all
  return availableLoads.filter(load => {
    // Must be explicitly marketplace
    if (load.isMarketplace !== true) return false;
    // Must NOT have carrierId field at all
    if ('carrierId' in load) {
      console.warn('[DATA INCONSISTENCY] Marketplace load has carrierId field:', load);
      return false;
    }
    // Additional check: exclude loads that are partner requests
    if (partnerRequests && partnerRequests.length > 0) {
      const isPartnerRequest = partnerRequests.some(req => req.poNumber === load.poNumber);
      if (isPartnerRequest) {
        console.warn('[FILTER] Excluding partner request load from marketplace:', load);
        return false;
      }
    }
    return true;
  });
} 