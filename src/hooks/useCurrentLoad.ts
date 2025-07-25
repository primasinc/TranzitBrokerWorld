import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

interface CurrentLoad {
  id: string;
  poNumber?: string;
  shipperName?: string;
  contact?: string;
  pickup: {
    location: string;
    time: string;
    status: string;
  };
  delivery: {
    location: string;
    time: string;
    status: string;
  };
  product: {
    description: string;
    size: string;
    weight: string;
  };
  notes?: string;
  payment?: number;
  status?: string;
}

export function useCurrentLoad() {
  const { user } = useAuth();
  const [currentLoad, setCurrentLoad] = useState<CurrentLoad | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) {
      setCurrentLoad(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    
    // Query for active or in_progress loads for this carrier
    const loadsQuery = query(
      collection(db, 'loads'),
      where('carrierId', '==', user.uid),
      where('status', 'in', ['active', 'in_progress']),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      loadsQuery,
      (snapshot) => {
        if (snapshot.empty) {
          setCurrentLoad(null);
          setLoading(false);
          return;
        }

        // Get the most recent active load
        const loadDoc = snapshot.docs[0];
        const loadData = loadDoc.data();

        // Transform the load data to match the expected format
        const transformedLoad: CurrentLoad = {
          id: loadDoc.id,
          poNumber: loadData.poNumber || '',
          shipperName: loadData.shipper || loadData.companyInfo?.name || 'Unknown Shipper',
          contact: loadData.contact || 'Contact information not available',
          pickup: {
            location: loadData.pickup?.location || loadData.pickupLocation?.address || 'Pickup location not specified',
            time: loadData.pickup?.time || loadData.pickupLocation?.date || 'Pickup time not specified',
            status: loadData.pickup?.status || 'pending'
          },
          delivery: {
            location: loadData.delivery?.location || loadData.deliveryLocation?.address || 'Delivery location not specified',
            time: loadData.delivery?.time || loadData.deliveryLocation?.date || 'Delivery time not specified',
            status: loadData.delivery?.status || 'pending'
          },
          product: {
            description: loadData.productDescription || loadData.title || 'Product description not available',
            size: loadData.dimensions || loadData.size || 'Dimensions not specified',
            weight: loadData.weight ? `${loadData.weight} lbs` : 'Weight not specified'
          },
          notes: loadData.notes || loadData.specialInstructions || 'No special instructions',
          payment: loadData.payment || loadData.rate || 0,
          status: loadData.status || 'active'
        };

        setCurrentLoad(transformedLoad);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching current load:', error);
        setError('Failed to fetch current load');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  return { currentLoad, loading, error };
} 