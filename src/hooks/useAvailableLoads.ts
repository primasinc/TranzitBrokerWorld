import { useEffect, useState, useCallback, useMemo } from 'react';
import { collection, getDocs, query, limit, startAfter, orderBy, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getAuth } from 'firebase/auth';
import { getApp } from 'firebase/app';
console.log('FIREBASE PROJECT ID:', getApp().options.projectId);

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

  const fetchLoads = useCallback(async (isInitial: boolean = true) => {
    setLoading(true);
    
    try {
      // Check cache first
      const cachedData = getCachedData();
      if (cachedData && isInitial) {
        setLoads(cachedData.slice(0, pageSize));
        setHasMore(cachedData.length > pageSize);
        setLoading(false);
        return;
      }

      // Debug: Log current user authentication state before running query
      const auth = getAuth();
      console.log('[useAvailableLoads] Current user before query:', auth.currentUser);
      // TEMP: Fetch first 10 loads with no filters for debugging
      let baseQuery = query(
        collection(db, 'loads'),
        limit(10)
      );

      if (lastDoc && !isInitial) {
        baseQuery = query(baseQuery, startAfter(lastDoc));
      }

      let snapshot;
      try {
        snapshot = await getDocs(baseQuery);
      } catch (err) {
        throw err;
      }
      let allLoads: AvailableLoad[] = [];

      // Debug: Log raw Firestore docs
      console.log('[useAvailableLoads] RAW Firestore snapshot:', snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      if (!snapshot.empty) {
        allLoads = snapshot.docs.map(doc => {
          const data = doc.data();
          // Defensive mapping with fallbacks
          return {
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
            carrierId: data.carrierId,
            isMarketplace: true,
            companyInfo: data.companyInfo,
          } as AvailableLoad;
        });
        // Debug: Log mapped loads
        console.log('[useAvailableLoads] MAPPED loads:', allLoads);
        // Remove carrierId filtering - marketplace loads should not have carrierId at all
        // allLoads = allLoads.filter(load => !load.carrierId);
      } else {
        // Fallback to sample data if Firestore is empty
        allLoads = [
          {
            id: '1',
            title: 'Chicago to New York',
            pickupLocation: {
              address: '123 Main St, Chicago, IL',
              position: [-87.6298, 41.8781],
            },
            deliveryLocation: {
              address: '456 Oak St, New York, NY',
              position: [-74.0060, 40.7128],
            },
            rate: 3500,
            isMarketplace: true,
          },
          {
            id: '2',
            title: 'LA to San Francisco',
            pickupLocation: {
              address: '123 Main St, Los Angeles, CA',
              position: [-118.2437, 34.0522],
            },
            deliveryLocation: {
              address: '123 Main St, San Francisco, CA',
              position: [-122.4194, 37.7749],
            },
            rate: 1800,
            isMarketplace: true,
          },
        ];
      }

      // Restore radius filtering
      let filtered = allLoads;
      if (carrierLocation) {
        filtered = allLoads.filter(load => {
          const dist = haversineDistance(carrierLocation, load.pickupLocation.position);
          return dist <= radiusMiles;
        });
      }
      // Debug: Log after radius filtering
      console.log('[useAvailableLoads] After radius filter:', filtered);

      // Filter by valid purchase orders (only on initial load)
      if (isInitial) {
        const poSnapshot = await getDocs(collection(db, 'purchaseOrders'));
        const validPoNumbers = new Set<string>();
        poSnapshot.forEach(poDoc => {
          const poData = poDoc.data();
          const status = (poData.status || '').toLowerCase();
          if (status !== 'cancelled') {
            validPoNumbers.add(poData.poNumber);
          }
        });
        filtered = filtered.filter(load => load.poNumber && validPoNumbers.has(load.poNumber));
        // Debug: Log after PO filtering
        console.log('[useAvailableLoads] After PO filter:', filtered);
      }

      // Update state
      if (isInitial) {
        setLoads(filtered);
        // Cache the full dataset
        loadsCache.set(cacheKey, { data: filtered, timestamp: Date.now() });
      } else {
        setLoads(prev => [...prev, ...filtered]);
      }

      setHasMore(snapshot.docs.length === pageSize);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch loads');
    } finally {
      setLoading(false);
    }
  }, [carrierLocation, radiusMiles, pageSize, lastDoc, cacheKey, getCachedData, loading]);

  // Load more function for pagination
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchLoads(false);
    }
  }, [loading, hasMore, fetchLoads]);

  // Initial load
  useEffect(() => {
    setLastDoc(null);
    setHasMore(true);
    fetchLoads(true);
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
  const partnerRequestPoNumbers = new Set(partnerRequests.map((req: any) => req.loadDetails?.poNumber || req.poNumber).filter(Boolean));
  const partnerRequestLoadIds = new Set(partnerRequests.map((req: any) => req.loadId).filter(Boolean));
  const result = availableLoads.filter(load => {
    const res =
      load.isMarketplace === true &&
      load && load.pickupLocation && load.deliveryLocation && load.pickupLocation.address && load.deliveryLocation.address &&
      !partnerRequestPoNumbers.has(load.poNumber) &&
      !partnerRequestLoadIds.has(load.id);
      // Remove carrierId filtering - marketplace loads should not have carrierId at all
      // && !load.carrierId; // Exclude loads that have been accepted by a carrier
    if (!res) {
      console.log('FILTERED OUT:', {
        id: load.id,
        isMarketplace: load.isMarketplace,
        pickupLocation: load.pickupLocation,
        deliveryLocation: load.deliveryLocation,
        poNumber: load.poNumber,
        partnerRequestPoNumbers: Array.from(partnerRequestPoNumbers),
        partnerRequestLoadIds: Array.from(partnerRequestLoadIds),
        pickupLocationTruthy: !!load.pickupLocation,
        deliveryLocationTruthy: !!load.deliveryLocation,
        pickupAddressTruthy: !!(load.pickupLocation && load.pickupLocation.address),
        deliveryAddressTruthy: !!(load.deliveryLocation && load.deliveryLocation.address),
        isMarketplaceCheck: load.isMarketplace === true,
        poNumberCheck: !partnerRequestPoNumbers.has(load.poNumber),
        idCheck: !partnerRequestLoadIds.has(load.id),
        // Remove carrierId check from debug logging
        // carrierIdCheck: !load.carrierId,
      });
    }
    return res;
  });
  console.log('getFilteredMarketplaceLoads - result:', result);
  return result;
} 