import { useEffect, useState, useCallback, useMemo } from 'react';
import { collection, getDocs, query, limit, startAfter, orderBy, where } from 'firebase/firestore';
import { db } from '../config/firebase';

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
  pageSize: number = 10
) {
  const [loads, setLoads] = useState<AvailableLoad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<any>(null);

  // Memoize cache key based on location and radius
  const cacheKey = useMemo(() => {
    if (!carrierLocation) return 'default';
    return `${carrierLocation[0]}-${carrierLocation[1]}-${radiusMiles}`;
  }, [carrierLocation, radiusMiles]);

  // Check cache first
  const getCachedData = useCallback(() => {
    const cached = loadsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }, [cacheKey]);

  // Fetch loads with pagination
  const fetchLoads = useCallback(async (isInitial: boolean = true) => {
    if (!isInitial) {
      setLoading(true);
    }
    
    try {
      // Check cache first
      const cachedData = getCachedData();
      if (cachedData && isInitial) {
        setLoads(cachedData.slice(0, pageSize));
        setHasMore(cachedData.length > pageSize);
        setLoading(false);
        return;
      }

      // Build query with pagination
      let baseQuery = query(
        collection(db, 'loads'),
        orderBy('createdAt', 'desc'),
        limit(pageSize)
      );

      if (lastDoc && !isInitial) {
        baseQuery = query(baseQuery, startAfter(lastDoc));
      }

      const snapshot = await getDocs(baseQuery);
      let allLoads: AvailableLoad[] = [];

      if (!snapshot.empty) {
        allLoads = snapshot.docs.map(doc => {
          const data = doc.data();
          if (
            data.pickupLocation &&
            typeof data.pickupLocation.address === 'string' &&
            Array.isArray(data.pickupLocation.position) &&
            data.pickupLocation.position.length === 2 &&
            data.deliveryLocation &&
            typeof data.deliveryLocation.address === 'string' &&
            Array.isArray(data.deliveryLocation.position) &&
            data.deliveryLocation.position.length === 2
          ) {
            return {
              id: doc.id,
              title: data.title,
              pickupLocation: data.pickupLocation,
              deliveryLocation: data.deliveryLocation,
              rate: typeof data.rate === 'number' ? data.rate : 0,
              poNumber: data.poNumber || '',
              isMarketplace: data.isMarketplace || true,
            } as AvailableLoad;
          } else {
            console.warn('Skipping malformed load:', doc.id, data);
            return null;
          }
        }).filter((l): l is AvailableLoad => l !== null);
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

      // Filter by radius if carrierLocation is available
      let filtered = allLoads;
      if (carrierLocation) {
        filtered = allLoads.filter(load => {
          const dist = haversineDistance(carrierLocation, load.pickupLocation.position);
          return dist <= radiusMiles;
        });
      }

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
      }
      // Filter out partner loads (only show marketplace loads)
      filtered = filtered.filter(load => load.isMarketplace === true);

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
  }, [carrierLocation, radiusMiles, pageSize, lastDoc, cacheKey, getCachedData]);

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