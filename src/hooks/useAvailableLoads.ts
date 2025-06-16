import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
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
  // Add other fields as needed
}

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

export function useAvailableLoads(carrierLocation: [number, number] | null, radiusMiles: number = 100) {
  const [loads, setLoads] = useState<AvailableLoad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchLoads() {
      setLoading(true);
      setError(null);
      try {
        // Try to fetch from Firestore (replace 'loads' with your collection name)
        const snapshot = await getDocs(collection(db, 'loads'));
        let allLoads: AvailableLoad[] = [];
        if (!snapshot.empty) {
          allLoads = snapshot.docs.map(doc => {
            const data = doc.data();
            // Defensive: Only include loads with valid pickupLocation and deliveryLocation
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
        // Filter by valid purchase orders
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
        if (isMounted) setLoads(filtered);
      } catch (err: any) {
        if (isMounted) setError(err.message || 'Failed to fetch loads');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchLoads();
    return () => { isMounted = false; };
  }, [carrierLocation, radiusMiles]);

  return { loads, loading, error };
} 