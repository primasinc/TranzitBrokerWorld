import { 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { auth } from '../config/firebase';

export interface CarrierNote {
  id?: string;
  poNumber: string; // Primary anchor - links to purchase order
  loadId: string; // Secondary reference - links to specific load
  userId: string; // Firebase Auth UID of the carrier
  carrierName: string;
  status: string;
  notes: string;
  timestamp: Timestamp;
  createdAt: Timestamp;
}

const CARRIER_NOTES_COLLECTION = 'carrierNotes';

export const carrierNotesService = {
  // Add a new carrier note
  addCarrierNote: async (note: Omit<CarrierNote, 'id' | 'timestamp' | 'createdAt'>): Promise<CarrierNote> => {
    try {
      // Validate authentication - use a more robust approach
      const currentUser = auth.currentUser;
      if (!currentUser || !currentUser.uid) {
        // If currentUser is null, the user might not be authenticated or there's a timing issue
        throw new Error('User not authenticated. Please log in again.');
      }

      // Ensure userId matches the authenticated user
      const authenticatedUserId = currentUser.uid;
      
      // Validate that the note has the correct userId
      if (!note.userId || note.userId !== authenticatedUserId) {
        console.warn('UserId mismatch or missing, using authenticated user ID:', { 
          providedUserId: note.userId, 
          authenticatedUserId: authenticatedUserId 
        });
      }

      const noteData = {
        ...note,
        userId: authenticatedUserId, // Ensure we use the authenticated user's ID
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp()
      };
      
      console.log('Creating carrier note with validated data:', noteData);
      
      const docRef = await addDoc(collection(db, CARRIER_NOTES_COLLECTION), noteData);
      
      // Create a temporary timestamp for the response
      const now = Timestamp.now();
      
      return {
        id: docRef.id,
        ...note,
        userId: authenticatedUserId,
        timestamp: now,
        createdAt: now
      };
    } catch (error) {
      console.error('Error adding carrier note:', error);
      throw new Error(`Failed to add carrier note: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // Get carrier notes for a specific load (by loadId)
  getCarrierNotesByLoadId: async (loadId: string): Promise<CarrierNote[]> => {
    try {
      const q = query(
        collection(db, CARRIER_NOTES_COLLECTION),
        where('loadId', '==', loadId),
        orderBy('timestamp', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const notes: CarrierNote[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        notes.push({
          id: doc.id,
          poNumber: data.poNumber,
          loadId: data.loadId,
          userId: data.userId,
          carrierName: data.carrierName,
          status: data.status,
          notes: data.notes,
          timestamp: data.timestamp || Timestamp.now(),
          createdAt: data.createdAt || Timestamp.now()
        });
      });
      
      return notes;
    } catch (error) {
      console.error('Error getting carrier notes:', error);
      // If it's an index error, try without ordering
      if (error instanceof Error && error.message.includes('index')) {
        try {
          console.log('Trying query without ordering due to missing index...');
          const q = query(
            collection(db, CARRIER_NOTES_COLLECTION),
            where('loadId', '==', loadId)
          );
          
          const querySnapshot = await getDocs(q);
          const notes: CarrierNote[] = [];
          
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            notes.push({
              id: doc.id,
              poNumber: data.poNumber,
              loadId: data.loadId,
              userId: data.userId,
              carrierName: data.carrierName,
              status: data.status,
              notes: data.notes,
              timestamp: data.timestamp || Timestamp.now(),
              createdAt: data.createdAt || Timestamp.now()
            });
          });
          
          // Sort manually
          notes.sort((a, b) => {
            let aTime = 0;
            let bTime = 0;
            
            if (a.timestamp instanceof Timestamp) {
              aTime = a.timestamp.toMillis();
            } else if (a.timestamp && typeof (a.timestamp as any).toDate === 'function') {
              aTime = (a.timestamp as any).toDate().getTime();
            } else if (a.timestamp && typeof a.timestamp === 'number') {
              aTime = a.timestamp;
            }
            
            if (b.timestamp instanceof Timestamp) {
              bTime = b.timestamp.toMillis();
            } else if (b.timestamp && typeof (b.timestamp as any).toDate === 'function') {
              bTime = (b.timestamp as any).toDate().getTime();
            } else if (b.timestamp && typeof b.timestamp === 'number') {
              bTime = b.timestamp;
            }
            
            return bTime - aTime;
          });
          
          return notes;
        } catch (fallbackError) {
          console.error('Fallback query also failed:', fallbackError);
          throw new Error(`Failed to get carrier notes: ${error.message}`);
        }
      }
      throw new Error(`Failed to get carrier notes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // Get carrier notes for a specific purchase order (by poNumber)
  getCarrierNotesByPoNumber: async (poNumber: string): Promise<CarrierNote[]> => {
    try {
      const q = query(
        collection(db, CARRIER_NOTES_COLLECTION),
        where('poNumber', '==', poNumber),
        orderBy('timestamp', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const notes: CarrierNote[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        notes.push({
          id: doc.id,
          poNumber: data.poNumber,
          loadId: data.loadId,
          userId: data.userId,
          carrierName: data.carrierName,
          status: data.status,
          notes: data.notes,
          timestamp: data.timestamp || Timestamp.now(),
          createdAt: data.createdAt || Timestamp.now()
        });
      });
      
      return notes;
    } catch (error) {
      console.error('Error getting carrier notes:', error);
      // If it's an index error, try without ordering
      if (error instanceof Error && error.message.includes('index')) {
        try {
          console.log('Trying query without ordering due to missing index...');
          const q = query(
            collection(db, CARRIER_NOTES_COLLECTION),
            where('poNumber', '==', poNumber)
          );
          
          const querySnapshot = await getDocs(q);
          const notes: CarrierNote[] = [];
          
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            notes.push({
              id: doc.id,
              poNumber: data.poNumber,
              loadId: data.loadId,
              userId: data.userId,
              carrierName: data.carrierName,
              status: data.status,
              notes: data.notes,
              timestamp: data.timestamp || Timestamp.now(),
              createdAt: data.createdAt || Timestamp.now()
            });
          });
          
          // Sort manually
          notes.sort((a, b) => {
            let aTime = 0;
            let bTime = 0;
            
            if (a.timestamp instanceof Timestamp) {
              aTime = a.timestamp.toMillis();
            } else if (a.timestamp && typeof (a.timestamp as any).toDate === 'function') {
              aTime = (a.timestamp as any).toDate().getTime();
            } else if (a.timestamp && typeof a.timestamp === 'number') {
              aTime = a.timestamp;
            }
            
            if (b.timestamp instanceof Timestamp) {
              bTime = b.timestamp.toMillis();
            } else if (b.timestamp && typeof (b.timestamp as any).toDate === 'function') {
              bTime = (b.timestamp as any).toDate().getTime();
            } else if (b.timestamp && typeof b.timestamp === 'number') {
              bTime = b.timestamp;
            }
            
            return bTime - aTime;
          });
          
          return notes;
        } catch (fallbackError) {
          console.error('Fallback query also failed:', fallbackError);
          throw new Error(`Failed to get carrier notes: ${error.message}`);
        }
      }
      throw new Error(`Failed to get carrier notes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  // Get carrier notes for a specific carrier (by userId)
  getCarrierNotesByUserId: async (userId: string): Promise<CarrierNote[]> => {
    try {
      const q = query(
        collection(db, CARRIER_NOTES_COLLECTION),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const notes: CarrierNote[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        notes.push({
          id: doc.id,
          poNumber: data.poNumber,
          loadId: data.loadId,
          userId: data.userId,
          carrierName: data.carrierName,
          status: data.status,
          notes: data.notes,
          timestamp: data.timestamp || Timestamp.now(),
          createdAt: data.createdAt || Timestamp.now()
        });
      });
      
      return notes;
    } catch (error) {
      console.error('Error getting carrier notes:', error);
      // If it's an index error, try without ordering
      if (error instanceof Error && error.message.includes('index')) {
        try {
          console.log('Trying query without ordering due to missing index...');
          const q = query(
            collection(db, CARRIER_NOTES_COLLECTION),
            where('userId', '==', userId)
          );
          
          const querySnapshot = await getDocs(q);
          const notes: CarrierNote[] = [];
          
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            notes.push({
              id: doc.id,
              poNumber: data.poNumber,
              loadId: data.loadId,
              userId: data.userId,
              carrierName: data.carrierName,
              status: data.status,
              notes: data.notes,
              timestamp: data.timestamp || Timestamp.now(),
              createdAt: data.createdAt || Timestamp.now()
            });
          });
          
          // Sort manually
          notes.sort((a, b) => {
            let aTime = 0;
            let bTime = 0;
            
            if (a.timestamp instanceof Timestamp) {
              aTime = a.timestamp.toMillis();
            } else if (a.timestamp && typeof (a.timestamp as any).toDate === 'function') {
              aTime = (a.timestamp as any).toDate().getTime();
            } else if (a.timestamp && typeof a.timestamp === 'number') {
              aTime = a.timestamp;
            }
            
            if (b.timestamp instanceof Timestamp) {
              bTime = b.timestamp.toMillis();
            } else if (b.timestamp && typeof (b.timestamp as any).toDate === 'function') {
              bTime = (b.timestamp as any).toDate().getTime();
            } else if (b.timestamp && typeof b.timestamp === 'number') {
              bTime = b.timestamp;
            }
            
            return bTime - aTime;
          });
          
          return notes;
        } catch (fallbackError) {
          console.error('Fallback query also failed:', fallbackError);
          throw new Error(`Failed to get carrier notes: ${error.message}`);
        }
      }
      throw new Error(`Failed to get carrier notes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
};
