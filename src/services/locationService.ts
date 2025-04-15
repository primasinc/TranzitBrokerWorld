import { 
  collection, 
  doc, 
  setDoc, 
  onSnapshot,
  Timestamp,
  GeoPoint,
  updateDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';

const LOCATIONS_COLLECTION = 'locations';

interface LocationUpdate {
  userId: string;
  position: [number, number]; // [longitude, latitude]
  heading?: number;
  speed?: number;
  accuracy?: number;
  timestamp: Timestamp;
  status: 'online' | 'offline' | 'inactive';
  lastHeartbeat: Timestamp;
}

export const locationService = {
  // Start tracking a user's location
  startTracking: (userId: string) => {
    if (!navigator.geolocation) {
      throw new Error('Geolocation is not supported by this browser.');
    }

    // Watch position and update Firestore
    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        try {
          const locationUpdate: LocationUpdate = {
            userId,
            position: [position.coords.longitude, position.coords.latitude],
            heading: position.coords.heading || undefined,
            speed: position.coords.speed || undefined,
            accuracy: position.coords.accuracy,
            timestamp: Timestamp.now(),
            status: 'online',
            lastHeartbeat: Timestamp.now()
          };

          const locationRef = doc(db, LOCATIONS_COLLECTION, userId);
          await setDoc(locationRef, locationUpdate, { merge: true });
        } catch (error) {
          console.error('Error updating location:', error);
        }
      },
      (error) => {
        console.error('Error getting location:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );

    // Start heartbeat to maintain online status
    const heartbeatInterval = setInterval(async () => {
      try {
        const locationRef = doc(db, LOCATIONS_COLLECTION, userId);
        await updateDoc(locationRef, {
          lastHeartbeat: Timestamp.now()
        });
      } catch (error) {
        console.error('Error updating heartbeat:', error);
      }
    }, 30000); // Every 30 seconds

    return () => {
      // Cleanup function
      navigator.geolocation.clearWatch(watchId);
      clearInterval(heartbeatInterval);
    };
  },

  // Stop tracking and mark as offline
  stopTracking: async (userId: string) => {
    try {
      const locationRef = doc(db, LOCATIONS_COLLECTION, userId);
      await updateDoc(locationRef, {
        status: 'offline',
        lastHeartbeat: Timestamp.now()
      });
    } catch (error) {
      console.error('Error stopping tracking:', error);
    }
  },

  // Subscribe to location updates for specific users
  subscribeToLocations: (userIds: string[], onUpdate: (locations: Record<string, LocationUpdate>) => void) => {
    const locationsRef = collection(db, LOCATIONS_COLLECTION);
    
    // Subscribe to location updates
    const unsubscribe = onSnapshot(
      locationsRef,
      (snapshot) => {
        const locations: Record<string, LocationUpdate> = {};
        
        snapshot.docs.forEach(doc => {
          if (userIds.includes(doc.id)) {
            const data = doc.data() as LocationUpdate;
            
            // Check if location update is stale (more than 2 minutes old)
            const now = Timestamp.now();
            const staleThreshold = 2 * 60; // 2 minutes in seconds
            
            if ((now.seconds - data.lastHeartbeat.seconds) > staleThreshold) {
              data.status = 'inactive';
            }
            
            locations[doc.id] = data;
          }
        });
        
        onUpdate(locations);
      },
      (error) => {
        console.error('Error subscribing to locations:', error);
      }
    );

    return unsubscribe;
  }
}; 