import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc,
  getDoc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface CarrierLocation {
  carrierId: string;
  companyName: string;
  currentLocation: [number, number]; // [longitude, latitude]
  lastUpdated: Date;
  status: 'online' | 'offline' | 'busy' | 'available';
  currentLoadId?: string;
  estimatedArrival?: Date;
  speed?: number; // mph
  heading?: number; // degrees
  fuelLevel?: number; // percentage
  eldProvider?: string;
  eldLastSync?: Date;
}

export interface LoadTrackingData {
  loadId: string;
  carrierId: string;
  pickupLocation: [number, number];
  deliveryLocation: [number, number];
  currentLocation: [number, number];
  status: 'en_route' | 'at_pickup' | 'at_delivery' | 'completed';
  estimatedPickupTime?: Date;
  estimatedDeliveryTime?: Date;
  actualPickupTime?: Date;
  actualDeliveryTime?: Date;
  lastLocationUpdate: Date;
}

/**
 * Subscribe to real-time carrier location updates
 */
export const subscribeToCarrierLocation = (
  carrierId: string,
  callback: (location: CarrierLocation | null) => void
) => {
  const locationRef = doc(db, 'carrierLocations', carrierId);
  
  return onSnapshot(locationRef, (doc) => {
    if (doc.exists()) {
      const data = doc.data();
      const location: CarrierLocation = {
        carrierId: doc.id,
        companyName: data.companyName || 'Unknown Carrier',
        currentLocation: data.currentLocation || [0, 0],
        lastUpdated: data.lastUpdated?.toDate() || new Date(),
        status: data.status || 'offline',
        currentLoadId: data.currentLoadId,
        estimatedArrival: data.estimatedArrival?.toDate(),
        speed: data.speed,
        heading: data.heading,
        fuelLevel: data.fuelLevel,
        eldProvider: data.eldProvider,
        eldLastSync: data.eldLastSync?.toDate()
      };
      callback(location);
    } else {
      callback(null);
    }
  });
};

/**
 * Subscribe to all active carrier locations for a broker
 */
export const subscribeToBrokerCarrierLocations = (
  brokerId: string,
  callback: (locations: CarrierLocation[]) => void
) => {
  // Get all carriers that are partners with this broker
  const partnersQuery = query(
    collection(db, 'users', brokerId, 'partners')
  );

  return onSnapshot(partnersQuery, async (partnersSnapshot) => {
    const carrierIds = partnersSnapshot.docs.map(doc => doc.id);
    const locations: CarrierLocation[] = [];

    // Get location data for each partner carrier
    for (const carrierId of carrierIds) {
      try {
        const locationDoc = await getDoc(doc(db, 'carrierLocations', carrierId));
        if (locationDoc.exists()) {
          const data = locationDoc.data();
          const location: CarrierLocation = {
            carrierId: locationDoc.id,
            companyName: data.companyName || 'Unknown Carrier',
            currentLocation: data.currentLocation || [0, 0],
            lastUpdated: data.lastUpdated?.toDate() || new Date(),
            status: data.status || 'offline',
            currentLoadId: data.currentLoadId,
            estimatedArrival: data.estimatedArrival?.toDate(),
            speed: data.speed,
            heading: data.heading,
            fuelLevel: data.fuelLevel,
            eldProvider: data.eldProvider,
            eldLastSync: data.eldLastSync?.toDate()
          };
          locations.push(location);
        }
      } catch (error) {
        console.error(`Error getting location for carrier ${carrierId}:`, error);
      }
    }

    callback(locations);
  });
};

/**
 * Subscribe to load tracking data for a specific load
 */
export const subscribeToLoadTracking = (
  loadId: string,
  callback: (tracking: LoadTrackingData | null) => void
) => {
  const trackingRef = doc(db, 'loadTracking', loadId);
  
  return onSnapshot(trackingRef, (doc) => {
    if (doc.exists()) {
      const data = doc.data();
      const tracking: LoadTrackingData = {
        loadId: doc.id,
        carrierId: data.carrierId,
        pickupLocation: data.pickupLocation || [0, 0],
        deliveryLocation: data.deliveryLocation || [0, 0],
        currentLocation: data.currentLocation || [0, 0],
        status: data.status || 'en_route',
        estimatedPickupTime: data.estimatedPickupTime?.toDate(),
        estimatedDeliveryTime: data.estimatedDeliveryTime?.toDate(),
        actualPickupTime: data.actualPickupTime?.toDate(),
        actualDeliveryTime: data.actualDeliveryTime?.toDate(),
        lastLocationUpdate: data.lastLocationUpdate?.toDate() || new Date()
      };
      callback(tracking);
    } else {
      callback(null);
    }
  });
};

/**
 * Subscribe to all active load tracking for a broker
 */
export const subscribeToBrokerLoadTracking = (
  brokerId: string,
  callback: (tracking: LoadTrackingData[]) => void
) => {
  const loadsQuery = query(
    collection(db, 'loads'),
    where('brokerId', '==', brokerId),
    where('status', 'in', ['Active', 'Carrier Pending'])
  );

  return onSnapshot(loadsQuery, async (loadsSnapshot) => {
    const trackingData: LoadTrackingData[] = [];

    for (const loadDoc of loadsSnapshot.docs) {
      try {
        const trackingDoc = await getDoc(doc(db, 'loadTracking', loadDoc.id));
        if (trackingDoc.exists()) {
          const data = trackingDoc.data();
          const tracking: LoadTrackingData = {
            loadId: trackingDoc.id,
            carrierId: data.carrierId,
            pickupLocation: data.pickupLocation || [0, 0],
            deliveryLocation: data.deliveryLocation || [0, 0],
            currentLocation: data.currentLocation || [0, 0],
            status: data.status || 'en_route',
            estimatedPickupTime: data.estimatedPickupTime?.toDate(),
            estimatedDeliveryTime: data.estimatedDeliveryTime?.toDate(),
            actualPickupTime: data.actualPickupTime?.toDate(),
            actualDeliveryTime: data.actualDeliveryTime?.toDate(),
            lastLocationUpdate: data.lastLocationUpdate?.toDate() || new Date()
          };
          trackingData.push(tracking);
        }
      } catch (error) {
        console.error(`Error getting tracking for load ${loadDoc.id}:`, error);
      }
    }

    callback(trackingData);
  });
};

/**
 * Update carrier location (called by ELD integration)
 */
export const updateCarrierLocation = async (
  carrierId: string,
  locationData: Partial<CarrierLocation>
): Promise<void> => {
  try {
    const locationRef = doc(db, 'carrierLocations', carrierId);
    await updateDoc(locationRef, {
      ...locationData,
      lastUpdated: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating carrier location:', error);
    throw error;
  }
};

/**
 * Update load tracking data
 */
export const updateLoadTracking = async (
  loadId: string,
  trackingData: Partial<LoadTrackingData>
): Promise<void> => {
  try {
    const trackingRef = doc(db, 'loadTracking', loadId);
    await updateDoc(trackingRef, {
      ...trackingData,
      lastLocationUpdate: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating load tracking:', error);
    throw error;
  }
};

/**
 * Get carrier's current location and status
 */
export const getCarrierCurrentStatus = async (carrierId: string): Promise<CarrierLocation | null> => {
  try {
    const locationDoc = await getDoc(doc(db, 'carrierLocations', carrierId));
    if (locationDoc.exists()) {
      const data = locationDoc.data();
      return {
        carrierId: locationDoc.id,
        companyName: data.companyName || 'Unknown Carrier',
        currentLocation: data.currentLocation || [0, 0],
        lastUpdated: data.lastUpdated?.toDate() || new Date(),
        status: data.status || 'offline',
        currentLoadId: data.currentLoadId,
        estimatedArrival: data.estimatedArrival?.toDate(),
        speed: data.speed,
        heading: data.heading,
        fuelLevel: data.fuelLevel,
        eldProvider: data.eldProvider,
        eldLastSync: data.eldLastSync?.toDate()
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting carrier status:', error);
    return null;
  }
};

/**
 * Calculate distance between two points using Haversine formula
 */
export const calculateDistance = (
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

/**
 * Calculate estimated time of arrival based on current location and speed
 */
export const calculateETA = (
  currentLocation: [number, number],
  destination: [number, number],
  speed: number // mph
): number => {
  if (speed <= 0) return 0;
  
  const distance = calculateDistance(currentLocation, destination);
  return distance / speed; // hours
};
