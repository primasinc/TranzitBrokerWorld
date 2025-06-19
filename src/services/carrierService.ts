import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  setDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { CarrierProfile, CarrierMetrics, CarrierDocument } from '../types/carrier';

const CARRIERS_COLLECTION = 'carriers';
const CARRIER_METRICS_COLLECTION = 'carrier_metrics';

// Mobile-optimized cache
const mobileCache = new Map<string, { data: any, timestamp: number }>();
const MOBILE_CACHE_DURATION = 3 * 60 * 1000; // 3 minutes for mobile

export const createCarrier = async (
  userId: string,
  carrierData: Omit<CarrierProfile, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'lastActive'>
): Promise<CarrierProfile> => {
  try {
    // Create a new carrier document with a generated ID
    const carrierRef = doc(collection(db, CARRIERS_COLLECTION));
    
    const now = Timestamp.now();
    const carrier: CarrierProfile = {
      id: carrierRef.id,
      userId,
      ...carrierData,
      createdAt: now,
      updatedAt: now,
      lastActive: now,
      // Initialize metrics
      totalLoads: 0,
      completedLoads: 0,
      onTimeDeliveries: 0,
      averageTransitTime: 0,
      averageResponseTime: 0,
      rating: 0
    };

    await setDoc(carrierRef, carrier, { merge: true });

    // Initialize carrier metrics
    const metricsRef = doc(db, CARRIER_METRICS_COLLECTION, carrier.id);
    const initialMetrics: CarrierMetrics = {
      carrierId: carrier.id,
      monthlyLoads: 0,
      monthlyMiles: 0,
      monthlyRevenue: 0,
      monthlyOnTimeRate: 0,
      totalLoads: 0,
      totalMiles: 0,
      totalRevenue: 0,
      averageLoadRate: 0,
      averageMileRate: 0,
      onTimeDeliveryRate: 0,
      safetyScore: 100,
      reliabilityScore: 100,
      communicationScore: 100,
      overallScore: 100,
      lastUpdated: now,
      lastLoad: now
    };

    await setDoc(metricsRef, initialMetrics);

    return carrier;
  } catch (error) {
    console.error('Error creating carrier:', error);
    throw error;
  }
};

export const getCarrier = async (carrierId: string): Promise<any | null> => {
  try {
    const carrierRef = doc(db, 'users', carrierId);
    const carrierSnap = await getDoc(carrierRef);
    if (carrierSnap.exists()) {
      return carrierSnap.data();
    }
    return null;
  } catch (error) {
    console.error('Error fetching carrier:', error);
    throw error;
  }
};

export const getCarrierByUserId = async (userId: string): Promise<CarrierProfile | null> => {
  try {
    const carriersQuery = query(
      collection(db, CARRIERS_COLLECTION),
      where('userId', '==', userId),
      limit(1)
    );
    
    const querySnapshot = await getDocs(carriersQuery);
    
    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].data() as CarrierProfile;
    }
    return null;
  } catch (error) {
    console.error('Error fetching carrier by user ID:', error);
    throw error;
  }
};

export const updateCarrier = async (
  carrierId: string,
  updates: Partial<CarrierProfile>
): Promise<void> => {
  try {
    const carrierRef = doc(db, CARRIERS_COLLECTION, carrierId);
    
    // Remove readonly fields from updates
    const { id, userId, createdAt, ...validUpdates } = updates;
    
    await updateDoc(carrierRef, {
      ...validUpdates,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error updating carrier:', error);
    throw error;
  }
};

export const getCarrierMetrics = async (carrierId: string): Promise<CarrierMetrics | null> => {
  try {
    const metricsRef = doc(db, CARRIER_METRICS_COLLECTION, carrierId);
    const metricsSnap = await getDoc(metricsRef);
    
    if (metricsSnap.exists()) {
      return metricsSnap.data() as CarrierMetrics;
    }
    return null;
  } catch (error) {
    console.error('Error fetching carrier metrics:', error);
    throw error;
  }
};

export const updateCarrierMetrics = async (
  carrierId: string,
  updates: Partial<CarrierMetrics>
): Promise<void> => {
  try {
    const metricsRef = doc(db, CARRIER_METRICS_COLLECTION, carrierId);
    
    await updateDoc(metricsRef, {
      ...updates,
      lastUpdated: Timestamp.now()
    });
  } catch (error) {
    console.error('Error updating carrier metrics:', error);
    throw error;
  }
};

export const searchCarriers = async (
  filters: {
    equipmentType?: string;
    serviceArea?: string;
    status?: string;
    searchTerm?: string;
  }
): Promise<CarrierProfile[]> => {
  try {
    let baseQuery = query(
      collection(db, CARRIERS_COLLECTION),
      orderBy('companyName')
    );

    if (filters.status) {
      baseQuery = query(
        baseQuery,
        where('status', '==', filters.status)
      );
    }

    const querySnapshot = await getDocs(baseQuery);
    let carriers = querySnapshot.docs.map(doc => doc.data() as CarrierProfile);

    // Apply additional filters in memory
    if (filters.equipmentType) {
      carriers = carriers.filter(carrier =>
        carrier.equipment.some(eq => eq.type === filters.equipmentType)
      );
    }

    if (filters.serviceArea) {
      carriers = carriers.filter(carrier =>
        carrier.serviceAreas.some(area => area.state === filters.serviceArea)
      );
    }

    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      carriers = carriers.filter(carrier =>
        carrier.companyName.toLowerCase().includes(searchLower) ||
        carrier.mcNumber.toLowerCase().includes(searchLower) ||
        carrier.dotNumber.toLowerCase().includes(searchLower)
      );
    }

    return carriers;
  } catch (error) {
    console.error('Error searching carriers:', error);
    throw error;
  }
};

export const addCarrierDocument = async (
  carrierId: string,
  document: Omit<CarrierDocument, 'id' | 'uploadedAt' | 'status'>
): Promise<CarrierDocument> => {
  try {
    const carrierRef = doc(db, CARRIERS_COLLECTION, carrierId);
    const carrierSnap = await getDoc(carrierRef);
    
    if (!carrierSnap.exists()) {
      throw new Error('Carrier not found');
    }
    
    const carrier = carrierSnap.data() as CarrierProfile;
    const newDocument: CarrierDocument = {
      id: `doc_${Date.now()}`,
      uploadedAt: Timestamp.now(),
      status: 'pending',
      ...document
    };
    
    await updateDoc(carrierRef, {
      documents: [...carrier.documents, newDocument],
      updatedAt: Timestamp.now()
    });
    
    return newDocument;
  } catch (error) {
    console.error('Error adding carrier document:', error);
    throw error;
  }
};

// Mobile-optimized carrier queries
export const getCarrierProfileMobile = async (userId: string): Promise<CarrierProfile | null> => {
  const cacheKey = `carrier_profile_${userId}`;
  const cached = mobileCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < MOBILE_CACHE_DURATION) {
    return cached.data;
  }

  try {
    const carriersQuery = query(
      collection(db, CARRIERS_COLLECTION),
      where('userId', '==', userId),
      limit(1)
    );
    
    const querySnapshot = await getDocs(carriersQuery);
    
    if (!querySnapshot.empty) {
      const data = querySnapshot.docs[0].data() as CarrierProfile;
      mobileCache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    }
    return null;
  } catch (error) {
    console.error('Error fetching carrier profile for mobile:', error);
    throw error;
  }
};

// Paginated carrier search for mobile
export const searchCarriersMobile = async (
  filters: {
    equipmentType?: string;
    serviceArea?: string;
    status?: string;
    searchTerm?: string;
  },
  pageSize: number = 10,
  lastDoc?: any
): Promise<{ carriers: CarrierProfile[], hasMore: boolean, lastDoc: any }> => {
  try {
    let baseQuery = query(
      collection(db, CARRIERS_COLLECTION),
      orderBy('companyName'),
      limit(pageSize)
    );

    if (lastDoc) {
      baseQuery = query(baseQuery, startAfter(lastDoc));
    }

    if (filters.status) {
      baseQuery = query(
        baseQuery,
        where('status', '==', filters.status)
      );
    }

    const querySnapshot = await getDocs(baseQuery);
    let carriers = querySnapshot.docs.map(doc => doc.data() as CarrierProfile);

    // Apply additional filters in memory (reduced for mobile)
    if (filters.equipmentType) {
      carriers = carriers.filter(carrier =>
        carrier.equipment?.some(eq => eq.type === filters.equipmentType)
      );
    }

    if (filters.serviceArea) {
      carriers = carriers.filter(carrier =>
        carrier.serviceAreas?.some(area => area.state === filters.serviceArea)
      );
    }

    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      carriers = carriers.filter(carrier =>
        carrier.companyName?.toLowerCase().includes(searchLower) ||
        carrier.mcNumber?.toLowerCase().includes(searchLower) ||
        carrier.dotNumber?.toLowerCase().includes(searchLower)
      );
    }

    return {
      carriers,
      hasMore: querySnapshot.docs.length === pageSize,
      lastDoc: querySnapshot.docs[querySnapshot.docs.length - 1]
    };
  } catch (error) {
    console.error('Error searching carriers for mobile:', error);
    throw error;
  }
};

// Real-time updates for mobile (optimized)
export const subscribeToCarrierUpdates = (
  carrierId: string,
  callback: (data: CarrierProfile) => void,
  errorCallback?: (error: Error) => void
): Unsubscribe => {
  const carrierRef = doc(db, CARRIERS_COLLECTION, carrierId);
  
  return onSnapshot(
    carrierRef,
    (doc) => {
      if (doc.exists()) {
        const data = doc.data() as CarrierProfile;
        // Update cache
        const cacheKey = `carrier_profile_${carrierId}`;
        mobileCache.set(cacheKey, { data, timestamp: Date.now() });
        callback(data);
      }
    },
    (error) => {
      console.error('Error in carrier subscription:', error);
      errorCallback?.(error);
    }
  );
};

// Mobile-optimized metrics fetch
export const getCarrierMetricsMobile = async (carrierId: string): Promise<CarrierMetrics | null> => {
  const cacheKey = `carrier_metrics_${carrierId}`;
  const cached = mobileCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < MOBILE_CACHE_DURATION) {
    return cached.data;
  }

  try {
    const metricsRef = doc(db, CARRIER_METRICS_COLLECTION, carrierId);
    const metricsSnap = await getDoc(metricsRef);
    
    if (metricsSnap.exists()) {
      const data = metricsSnap.data() as CarrierMetrics;
      mobileCache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    }
    return null;
  } catch (error) {
    console.error('Error fetching carrier metrics for mobile:', error);
    throw error;
  }
};

// Clear mobile cache
export const clearMobileCache = (): void => {
  mobileCache.clear();
};

// Clear specific cache entry
export const clearCacheEntry = (key: string): void => {
  mobileCache.delete(key);
}; 