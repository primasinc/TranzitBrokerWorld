import { db } from '../config/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

const DEFAULT_LOCATION: [number, number] = [-87.6298, 41.8781]; // Chicago

function isValidLocation(loc: any): loc is [number, number] {
  return Array.isArray(loc) && loc.length === 2 &&
    typeof loc[0] === 'number' && typeof loc[1] === 'number';
}

export async function getCarrierLocation(userId?: string): Promise<[number, number]> {
  return new Promise((resolve) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const loc: [number, number] = [position.coords.longitude, position.coords.latitude];
          console.log('[getCarrierLocation] Device location found:', loc);
          if (userId) {
            try {
              await updateDoc(doc(db, 'users', userId), { lastLocation: loc });
            } catch {}
          }
          resolve(loc);
        },
        async (error) => {
          console.log('[getCarrierLocation] Device location error:', error);
          if (userId) {
            try {
              const userDoc = await getDoc(doc(db, 'users', userId));
              const lastLocation = userDoc.data()?.lastLocation;
              if (isValidLocation(lastLocation)) {
                console.log('[getCarrierLocation] Using Firestore lastLocation:', lastLocation);
                resolve(lastLocation);
                return;
              }
            } catch {}
          }
          console.log('[getCarrierLocation] Using default location (Chicago):', DEFAULT_LOCATION);
          resolve(DEFAULT_LOCATION);
        }
      );
    } else {
      (async () => {
        if (userId) {
          try {
            const userDoc = await getDoc(doc(db, 'users', userId));
            const lastLocation = userDoc.data()?.lastLocation;
            if (isValidLocation(lastLocation)) {
              console.log('[getCarrierLocation] Using Firestore lastLocation:', lastLocation);
              resolve(lastLocation);
              return;
            }
          } catch {}
        }
        console.log('[getCarrierLocation] Using default location (Chicago):', DEFAULT_LOCATION);
        resolve(DEFAULT_LOCATION);
      })();
    }
  });
} 