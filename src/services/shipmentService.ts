import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  updateDoc, 
  setDoc,
  deleteDoc,
  onSnapshot,
  Timestamp,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { ShipmentData, MetricsData, calculateMetrics } from '../types/shipment';

const SHIPMENTS_COLLECTION = 'shipments';
const METRICS_COLLECTION = 'metrics';

export const getShipperMetrics = async (shipperId: string): Promise<MetricsData | null> => {
  try {
    const metricsRef = doc(db, METRICS_COLLECTION, shipperId);
    const metricsSnap = await getDoc(metricsRef);
    
    if (metricsSnap.exists()) {
      return metricsSnap.data() as MetricsData;
    }
    return null;
  } catch (error) {
    console.error('Error fetching metrics:', error);
    return null;
  }
};

export const subscribeToShipperMetrics = (
  shipperId: string, 
  onUpdate: (metrics: MetricsData) => void
) => {
  const metricsRef = doc(db, METRICS_COLLECTION, shipperId);
  
  // Add error handling and retry logic
  const unsubscribe = onSnapshot(metricsRef, {
    next: (doc) => {
      if (doc.exists()) {
        console.log('Raw metrics data:', doc.data());
        onUpdate(doc.data() as MetricsData);
      } else {
        console.log('No metrics document exists, creating default metrics');
        // Initialize with default metrics if document doesn't exist
        const defaultMetrics: MetricsData = {
          shipperId,
          totalShipments: 0,
          completedShipments: 0,
          onTimeDeliveries: 0,
          totalCost: 0,
          onTimeDeliveryPercentage: 0,
          averageCostPerLoad: 0,
          lastUpdated: Timestamp.now()
        };
        setDoc(metricsRef, defaultMetrics);
      }
    },
    error: (error) => {
      console.error('Error in metrics subscription:', error);
      // Attempt to reconnect after 5 seconds
      setTimeout(() => subscribeToShipperMetrics(shipperId, onUpdate), 5000);
    }
  });
  
  return unsubscribe;
};

export const updateShipperMetrics = async (shipperId: string) => {
  try {
    // Get all shipments for this shipper
    const shipmentsQuery = query(
      collection(db, SHIPMENTS_COLLECTION),
      where('shipperId', '==', shipperId),
      orderBy('createdAt', 'desc'),
      limit(1000) // Limit to last 1000 shipments for performance
    );
    
    const shipmentsSnap = await getDocs(shipmentsQuery);
    const shipments = shipmentsSnap.docs.map(doc => doc.data() as ShipmentData);
    
    // Calculate new metrics
    const calculatedMetrics = calculateMetrics(shipments);
    
    // Update metrics document
    const metricsRef = doc(db, METRICS_COLLECTION, shipperId);
    await setDoc(metricsRef, {
      ...calculatedMetrics,
      shipperId,
      lastUpdated: Timestamp.now()
    }, { merge: true });
    
    return true;
  } catch (error) {
    console.error('Error updating metrics:', error);
    return false;
  }
};

// This function should be called whenever a shipment status changes
export const updateShipmentStatus = async (
  shipmentId: string,
  status: ShipmentData['status'],
  actualDelivery?: Date
) => {
  try {
    const shipmentRef = doc(db, SHIPMENTS_COLLECTION, shipmentId);
    const updateData: Partial<ShipmentData> = {
      status,
      updatedAt: Timestamp.now()
    };

    if (actualDelivery) {
      updateData.actualDelivery = Timestamp.fromDate(actualDelivery);
    }

    await updateDoc(shipmentRef, updateData);

    // Get the shipment to check shipper ID
    const shipmentSnap = await getDoc(shipmentRef);
    if (shipmentSnap.exists()) {
      const shipment = shipmentSnap.data() as ShipmentData;
      // Update metrics for this shipper
      await updateShipperMetrics(shipment.shipperId);
    }

    return true;
  } catch (error) {
    console.error('Error updating shipment status:', error);
    return false;
  }
};

export interface ShipmentFilters {
  startDate?: Date;
  endDate?: Date;
  status?: string;
  searchTerm?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface ShipmentQueryResult {
  shipments: ShipmentData[];
  totalCount: number;
  hasMore: boolean;
}

export const getShipperShipments = async (
  shipperId: string,
  filters: ShipmentFilters = {},
  pagination: PaginationParams = { page: 1, limit: 10 }
): Promise<ShipmentQueryResult> => {
  try {
    // Start with base query
    let baseQuery = query(
      collection(db, SHIPMENTS_COLLECTION),
      where('shipperId', '==', shipperId),
      orderBy('createdAt', 'desc')
    );

    // Apply status filter if provided
    if (filters.status) {
      baseQuery = query(
        baseQuery,
        where('status', '==', filters.status)
      );
    }

    // Get total count first
    const countSnapshot = await getDocs(baseQuery);
    const totalCount = countSnapshot.size;

    // Apply pagination
    const start = (pagination.page - 1) * pagination.limit;
    const paginatedQuery = query(
      baseQuery,
      limit(pagination.limit)
    );

    const shipmentsSnap = await getDocs(paginatedQuery);
    let shipments = shipmentsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ShipmentData[];

    // Apply date filters in memory
    if (filters.startDate) {
      const startTime = filters.startDate.getTime();
      shipments = shipments.filter(s => 
        s.scheduledPickup.toMillis() >= startTime
      );
    }
    if (filters.endDate) {
      const endTime = filters.endDate.getTime();
      shipments = shipments.filter(s => 
        s.scheduledPickup.toMillis() <= endTime
      );
    }

    // Apply search filter in memory if provided
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      shipments = shipments.filter(shipment => 
        (shipment.carrier?.name?.toLowerCase() || '').includes(searchLower) ||
        (shipment.origin?.toLowerCase() || '').includes(searchLower) ||
        (shipment.destination?.toLowerCase() || '').includes(searchLower) ||
        (shipment.poNumber?.toLowerCase() || '').includes(searchLower)
      );
    }

    return {
      shipments,
      totalCount,
      hasMore: start + shipments.length < totalCount
    };
  } catch (error) {
    console.error('Error fetching shipments:', error);
    return {
      shipments: [],
      totalCount: 0,
      hasMore: false
    };
  }
};

export const clearShipperData = async (shipperId: string): Promise<boolean> => {
  try {
    // Get all shipments for this shipper
    const shipmentsQuery = query(
      collection(db, SHIPMENTS_COLLECTION),
      where('shipperId', '==', shipperId)
    );
    
    const shipmentsSnap = await getDocs(shipmentsQuery);
    
    // Delete all shipments in batches
    const deletePromises = shipmentsSnap.docs.map(doc => 
      deleteDoc(doc.ref)
    );
    
    await Promise.all(deletePromises);
    
    // Reset metrics
    const metricsRef = doc(db, METRICS_COLLECTION, shipperId);
    await setDoc(metricsRef, {
      shipperId,
      totalShipments: 0,
      completedShipments: 0,
      onTimeDeliveries: 0,
      totalCost: 0,
      onTimeDeliveryPercentage: 0,
      averageCostPerLoad: 0,
      lastUpdated: Timestamp.now()
    });
    
    return true;
  } catch (error) {
    console.error('Error clearing shipper data:', error);
    return false;
  }
}; 