import { db, auth } from '../firebase';
import { 
  collection, 
  getDocs, 
  getDoc, 
  doc, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  limit,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';
import { BrokerLoad } from '../context/LoadsContext';

export interface BrokerMetrics {
  activeLoads: number;
  onTimeDelivery: number;
  averageCost: number;
  totalRevenue: number;
  carrierCount: number;
  loadCount: number;
  completedLoads: number;
  pendingLoads: number;
}

export interface BrokerNotification {
  id: string;
  brokerId: string;
  type: 'carrier_decline' | 'load_update' | 'carrier_accept' | 'payment_received' | 'system_alert';
  title: string;
  message: string;
  read: boolean;
  createdAt: any;
  relatedLoadId?: string;
  relatedCarrierId?: string;
  poNumber?: string;
}

export interface AvailableCarrier {
  id: string;
  companyName: string;
  rating: number;
  equipmentTypes: string[];
  location: [number, number];
  availableDate: string;
  status: 'online' | 'offline' | 'busy';
  eldApiKey?: string;
  insurance: boolean;
  hazmat: boolean;
  distance: number;
}

export interface RejectedLoad {
  id: string;
  poNumber: string;
  pickupLocation: string;
  deliveryLocation: string;
  rate: number;
  rejectionTime: Date;
  rejectionReason?: string;
  loadId: string;
  carrierId: string;
  carrierName: string;
}

// Subscribe to broker metrics in real-time
export const subscribeToBrokerMetrics = (
  brokerId: string, 
  callback: (metrics: BrokerMetrics) => void
) => {
  const loadsQuery = query(
    collection(db, 'loads'),
    where('brokerId', '==', brokerId)
  );

  return onSnapshot(loadsQuery, (snapshot) => {
    const loads = snapshot.docs.map(doc => doc.data() as BrokerLoad);
    
    const metrics: BrokerMetrics = {
      activeLoads: loads.filter(load => 
        load.status === 'Active' || load.status === 'Carrier Pending'
      ).length,
      onTimeDelivery: calculateOnTimeDelivery(loads),
      averageCost: calculateAverageCost(loads),
      totalRevenue: calculateTotalRevenue(loads),
      carrierCount: getUniqueCarrierCount(loads),
      loadCount: loads.length,
      completedLoads: loads.filter(load => load.status === 'Completed').length,
      pendingLoads: loads.filter(load => load.status === 'Open').length,
    };

    callback(metrics);
  });
};

// Calculate on-time delivery percentage
const calculateOnTimeDelivery = (loads: BrokerLoad[]): number => {
  const completedLoads = loads.filter(load => load.status === 'Completed');
  if (completedLoads.length === 0) return 0;

  // For now, assume all completed loads are on-time
  // In production, you'd check against actual delivery times
  const onTimeLoads = completedLoads.length;
  return (onTimeLoads / completedLoads.length) * 100;
};

// Calculate average cost per load
const calculateAverageCost = (loads: BrokerLoad[]): number => {
  if (loads.length === 0) return 0;
  const totalCost = loads.reduce((sum, load) => sum + (load.cost || 0), 0);
  return totalCost / loads.length;
};

// Calculate total revenue
const calculateTotalRevenue = (loads: BrokerLoad[]): number => {
  return loads.reduce((sum, load) => sum + (load.cost || 0), 0);
};

// Get unique carrier count
const getUniqueCarrierCount = (loads: BrokerLoad[]): number => {
  const carriers = new Set(loads.map(load => load.carrier).filter(carrier => carrier !== 'Unassigned'));
  return carriers.size;
};

// Fetch available carriers within radius
export const fetchAvailableCarriers = async (
  brokerLocation: [number, number], 
  radiusInMiles: number
): Promise<AvailableCarrier[]> => {
  try {
    const usersQuery = query(
      collection(db, 'users'),
      where('role', '==', 'carrier'),
      where('status', '==', 'online')
    );

    const snapshot = await getDocs(usersQuery);
    const carriers: AvailableCarrier[] = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.location && data.eldApiKey) {
        const distance = calculateDistance(brokerLocation, data.location);
        
        if (distance <= radiusInMiles) {
          carriers.push({
            id: doc.id,
            companyName: data.companyName || 'Unknown Carrier',
            rating: data.rating || 0,
            equipmentTypes: data.equipmentTypes || ['Dry Van'],
            location: data.location,
            availableDate: data.availableDate || new Date().toISOString(),
            status: data.status || 'offline',
            eldApiKey: data.eldApiKey,
            insurance: data.insurance || false,
            hazmat: data.hazmat || false,
            distance,
          });
        }
      }
    });

    // Sort by distance and rating
    return carriers.sort((a, b) => {
      if (a.distance !== b.distance) {
        return a.distance - b.distance;
      }
      return b.rating - a.rating;
    });
  } catch (error) {
    console.error('Error fetching available carriers:', error);
    return [];
  }
};

// Calculate distance between two points using Haversine formula
const calculateDistance = (
  point1: [number, number], 
  point2: [number, number]
): number => {
  const [lon1, lat1] = point1;
  const [lon2, lat2] = point2;
  
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Fetch rejected loads that need new carriers
export const fetchRejectedLoads = (
  brokerId: string,
  callback: (rejectedLoads: RejectedLoad[]) => void
) => {
  const notificationsQuery = query(
    collection(db, 'notifications'),
    where('brokerId', '==', brokerId),
    where('type', '==', 'carrier_decline'),
    where('read', '==', false)
  );

  return onSnapshot(notificationsQuery, async (snapshot) => {
    const rejectedLoadsData: RejectedLoad[] = [];

    for (const notificationDoc of snapshot.docs) {
      const notificationData = notificationDoc.data();

      if (notificationData.status !== 'declined') continue;

      if (notificationData.poNumber) {
        try {
          const loadQuery = query(
            collection(db, 'loads'),
            where('poNumber', '==', notificationData.poNumber),
            where('brokerId', '==', brokerId)
          );
          const loadSnapshot = await getDocs(loadQuery);

          if (!loadSnapshot.empty) {
            const loadData = loadSnapshot.docs[0].data();

            rejectedLoadsData.push({
              id: notificationDoc.id,
              poNumber: notificationData.poNumber,
              pickupLocation: loadData.pickupLocation?.cityStateZip || loadData.origin || 'Unknown',
              deliveryLocation: loadData.deliveryLocation?.cityStateZip || 'Unknown',
              rate: loadData.rate || loadData.total || 0,
              rejectionTime: notificationData.createdAt?.toDate() || new Date(),
              rejectionReason: notificationData.message || 'Carrier rejected the load',
              loadId: notificationData.loadId || '',
              carrierId: notificationData.carrierId || '',
              carrierName: notificationData.carrierName || 'Unknown Carrier',
            });
          }
        } catch (error) {
          console.error('[BrokerService] Error validating load for rejection:', error);
        }
      }
    }

    callback(rejectedLoadsData);
  });
};

// Create a new load
export const createLoad = async (loadData: Partial<BrokerLoad>): Promise<string> => {
  try {
    const brokerId = auth.currentUser?.uid;
    if (!brokerId) throw new Error('User not authenticated');

    const loadRef = await addDoc(collection(db, 'loads'), {
      ...loadData,
      brokerId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return loadRef.id;
  } catch (error) {
    console.error('Error creating load:', error);
    throw error;
  }
};

// Update load status
export const updateLoadStatus = async (
  loadId: string, 
  status: BrokerLoad['status']
): Promise<void> => {
  try {
    const loadRef = doc(db, 'loads', loadId);
    await updateDoc(loadRef, {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating load status:', error);
    throw error;
  }
};

// Assign carrier to load
export const assignCarrierToLoad = async (
  loadId: string, 
  carrierId: string,
  carrierData: any
): Promise<void> => {
  try {
    const batch = writeBatch(db);
    
    // Update the load
    const loadRef = doc(db, 'loads', loadId);
    batch.update(loadRef, {
      carrierId,
      carrier: carrierData,
      status: 'Carrier Pending',
      updatedAt: serverTimestamp(),
    });

    // Create notification for carrier
    const notificationRef = doc(collection(db, 'notifications'));
    batch.set(notificationRef, {
      carrierId,
      type: 'load_assignment',
      title: 'New Load Assignment',
      message: 'You have been assigned a new load',
      read: false,
      createdAt: serverTimestamp(),
      loadId,
    });

    await batch.commit();
  } catch (error) {
    console.error('Error assigning carrier to load:', error);
    throw error;
  }
};

// Get broker profile
export const getBrokerProfile = async (brokerId: string) => {
  try {
    const brokerRef = doc(db, 'users', brokerId);
    const brokerSnap = await getDoc(brokerRef);
    
    if (brokerSnap.exists()) {
      return brokerSnap.data();
    }
    return null;
  } catch (error) {
    console.error('Error getting broker profile:', error);
    throw error;
  }
};

// Update broker profile
export const updateBrokerProfile = async (
  brokerId: string, 
  profileData: any
): Promise<void> => {
  try {
    const brokerRef = doc(db, 'users', brokerId);
    await updateDoc(brokerRef, {
      ...profileData,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating broker profile:', error);
    throw error;
  }
};
