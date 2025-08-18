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
  serverTimestamp,
  setDoc
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
  outstandingPayments: number; // Total unpaid invoices
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
      outstandingPayments: calculateOutstandingPayments(loads),
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

// Calculate outstanding payments (unpaid invoices)
const calculateOutstandingPayments = (loads: BrokerLoad[]): number => {
  // For now, calculate based on loads that are completed but not paid
  // In production, this would connect to actual invoice/payment data
  const completedLoads = loads.filter(load => load.status === 'Completed');
  return completedLoads.reduce((sum, load) => sum + (load.cost || 0), 0);
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

// Update load status with real-time workflow (mirroring shipper functionality)
export const updateLoadStatus = async (
  loadId: string, 
  status: BrokerLoad['status'],
  additionalData?: {
    actualPickupTime?: Date;
    actualDeliveryTime?: Date;
    notes?: string;
    carrierId?: string;
  }
): Promise<void> => {
  try {
    const loadRef = doc(db, 'loads', loadId);
    
    // Get current load data to validate status transition
    const loadSnap = await getDoc(loadRef);
    if (!loadSnap.exists()) {
      throw new Error('Load not found');
    }
    
    const currentLoad = loadSnap.data();
    const currentStatus = currentLoad.status;
    
    // Validate status transition (mirroring shipper workflow)
    const validTransitions: { [key: string]: string[] } = {
      'Open': ['Carrier Pending', 'Cancelled'],
      'Carrier Pending': ['Active', 'Cancelled'],
      'Active': ['Completed', 'Delayed', 'Cancelled'],
      'Delayed': ['Active', 'Completed', 'Cancelled'],
      'Completed': [], // Terminal state
      'Cancelled': [] // Terminal state
    };
    
    if (!validTransitions[currentStatus]?.includes(status)) {
      throw new Error(`Invalid status transition from ${currentStatus} to ${status}`);
    }
    
    // Prepare update data
    const updateData: any = {
      status,
      updatedAt: serverTimestamp(),
    };
    
    // Add additional data if provided
    if (additionalData?.actualPickupTime) {
      updateData.actualPickupTime = additionalData.actualPickupTime;
    }
    if (additionalData?.actualDeliveryTime) {
      updateData.actualDeliveryTime = additionalData.actualDeliveryTime;
    }
    if (additionalData?.notes) {
      updateData.notes = additionalData.notes;
    }
    if (additionalData?.carrierId) {
      updateData.carrierId = additionalData.carrierId;
    }
    
    // Update load status
    await updateDoc(loadRef, updateData);
    
    // Synchronize with brokerPurchaseOrders collection (mirroring shipper behavior)
    if (currentLoad.poNumber) {
      const poQuery = query(
        collection(db, 'brokerPurchaseOrders'),
        where('poNumber', '==', currentLoad.poNumber)
      );
      const poSnapshot = await getDocs(poQuery);
      
      if (!poSnapshot.empty) {
        const poDoc = poSnapshot.docs[0];
        const poUpdateData: any = {
          updatedAt: serverTimestamp()
        };
        
        // Map load status to PO shipping schedule status (mirroring shipper)
        switch (status) {
          case 'Carrier Pending':
            poUpdateData.shippingScheduleStatus = 'Carrier Pending';
            break;
          case 'Active':
            poUpdateData.shippingScheduleStatus = 'Active';
            break;
          case 'Completed':
            poUpdateData.shippingScheduleStatus = 'Completed';
            poUpdateData.completedAt = serverTimestamp();
            break;
          case 'Cancelled':
            poUpdateData.shippingScheduleStatus = 'Cancelled';
            poUpdateData.cancelledAt = serverTimestamp();
            break;
        }
        
        await updateDoc(doc(db, 'brokerPurchaseOrders', poDoc.id), poUpdateData);
      }
    }
    
    // Create real-time notification for status change (mirroring shipper)
    const notificationData = {
      brokerId: currentLoad.brokerId,
      loadId,
      poNumber: currentLoad.poNumber,
      type: 'load_status_update',
      title: `Load Status Updated to ${status}`,
      message: `Load ${currentLoad.poNumber || loadId} status changed to ${status}`,
      status: 'unread',
      createdAt: serverTimestamp(),
      read: false
    };
    
    await addDoc(collection(db, 'notifications'), notificationData);
    
  } catch (error) {
    console.error('Error updating load status:', error);
    throw error;
  }
};

// Assign carrier to load with real-time workflow (mirroring shipper functionality)
export const assignCarrierToLoad = async (
  loadId: string, 
  carrierId: string,
  carrierData: any
): Promise<void> => {
  try {
    const batch = writeBatch(db);
    
    // Get current load data
    const loadRef = doc(db, 'loads', loadId);
    const loadSnap = await getDoc(loadRef);
    if (!loadSnap.exists()) {
      throw new Error('Load not found');
    }
    
    const currentLoad = loadSnap.data();
    
    // Update the load with carrier assignment
    batch.update(loadRef, {
      carrierId,
      carrier: carrierData,
      status: 'Carrier Pending',
      updatedAt: serverTimestamp(),
      assignedAt: serverTimestamp(),
      assignedBy: currentLoad.brokerId
    });

    // Synchronize with brokerPurchaseOrders collection (mirroring shipper)
    if (currentLoad.poNumber) {
      const poQuery = query(
        collection(db, 'brokerPurchaseOrders'),
        where('poNumber', '==', currentLoad.poNumber)
      );
      const poSnapshot = await getDocs(poQuery);
      
      if (!poSnapshot.empty) {
        const poDoc = poSnapshot.docs[0];
        batch.update(doc(db, 'brokerPurchaseOrders', poDoc.id), {
          shippingScheduleStatus: 'Carrier Pending',
          selectedCarrier: carrierData,
          updatedAt: serverTimestamp()
        });
      }
    }

    // Create notification for carrier (mirroring shipper notification system)
    const notificationRef = doc(collection(db, 'notifications'));
    batch.set(notificationRef, {
      recipientId: carrierId,
      carrierId,
      brokerId: currentLoad.brokerId,
      type: 'unified_load_request', // Use same type as shipper
      title: 'New Load Assignment from Broker',
      message: `You have been assigned load ${currentLoad.poNumber || loadId}`,
      loadId,
      poNumber: currentLoad.poNumber,
      status: 'pending',
      read: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      loadDetails: {
        pickupLocation: currentLoad.pickupLocation,
        deliveryLocation: currentLoad.deliveryLocation,
        rate: currentLoad.rate,
        weight: currentLoad.weight,
        dimensions: currentLoad.dimensions,
        poNumber: currentLoad.poNumber
      }
    });

    // Create notification for broker (mirroring shipper workflow)
    const brokerNotificationRef = doc(collection(db, 'notifications'));
    batch.set(brokerNotificationRef, {
      recipientId: currentLoad.brokerId,
      brokerId: currentLoad.brokerId,
      type: 'carrier_assigned',
      title: 'Carrier Assigned to Load',
      message: `${carrierData.companyName || carrierData.name} has been assigned to load ${currentLoad.poNumber || loadId}`,
      loadId,
      poNumber: currentLoad.poNumber,
      status: 'unread',
      read: false,
      createdAt: serverTimestamp()
    });

    await batch.commit();
    
    // Update load status to trigger real-time updates
    await updateLoadStatus(loadId, 'Carrier Pending');
    
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

// Real-time load tracking (mirroring shipper functionality)
export const subscribeToBrokerLoadTracking = (
  brokerId: string,
  callback: (loads: any[]) => void
) => {
  const loadsQuery = query(
    collection(db, 'loads'),
    where('brokerId', '==', brokerId),
    where('status', 'in', ['Active', 'Carrier Pending'])
  );

  return onSnapshot(loadsQuery, async (loadsSnapshot) => {
    const trackingData: any[] = [];

    for (const loadDoc of loadsSnapshot.docs) {
      try {
        // Get real-time tracking data for each load
        const trackingDoc = await getDoc(doc(db, 'loadTracking', loadDoc.id));
        if (trackingDoc.exists()) {
          const data = trackingDoc.data();
          const tracking = {
            loadId: trackingDoc.id,
            poNumber: loadDoc.data().poNumber,
            carrierId: data.carrierId,
            pickupLocation: data.pickupLocation || [0, 0],
            deliveryLocation: data.deliveryLocation || [0, 0],
            currentLocation: data.currentLocation || [0, 0],
            status: data.status || 'en_route',
            estimatedPickupTime: data.estimatedPickupTime?.toDate(),
            estimatedDeliveryTime: data.estimatedDeliveryTime?.toDate(),
            actualPickupTime: data.actualPickupTime?.toDate(),
            actualDeliveryTime: data.actualDeliveryTime?.toDate(),
            lastLocationUpdate: data.lastLocationUpdate?.toDate() || new Date(),
            loadStatus: loadDoc.data().status,
            carrier: loadDoc.data().carrier
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

// Update load tracking data (mirroring shipper tracking system)
export const updateLoadTracking = async (
  loadId: string,
  trackingData: {
    currentLocation?: [number, number];
    status?: string;
    estimatedPickupTime?: Date;
    estimatedDeliveryTime?: Date;
    actualPickupTime?: Date;
    actualDeliveryTime?: Date;
    notes?: string;
  }
): Promise<void> => {
  try {
    const trackingRef = doc(db, 'loadTracking', loadId);
    
    const updateData: any = {
      lastLocationUpdate: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    if (trackingData.currentLocation) {
      updateData.currentLocation = trackingData.currentLocation;
    }
    if (trackingData.status) {
      updateData.status = trackingData.status;
    }
    if (trackingData.estimatedPickupTime) {
      updateData.estimatedPickupTime = trackingData.estimatedPickupTime;
    }
    if (trackingData.estimatedDeliveryTime) {
      updateData.estimatedDeliveryTime = trackingData.estimatedDeliveryTime;
    }
    if (trackingData.actualPickupTime) {
      updateData.actualPickupTime = trackingData.actualPickupTime;
    }
    if (trackingData.actualDeliveryTime) {
      updateData.actualDeliveryTime = trackingData.actualDeliveryTime;
    }
    if (trackingData.notes) {
      updateData.notes = trackingData.notes;
    }

    await setDoc(trackingRef, updateData, { merge: true });
    
    // Create real-time notification for tracking update
    const loadSnap = await getDoc(doc(db, 'loads', loadId));
    if (loadSnap.exists()) {
      const loadData = loadSnap.data();
      const notificationData = {
        brokerId: loadData.brokerId,
        loadId,
        poNumber: loadData.poNumber,
        type: 'load_tracking_update',
        title: 'Load Tracking Updated',
        message: `Load ${loadData.poNumber || loadId} tracking has been updated`,
        status: 'unread',
        createdAt: serverTimestamp(),
        read: false
      };
      
      await addDoc(collection(db, 'notifications'), notificationData);
    }
    
  } catch (error) {
    console.error('Error updating load tracking:', error);
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

// ===== PHASE 2 PART 2: ADVANCED LOAD MANAGEMENT FEATURES =====

// Handle load rejection (mirroring shipper functionality)
export const handleLoadRejection = async (
  poNumber: string, 
  notificationId: string,
  rejectionReason?: string
): Promise<void> => {
  try {
    console.log('[handleLoadRejection] Processing rejection for poNumber:', poNumber, 'notificationId:', notificationId);
    
    // 1. Update load status to 'Open' and remove carrierId so broker can reassign
    const loadsQuery = query(
      collection(db, 'loads'), 
      where('poNumber', '==', poNumber)
    );
    const loadsSnap = await getDocs(loadsQuery);
    
    console.log('[handleLoadRejection] Found', loadsSnap.docs.length, 'loads for poNumber:', poNumber);
    
    for (const loadDoc of loadsSnap.docs) {
      await updateDoc(doc(db, 'loads', loadDoc.id), {
        status: 'Open', // Changed to 'Open' so broker can reassign
        carrierId: null, // Remove carrier assignment
        carrier: null, // Remove carrier data
        updatedAt: serverTimestamp(),
        rejectionReason: rejectionReason || 'Carrier rejected the load',
        rejectedAt: serverTimestamp()
      });
    }
    console.log('[handleLoadRejection] Load status updated to Open, carrierId removed');

    // 2. Update brokerPurchaseOrders status back to Active
    const poQuery = query(
      collection(db, 'brokerPurchaseOrders'), 
      where('poNumber', '==', poNumber)
    );
    const poSnap = await getDocs(poQuery);
    
    if (!poSnap.empty) {
      const poDoc = poSnap.docs[0];
      const poData = poDoc.data();
      
      await updateDoc(doc(db, 'brokerPurchaseOrders', poDoc.id), {
        status: 'Active',
        shippingScheduleStatus: 'Open',
        selectedCarrier: null, // Clear selected carrier
        updatedAt: serverTimestamp(),
        rejectionReason: rejectionReason || 'Carrier rejected the load',
        rejectedAt: serverTimestamp()
      });
      console.log('[handleLoadRejection] PO status updated to Active');
    }

    // 3. Create notification record for broker
    if (poSnap.docs[0]) {
      const poData = poSnap.docs[0].data();
      const brokerId = poData.brokerId;
      
      if (brokerId) {
        const brokerNotificationRef = collection(db, 'notifications');
        await addDoc(brokerNotificationRef, {
          brokerId: brokerId,
          recipientId: brokerId,
          poNumber: poNumber,
          status: 'declined',
          type: 'carrier_decline',
          message: `Carrier declined load for PO ${poNumber}. Please select a new carrier.`,
          rejectionReason: rejectionReason || 'Carrier rejected the load',
          read: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          requiresAction: true
        });
        console.log('[handleLoadRejection] Broker notification created');
      }
    }
    
    // 4. Mark the original notification as read
    if (notificationId) {
      try {
        await updateDoc(doc(db, 'notifications', notificationId), {
          read: true,
          updatedAt: serverTimestamp()
        });
      } catch (error) {
        console.warn('[handleLoadRejection] Could not mark notification as read:', error);
      }
    }
    
  } catch (error) {
    console.error('[handleLoadRejection] Error:', error);
    throw new Error(`Failed to handle load rejection: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Handle load modification (mirroring shipper functionality)
export const modifyLoad = async (
  loadId: string,
  modificationData: {
    pickupLocation?: any;
    deliveryLocation?: any;
    scheduledPickupTime?: Date;
    scheduledDeliveryTime?: Date;
    rate?: number;
    weight?: number;
    dimensions?: any;
    notes?: string;
  }
): Promise<void> => {
  try {
    const loadRef = doc(db, 'loads', loadId);
    const loadSnap = await getDoc(loadRef);
    
    if (!loadSnap.exists()) {
      throw new Error('Load not found');
    }
    
    const currentLoad = loadSnap.data();
    
    // Validate that load can be modified (not completed or cancelled)
    if (['Completed', 'Cancelled'].includes(currentLoad.status)) {
      throw new Error(`Cannot modify load in ${currentLoad.status} status`);
    }
    
    // Prepare update data
    const updateData: any = {
      updatedAt: serverTimestamp(),
      modifiedAt: serverTimestamp(),
      modificationHistory: currentLoad.modificationHistory || []
    };
    
    // Add modification to history
    const modification = {
      timestamp: serverTimestamp(),
      changes: modificationData,
      modifiedBy: currentLoad.brokerId
    };
    
    updateData.modificationHistory = [...updateData.modificationHistory, modification];
    
    // Add specific fields if provided
    if (modificationData.pickupLocation) {
      updateData.pickupLocation = modificationData.pickupLocation;
    }
    if (modificationData.deliveryLocation) {
      updateData.deliveryLocation = modificationData.deliveryLocation;
    }
    if (modificationData.scheduledPickupTime) {
      updateData.scheduledPickupTime = modificationData.scheduledPickupTime;
    }
    if (modificationData.scheduledDeliveryTime) {
      updateData.scheduledDeliveryTime = modificationData.scheduledDeliveryTime;
    }
    if (modificationData.rate) {
      updateData.rate = modificationData.rate;
    }
    if (modificationData.weight) {
      updateData.weight = modificationData.weight;
    }
    if (modificationData.dimensions) {
      updateData.dimensions = modificationData.dimensions;
    }
    if (modificationData.notes) {
      updateData.notes = modificationData.notes;
    }
    
    // Update load
    await updateDoc(loadRef, updateData);
    
    // Synchronize with brokerPurchaseOrders if PO exists
    if (currentLoad.poNumber) {
      const poQuery = query(
        collection(db, 'brokerPurchaseOrders'),
        where('poNumber', '==', currentLoad.poNumber)
      );
      const poSnapshot = await getDocs(poQuery);
      
      if (!poSnapshot.empty) {
        const poDoc = poSnapshot.docs[0];
        const poUpdateData: any = {
          updatedAt: serverTimestamp(),
          modifiedAt: serverTimestamp()
        };
        
        // Update PO fields that match load fields
        if (modificationData.pickupLocation) {
          poUpdateData.pickupLocation = modificationData.pickupLocation;
        }
        if (modificationData.deliveryLocation) {
          poUpdateData.deliveryLocation = modificationData.deliveryLocation;
        }
        if (modificationData.scheduledPickupTime) {
          poUpdateData.scheduledPickupTime = modificationData.scheduledPickupTime;
        }
        if (modificationData.scheduledDeliveryTime) {
          poUpdateData.scheduledDeliveryTime = modificationData.scheduledDeliveryTime;
        }
        if (modificationData.rate) {
          poUpdateData.rate = modificationData.rate;
        }
        if (modificationData.weight) {
          poUpdateData.weight = modificationData.weight;
        }
        if (modificationData.dimensions) {
          poUpdateData.dimensions = modificationData.dimensions;
        }
        
        await updateDoc(doc(db, 'brokerPurchaseOrders', poDoc.id), poUpdateData);
      }
    }
    
    // Create notification for carrier if assigned
    if (currentLoad.carrierId) {
      const carrierNotificationData = {
        recipientId: currentLoad.carrierId,
        carrierId: currentLoad.carrierId,
        brokerId: currentLoad.brokerId,
        loadId,
        poNumber: currentLoad.poNumber,
        type: 'load_modified',
        title: 'Load Modified',
        message: `Load ${currentLoad.poNumber || loadId} has been modified by the broker`,
        status: 'unread',
        read: false,
        createdAt: serverTimestamp(),
        modificationDetails: modificationData
      };
      
      await addDoc(collection(db, 'notifications'), carrierNotificationData);
    }
    
    // Create notification for broker
    const brokerNotificationData = {
      recipientId: currentLoad.brokerId,
      brokerId: currentLoad.brokerId,
      loadId,
      poNumber: currentLoad.poNumber,
      type: 'load_modified',
      title: 'Load Modified Successfully',
      message: `Load ${currentLoad.poNumber || loadId} has been modified`,
      status: 'unread',
      read: false,
      createdAt: serverTimestamp()
    };
    
    await addDoc(collection(db, 'notifications'), brokerNotificationData);
    
  } catch (error) {
    console.error('Error modifying load:', error);
    throw error;
  }
};

// Handle load cancellation (mirroring shipper functionality)
export const cancelLoad = async (
  loadId: string,
  cancellationReason?: string
): Promise<void> => {
  try {
    const loadRef = doc(db, 'loads', loadId);
    const loadSnap = await getDoc(loadRef);
    
    if (!loadSnap.exists()) {
      throw new Error('Load not found');
    }
    
    const currentLoad = loadSnap.data();
    
    // Validate that load can be cancelled
    if (['Completed', 'Cancelled'].includes(currentLoad.status)) {
      throw new Error(`Cannot cancel load in ${currentLoad.status} status`);
    }
    
    // Update load status to cancelled
    await updateDoc(loadRef, {
      status: 'Cancelled',
      cancelledAt: serverTimestamp(),
      cancellationReason: cancellationReason || 'Cancelled by broker',
      updatedAt: serverTimestamp()
    });
    
    // Synchronize with brokerPurchaseOrders
    if (currentLoad.poNumber) {
      const poQuery = query(
        collection(db, 'brokerPurchaseOrders'),
        where('poNumber', '==', currentLoad.poNumber)
      );
      const poSnapshot = await getDocs(poQuery);
      
      if (!poSnapshot.empty) {
        const poDoc = poSnapshot.docs[0];
        await updateDoc(doc(db, 'brokerPurchaseOrders', poDoc.id), {
          status: 'Cancelled',
          shippingScheduleStatus: 'Cancelled',
          cancelledAt: serverTimestamp(),
          cancellationReason: cancellationReason || 'Cancelled by broker',
          updatedAt: serverTimestamp()
        });
      }
    }
    
    // Create notification for carrier if assigned
    if (currentLoad.carrierId) {
      const carrierNotificationData = {
        recipientId: currentLoad.carrierId,
        carrierId: currentLoad.carrierId,
        brokerId: currentLoad.brokerId,
        loadId,
        poNumber: currentLoad.poNumber,
        type: 'load_cancelled',
        title: 'Load Cancelled',
        message: `Load ${currentLoad.poNumber || loadId} has been cancelled by the broker`,
        status: 'unread',
        read: false,
        createdAt: serverTimestamp(),
        cancellationReason: cancellationReason || 'Cancelled by broker'
      };
      
      await addDoc(collection(db, 'notifications'), carrierNotificationData);
    }
    
    // Create notification for broker
    const brokerNotificationData = {
      recipientId: currentLoad.brokerId,
      brokerId: currentLoad.brokerId,
      loadId,
      poNumber: currentLoad.poNumber,
      type: 'load_cancelled',
      title: 'Load Cancelled Successfully',
      message: `Load ${currentLoad.poNumber || loadId} has been cancelled`,
      status: 'unread',
      read: false,
      createdAt: serverTimestamp(),
      cancellationReason: cancellationReason || 'Cancelled by broker'
    };
    
    await addDoc(collection(db, 'notifications'), brokerNotificationData);
    
  } catch (error) {
    console.error('Error cancelling load:', error);
    throw error;
  }
};

// Get load performance analytics (mirroring shipper functionality)
export const getLoadPerformanceAnalytics = async (
  brokerId: string,
  timeRange: 'week' | 'month' | 'quarter' | 'year' = 'month'
): Promise<any> => {
  try {
    const now = new Date();
    let startDate: Date;
    
    // Calculate start date based on time range
    switch (timeRange) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        break;
      case 'quarter':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        break;
      case 'year':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    }
    
    // Query loads within time range
    const loadsQuery = query(
      collection(db, 'loads'),
      where('brokerId', '==', brokerId),
      where('createdAt', '>=', startDate)
    );
    
    const loadsSnapshot = await getDocs(loadsQuery);
    const loads = loadsSnapshot.docs.map(doc => doc.data());
    
    // Calculate performance metrics
    const totalLoads = loads.length;
    const completedLoads = loads.filter(load => load.status === 'Completed').length;
    const cancelledLoads = loads.filter(load => load.status === 'Cancelled').length;
    const activeLoads = loads.filter(load => 
      ['Active', 'Carrier Pending'].includes(load.status)
    ).length;
    
    // Calculate on-time delivery percentage
    const onTimeDeliveries = loads.filter(load => {
      if (load.status !== 'Completed') return false;
      if (!load.actualDeliveryTime || !load.scheduledDeliveryTime) return false;
      
      const actual = load.actualDeliveryTime.toDate();
      const scheduled = load.scheduledDeliveryTime.toDate();
      const delayHours = (actual.getTime() - scheduled.getTime()) / (1000 * 60 * 60);
      
      return delayHours <= 2; // 2 hours tolerance
    }).length;
    
    const onTimeDeliveryPercentage = completedLoads > 0 
      ? (onTimeDeliveries / completedLoads) * 100 
      : 0;
    
    // Calculate revenue metrics
    const totalRevenue = loads.reduce((sum, load) => sum + (load.rate || 0), 0);
    const averageLoadValue = totalLoads > 0 ? totalRevenue / totalLoads : 0;
    
    // Calculate carrier performance
    const carrierStats = new Map();
    loads.forEach(load => {
      if (load.carrierId) {
        if (!carrierStats.has(load.carrierId)) {
          carrierStats.set(load.carrierId, {
            totalLoads: 0,
            completedLoads: 0,
            onTimeDeliveries: 0,
            totalRevenue: 0
          });
        }
        
        const stats = carrierStats.get(load.carrierId);
        stats.totalLoads++;
        stats.totalRevenue += load.rate || 0;
        
        if (load.status === 'Completed') {
          stats.completedLoads++;
          
          if (load.actualDeliveryTime && load.scheduledDeliveryTime) {
            const actual = load.actualDeliveryTime.toDate();
            const scheduled = load.scheduledDeliveryTime.toDate();
            const delayHours = (actual.getTime() - scheduled.getTime()) / (1000 * 60 * 60);
            
            if (delayHours <= 2) {
              stats.onTimeDeliveries++;
            }
          }
        }
      }
    });
    
    // Convert carrier stats to array
    const carrierPerformance = Array.from(carrierStats.entries()).map(([carrierId, stats]: [string, any]) => ({
      carrierId,
      totalLoads: stats.totalLoads,
      completedLoads: stats.completedLoads,
      onTimeDeliveries: stats.onTimeDeliveries,
      onTimePercentage: stats.completedLoads > 0 ? (stats.onTimeDeliveries / stats.completedLoads) * 100 : 0,
      totalRevenue: stats.totalRevenue,
      averageLoadValue: stats.totalLoads > 0 ? stats.totalRevenue / stats.totalLoads : 0
    }));
    
    return {
      timeRange,
      totalLoads,
      completedLoads,
      cancelledLoads,
      activeLoads,
      onTimeDeliveries,
      onTimeDeliveryPercentage,
      totalRevenue,
      averageLoadValue,
      carrierPerformance,
      generatedAt: serverTimestamp()
    };
    
  } catch (error) {
    console.error('Error getting load performance analytics:', error);
    throw error;
  }
};

// ===== PHASE 2 PART 3: CARRIER MANAGEMENT & COMMUNICATION =====

// Get real-time carrier performance tracking (mirroring shipper functionality)
export const getCarrierPerformanceMetrics = async (
  brokerId: string,
  carrierId: string,
  timeRange: 'week' | 'month' | 'quarter' | 'year' = 'month'
): Promise<any> => {
  try {
    const now = new Date();
    let startDate: Date;
    
    // Calculate start date based on time range
    switch (timeRange) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        break;
      case 'quarter':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        break;
      case 'year':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    }
    
    // Query loads for this carrier within time range
    const loadsQuery = query(
      collection(db, 'loads'),
      where('brokerId', '==', brokerId),
      where('carrierId', '==', carrierId),
      where('createdAt', '>=', startDate)
    );
    
    const loadsSnapshot = await getDocs(loadsQuery);
    const loads = loadsSnapshot.docs.map(doc => doc.data());
    
    // Calculate carrier performance metrics
    const totalLoads = loads.length;
    const completedLoads = loads.filter(load => load.status === 'Completed').length;
    const activeLoads = loads.filter(load => 
      ['Active', 'Carrier Pending'].includes(load.status)
    ).length;
    const cancelledLoads = loads.filter(load => load.status === 'Cancelled').length;
    
    // Calculate on-time delivery percentage
    const onTimeDeliveries = loads.filter(load => {
      if (load.status !== 'Completed') return false;
      if (!load.actualDeliveryTime || !load.scheduledDeliveryTime) return false;
      
      const actual = load.actualDeliveryTime.toDate();
      const scheduled = load.scheduledDeliveryTime.toDate();
      const delayHours = (actual.getTime() - scheduled.getTime()) / (1000 * 60 * 60);
      
      return delayHours <= 2; // 2 hours tolerance
    }).length;
    
    const onTimeDeliveryPercentage = completedLoads > 0 
      ? (onTimeDeliveries / completedLoads) * 100 
      : 0;
    
    // Calculate load acceptance rate (loads assigned vs total offered)
    const assignedLoads = loads.filter(load => load.carrierId === carrierId).length;
    const loadAcceptanceRate = totalLoads > 0 ? (assignedLoads / totalLoads) * 100 : 0;
    
    // Calculate average response time (time from load offer to acceptance)
    const responseTimes: number[] = [];
    loads.forEach(load => {
      if (load.assignedAt && load.createdAt) {
        const assignedTime = load.assignedAt.toDate();
        const createdTime = load.createdAt.toDate();
        const responseTimeMinutes = (assignedTime.getTime() - createdTime.getTime()) / (1000 * 60);
        responseTimes.push(responseTimeMinutes);
      }
    });
    
    const averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
      : 0;
    
    // Calculate claim rate (loads with damage claims)
    const loadsWithClaims = loads.filter(load => 
      load.status === 'Completed' && load.damageClaims && load.damageClaims > 0
    ).length;
    
    const claimRate = completedLoads > 0 ? (loadsWithClaims / completedLoads) * 100 : 0;
    
    // Calculate revenue metrics
    const totalRevenue = loads.reduce((sum, load) => sum + (load.rate || 0), 0);
    const averageLoadValue = totalLoads > 0 ? totalRevenue / totalLoads : 0;
    
    // Calculate performance scores (0-100 scale, mirroring shipper system)
    const safetyScore = Math.max(0, 100 - (claimRate * 20)); // Higher claims = lower safety
    const reliabilityScore = Math.max(0, onTimeDeliveryPercentage); // On-time = reliability
    const communicationScore = Math.max(0, 100 - (averageResponseTime / 10)); // Faster response = better communication
    const overallScore = Math.round((safetyScore + reliabilityScore + communicationScore) / 3);
    
    return {
      carrierId,
      timeRange,
      totalLoads,
      completedLoads,
      activeLoads,
      cancelledLoads,
      onTimeDeliveries,
      onTimeDeliveryPercentage,
      loadAcceptanceRate,
      averageResponseTime: Math.round(averageResponseTime),
      claimRate,
      totalRevenue,
      averageLoadValue,
      performanceScores: {
        safetyScore: Math.round(safetyScore),
        reliabilityScore: Math.round(reliabilityScore),
        communicationScore: Math.round(communicationScore),
        overallScore
      },
      generatedAt: serverTimestamp()
    };
    
  } catch (error) {
    console.error('Error getting carrier performance metrics:', error);
    throw error;
  }
};

// Subscribe to real-time carrier performance updates (mirroring shipper functionality)
export const subscribeToCarrierPerformance = (
  brokerId: string,
  carrierId: string,
  callback: (metrics: any) => void
) => {
  const loadsQuery = query(
    collection(db, 'loads'),
    where('brokerId', '==', brokerId),
    where('carrierId', '==', carrierId)
  );
  
  return onSnapshot(loadsQuery, async (snapshot) => {
    try {
      const metrics = await getCarrierPerformanceMetrics(brokerId, carrierId, 'month');
      callback(metrics);
    } catch (error) {
      console.error('Error updating carrier performance metrics:', error);
    }
  });
};

// Add carrier rating and review (mirroring shipper functionality)
export const addCarrierRating = async (
  brokerId: string,
  carrierId: string,
  rating: number, // 1-5 scale
  review: string,
  loadId?: string
): Promise<void> => {
  try {
    // Validate rating
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }
    
    // Create rating document
    const ratingData = {
      brokerId,
      carrierId,
      rating,
      review,
      loadId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    await addDoc(collection(db, 'carrierRatings'), ratingData);
    
    // Update carrier's average rating
    await updateCarrierAverageRating(carrierId);
    
    // Create notification for carrier
    const notificationData = {
      recipientId: carrierId,
      carrierId,
      brokerId,
      type: 'rating_received',
      title: 'New Rating Received',
      message: `You received a ${rating}-star rating from a broker`,
      status: 'unread',
      read: false,
      createdAt: serverTimestamp(),
      rating,
      review
    };
    
    await addDoc(collection(db, 'notifications'), notificationData);
    
  } catch (error) {
    console.error('Error adding carrier rating:', error);
    throw error;
  }
};

// Update carrier's average rating (mirroring shipper functionality)
const updateCarrierAverageRating = async (carrierId: string): Promise<void> => {
  try {
    // Get all ratings for this carrier
    const ratingsQuery = query(
      collection(db, 'carrierRatings'),
      where('carrierId', '==', carrierId)
    );
    
    const ratingsSnapshot = await getDocs(ratingsQuery);
    const ratings = ratingsSnapshot.docs.map(doc => doc.data().rating);
    
    if (ratings.length > 0) {
      const averageRating = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
      
      // Update carrier profile with new average rating
      const carrierRef = doc(db, 'users', carrierId);
      await updateDoc(carrierRef, {
        rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
        updatedAt: serverTimestamp()
      });
    }
  } catch (error) {
    console.error('Error updating carrier average rating:', error);
  }
};

// Get carrier rating history (mirroring shipper functionality)
export const getCarrierRatingHistory = async (
  carrierId: string,
  limitCount: number = 50
): Promise<any[]> => {
  try {
    const ratingsQuery = query(
      collection(db, 'carrierRatings'),
      where('carrierId', '==', carrierId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    
    const ratingsSnapshot = await getDocs(ratingsQuery);
    return ratingsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
  } catch (error) {
    console.error('Error getting carrier rating history:', error);
    return [];
  }
};

// Send real-time message to carrier (mirroring shipper functionality)
export const sendMessageToCarrier = async (
  brokerId: string,
  carrierId: string,
  message: string,
  loadId?: string,
  messageType: 'general' | 'load_update' | 'urgent' = 'general'
): Promise<void> => {
  try {
    const messageData = {
      senderId: brokerId,
      senderType: 'broker',
      recipientId: carrierId,
      recipientType: 'carrier',
      message,
      messageType,
      loadId,
      status: 'unread',
      read: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    await addDoc(collection(db, 'messages'), messageData);
    
    // Create notification for carrier
    const notificationData = {
      recipientId: carrierId,
      carrierId,
      brokerId,
      type: 'message_received',
      title: 'New Message from Broker',
      message: `You have a new message: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`,
      status: 'unread',
      read: false,
      createdAt: serverTimestamp(),
      messageType,
      loadId
    };
    
    await addDoc(collection(db, 'notifications'), notificationData);
    
  } catch (error) {
    console.error('Error sending message to carrier:', error);
    throw error;
  }
};

// Subscribe to real-time messages with carrier (mirroring shipper functionality)
export const subscribeToCarrierMessages = (
  brokerId: string,
  carrierId: string,
  callback: (messages: any[]) => void
) => {
  const messagesQuery = query(
    collection(db, 'messages'),
    where('senderId', 'in', [brokerId, carrierId]),
    where('recipientId', 'in', [brokerId, carrierId]),
    orderBy('createdAt', 'desc')
  );
  
  return onSnapshot(messagesQuery, (snapshot) => {
    const messages = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(messages);
  });
};

// Update carrier availability and capacity (mirroring shipper functionality)
export const updateCarrierAvailability = async (
  carrierId: string,
  availabilityData: {
    status: 'online' | 'offline' | 'busy' | 'available';
    currentLocation?: [number, number];
    availableCapacity?: number; // in tons
    availableEquipment?: string[];
    nextAvailableDate?: Date;
    notes?: string;
  }
): Promise<void> => {
  try {
    const carrierRef = doc(db, 'users', carrierId);
    
    const updateData: any = {
      status: availabilityData.status,
      updatedAt: serverTimestamp(),
      lastActive: serverTimestamp()
    };
    
    if (availabilityData.currentLocation) {
      updateData.currentLocation = availabilityData.currentLocation;
    }
    if (availabilityData.availableCapacity) {
      updateData.availableCapacity = availabilityData.availableCapacity;
    }
    if (availabilityData.availableEquipment) {
      updateData.availableEquipment = availabilityData.availableEquipment;
    }
    if (availabilityData.nextAvailableDate) {
      updateData.nextAvailableDate = availabilityData.nextAvailableDate;
    }
    if (availabilityData.notes) {
      updateData.notes = availabilityData.notes;
    }
    
    await updateDoc(carrierRef, updateData);
    
    // Create notification for broker if carrier goes offline
    if (availabilityData.status === 'offline') {
      const notificationData = {
        recipientId: carrierId,
        carrierId,
        type: 'carrier_offline',
        title: 'Carrier Status Changed',
        message: 'Carrier has gone offline',
        status: 'unread',
        read: false,
        createdAt: serverTimestamp()
      };
      
      await addDoc(collection(db, 'notifications'), notificationData);
    }
    
  } catch (error) {
    console.error('Error updating carrier availability:', error);
    throw error;
  }
};

// Subscribe to real-time carrier availability updates (mirroring shipper functionality)
export const subscribeToCarrierAvailability = (
  carrierIds: string[],
  callback: (carriers: any[]) => void
) => {
  if (carrierIds.length === 0) {
    callback([]);
    return () => {};
  }
  
  const carriersQuery = query(
    collection(db, 'users'),
    where('__name__', 'in', carrierIds),
    where('role', '==', 'carrier')
  );
  
  return onSnapshot(carriersQuery, (snapshot) => {
    const carriers = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(carriers);
  });
};

// Get carrier service areas and preferences (mirroring shipper functionality)
export const getCarrierServiceAreas = async (carrierId: string): Promise<any> => {
  try {
    const carrierRef = doc(db, 'users', carrierId);
    const carrierSnap = await getDoc(carrierRef);
    
    if (!carrierSnap.exists()) {
      throw new Error('Carrier not found');
    }
    
    const carrierData = carrierSnap.data();
    
    return {
      serviceAreas: carrierData.serviceAreas || [],
      preferredLoadTypes: carrierData.preferredLoadTypes || [],
      minimumRate: carrierData.minimumRate || 0,
      preferredLaneRates: carrierData.preferredLaneRates || {},
      equipment: carrierData.equipment || [],
      insurance: carrierData.insurance || false,
      hazmat: carrierData.hazmat || false
    };
    
  } catch (error) {
    console.error('Error getting carrier service areas:', error);
    throw error;
  }
};

// Update carrier service areas and preferences (mirroring shipper functionality)
export const updateCarrierServiceAreas = async (
  carrierId: string,
  serviceData: {
    serviceAreas?: string[];
    preferredLoadTypes?: string[];
    minimumRate?: number;
    preferredLaneRates?: { [fromState: string]: { [toState: string]: number } };
    equipment?: string[];
    insurance?: boolean;
    hazmat?: boolean;
  }
): Promise<void> => {
  try {
    const carrierRef = doc(db, 'users', carrierId);
    
    const updateData: any = {
      updatedAt: serverTimestamp()
    };
    
    if (serviceData.serviceAreas) {
      updateData.serviceAreas = serviceData.serviceAreas;
    }
    if (serviceData.preferredLoadTypes) {
      updateData.preferredLoadTypes = serviceData.preferredLoadTypes;
    }
    if (serviceData.minimumRate) {
      updateData.minimumRate = serviceData.minimumRate;
    }
    if (serviceData.preferredLaneRates) {
      updateData.preferredLaneRates = serviceData.preferredLaneRates;
    }
    if (serviceData.equipment) {
      updateData.equipment = serviceData.equipment;
    }
    if (serviceData.insurance !== undefined) {
      updateData.insurance = serviceData.insurance;
    }
    if (serviceData.hazmat !== undefined) {
      updateData.hazmat = serviceData.hazmat;
    }
    
    await updateDoc(carrierRef, updateData);
    
  } catch (error) {
    console.error('Error updating carrier service areas:', error);
    throw error;
  }
};

// Data migration functions for collection optimization
export const migrateBrokerDataToOptimizedCollections = async (brokerId: string): Promise<{
  purchaseOrdersMigrated: number;
  loadsMigrated: number;
  invoicesMigrated: number;
  errors: string[];
}> => {
  const errors: string[] = [];
  let purchaseOrdersMigrated = 0;
  let loadsMigrated = 0;
  let invoicesMigrated = 0;

  try {
    // Migrate purchase orders from general collection to broker-specific
    const poQuery = query(
      collection(db, 'purchaseOrders'),
      where('brokerId', '==', brokerId)
    );
    const poSnapshot = await getDocs(poQuery);
    
    for (const doc of poSnapshot.docs) {
      try {
        const poData = doc.data();
        // Check if already exists in broker-specific collection
        const existingQuery = query(
          collection(db, 'brokerPurchaseOrders'),
          where('poNumber', '==', poData.poNumber),
          where('brokerId', '==', brokerId)
        );
        const existingSnapshot = await getDocs(existingQuery);
        
        if (existingSnapshot.empty) {
          // Add to broker-specific collection
          await addDoc(collection(db, 'brokerPurchaseOrders'), {
            ...poData,
            migratedAt: serverTimestamp(),
            originalCollection: 'purchaseOrders',
            originalDocId: doc.id
          });
          purchaseOrdersMigrated++;
        }
      } catch (error) {
        errors.push(`Failed to migrate PO ${doc.id}: ${error}`);
      }
    }

    // Migrate loads from general collection to broker-specific
    const loadsQuery = query(
      collection(db, 'loads'),
      where('brokerId', '==', brokerId)
    );
    const loadsSnapshot = await getDocs(loadsQuery);
    
    for (const doc of loadsSnapshot.docs) {
      try {
        const loadData = doc.data();
        // Check if already exists in broker-specific collection
        const existingQuery = query(
          collection(db, 'brokerLoads'),
          where('poNumber', '==', loadData.poNumber),
          where('brokerId', '==', brokerId)
        );
        const existingSnapshot = await getDocs(existingQuery);
        
        if (existingSnapshot.empty) {
          // Add to broker-specific collection
          await addDoc(collection(db, 'brokerLoads'), {
            ...loadData,
            migratedAt: serverTimestamp(),
            originalCollection: 'loads',
            originalDocId: doc.id
          });
          loadsMigrated++;
        }
      } catch (error) {
        errors.push(`Failed to migrate load ${doc.id}: ${error}`);
      }
    }

    // Migrate invoices from general collection to broker-specific
    const invoicesQuery = query(
      collection(db, 'invoices'),
      where('brokerId', '==', brokerId)
    );
    const invoicesSnapshot = await getDocs(invoicesQuery);
    
    for (const doc of invoicesSnapshot.docs) {
      try {
        const invoiceData = doc.data();
        // Check if already exists in broker-specific collection
        const existingQuery = query(
          collection(db, 'brokerInvoices'),
          where('invoiceNumber', '==', invoiceData.invoiceNumber),
          where('brokerId', '==', brokerId)
        );
        const existingSnapshot = await getDocs(existingQuery);
        
        if (existingSnapshot.empty) {
          // Add to broker-specific collection
          await addDoc(collection(db, 'brokerInvoices'), {
            ...invoiceData,
            migratedAt: serverTimestamp(),
            originalCollection: 'invoices',
            originalDocId: doc.id
          });
          invoicesMigrated++;
        }
      } catch (error) {
        errors.push(`Failed to migrate invoice ${doc.id}: ${error}`);
      }
    }

    return {
      purchaseOrdersMigrated,
      loadsMigrated,
      invoicesMigrated,
      errors
    };

  } catch (error) {
    console.error('Error during data migration:', error);
    throw error;
  }
};

// Verify data migration integrity
export const verifyDataMigrationIntegrity = async (brokerId: string): Promise<{
  purchaseOrdersMatch: boolean;
  loadsMatch: boolean;
  invoicesMatch: boolean;
  details: {
    generalPOs: number;
    brokerPOs: number;
    generalLoads: number;
    brokerLoads: number;
    generalInvoices: number;
    brokerInvoices: number;
  };
}> => {
  try {
    // Count documents in general collections
    const generalPOQuery = query(
      collection(db, 'purchaseOrders'),
      where('brokerId', '==', brokerId)
    );
    const generalPOSnapshot = await getDocs(generalPOQuery);
    const generalPOs = generalPOSnapshot.size;

    const generalLoadsQuery = query(
      collection(db, 'loads'),
      where('brokerId', '==', brokerId)
    );
    const generalLoadsSnapshot = await getDocs(generalLoadsQuery);
    const generalLoads = generalLoadsSnapshot.size;

    const generalInvoicesQuery = query(
      collection(db, 'invoices'),
      where('brokerId', '==', brokerId)
    );
    const generalInvoicesSnapshot = await getDocs(generalInvoicesQuery);
    const generalInvoices = generalInvoicesSnapshot.size;

    // Count documents in broker-specific collections
    const brokerPOQuery = query(
      collection(db, 'brokerPurchaseOrders'),
      where('brokerId', '==', brokerId)
    );
    const brokerPOSnapshot = await getDocs(brokerPOQuery);
    const brokerPOs = brokerPOSnapshot.size;

    const brokerLoadsQuery = query(
      collection(db, 'brokerLoads'),
      where('brokerId', '==', brokerId)
    );
    const brokerLoadsSnapshot = await getDocs(brokerLoadsQuery);
    const brokerLoads = brokerLoadsSnapshot.size;

    const brokerInvoicesQuery = query(
      collection(db, 'brokerInvoices'),
      where('brokerId', '==', brokerId)
    );
    const brokerInvoicesSnapshot = await getDocs(brokerInvoicesQuery);
    const brokerInvoices = brokerInvoicesSnapshot.size;

    return {
      purchaseOrdersMatch: generalPOs === brokerPOs,
      loadsMatch: generalLoads === brokerLoads,
      invoicesMatch: generalInvoices === brokerInvoices,
      details: {
        generalPOs,
        brokerPOs,
        generalLoads,
        brokerLoads,
        generalInvoices,
        brokerInvoices
      }
    };

  } catch (error) {
    console.error('Error verifying data migration integrity:', error);
    throw error;
  }
};

// ===== PHASE 2 PART 4: INVOICE & PAYMENT INTEGRATION =====

// Generate broker invoice (mirroring shipper invoice generation)
export const generateBrokerInvoice = async (
  brokerId: string,
  loadId: string,
  invoiceData: {
    invoiceNumber: string;
    amount: number;
    poNumber: string;
    carrierId: string;
    carrierName: string;
    issueDate: Date;
    dueDate: Date;
    description?: string;
    terms?: string;
  }
): Promise<string> => {
  try {
    const invoiceRef = await addDoc(collection(db, 'brokerInvoices'), {
      brokerId,
      loadId,
      ...invoiceData,
      status: 'Pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      paymentHistory: [],
      factoringStatus: 'not_requested'
    });

    // Create notification for broker
    const notificationData = {
      recipientId: brokerId,
      brokerId,
      type: 'invoice_generated',
      title: 'Invoice Generated',
      message: `Invoice ${invoiceData.invoiceNumber} has been generated for load ${invoiceData.poNumber}`,
      status: 'unread',
      read: false,
      createdAt: serverTimestamp(),
      invoiceId: invoiceRef.id,
      loadId
    };
    
    await addDoc(collection(db, 'notifications'), notificationData);

    return invoiceRef.id;
  } catch (error) {
    console.error('Error generating broker invoice:', error);
    throw error;
  }
};

// Send invoice to shipper (mirroring shipper payment workflow)
export const sendInvoiceToShipper = async (
  invoiceId: string,
  shipperId: string
): Promise<void> => {
  try {
    const invoiceRef = doc(db, 'brokerInvoices', invoiceId);
    
    await updateDoc(invoiceRef, {
      shipperId,
      status: 'Sent',
      sentAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Create notification for shipper
    const notificationData = {
      recipientId: shipperId,
      brokerId: (await getDoc(invoiceRef)).data()?.brokerId,
      type: 'invoice_received',
      title: 'New Invoice Received',
      message: 'You have received a new invoice from your broker',
      status: 'unread',
      read: false,
      createdAt: serverTimestamp(),
      invoiceId
    };
    
    await addDoc(collection(db, 'notifications'), notificationData);
    
  } catch (error) {
    console.error('Error sending invoice to shipper:', error);
    throw error;
  }
};

// Request factoring for invoice (mirroring carrier factoring workflow)
export const requestFactoringForInvoice = async (
  invoiceId: string,
  factoringCompanyId: string,
  factoringData: {
    requestedAmount: number;
    terms: string;
    notes?: string;
  }
): Promise<void> => {
  try {
    const invoiceRef = doc(db, 'brokerInvoices', invoiceId);
    
    await updateDoc(invoiceRef, {
      factoringStatus: 'requested',
      factoringCompanyId,
      factoringRequestedAt: serverTimestamp(),
      factoringData,
      updatedAt: serverTimestamp()
    });

    // Create notification for broker
    const invoiceSnap = await getDoc(invoiceRef);
    if (invoiceSnap.exists()) {
      const invoiceData = invoiceSnap.data();
      const notificationData = {
        recipientId: invoiceData.brokerId,
        brokerId: invoiceData.brokerId,
        type: 'factoring_requested',
        title: 'Factoring Requested',
        message: `Factoring requested for invoice ${invoiceData.invoiceNumber}`,
        status: 'unread',
        read: false,
        createdAt: serverTimestamp(),
        invoiceId,
        factoringCompanyId
      };
      
      await addDoc(collection(db, 'notifications'), notificationData);
    }
    
  } catch (error) {
    console.error('Error requesting factoring for invoice:', error);
    throw error;
  }
};

// Update invoice payment status (mirroring shipper payment tracking)
export const updateInvoicePaymentStatus = async (
  invoiceId: string,
  paymentData: {
    status: 'Paid' | 'Pending' | 'Overdue' | 'Unpaid';
    amount?: number;
    paymentMethod?: string;
    transactionId?: string;
    notes?: string;
  }
): Promise<void> => {
  try {
    const invoiceRef = doc(db, 'brokerInvoices', invoiceId);
    const invoiceSnap = await getDoc(invoiceRef);
    
    if (!invoiceSnap.exists()) {
      throw new Error('Invoice not found');
    }
    
    const currentInvoice = invoiceSnap.data();
    const paymentHistory = currentInvoice.paymentHistory || [];
    
    // Add new payment record
    const newPayment = {
      timestamp: serverTimestamp(),
      status: paymentData.status,
      amount: paymentData.amount || currentInvoice.amount,
      paymentMethod: paymentData.paymentMethod,
      transactionId: paymentData.transactionId,
      notes: paymentData.notes
    };
    
    paymentHistory.push(newPayment);
    
    await updateDoc(invoiceRef, {
      status: paymentData.status,
      paymentHistory,
      updatedAt: serverTimestamp(),
      lastPaymentUpdate: serverTimestamp()
    });

    // Create notification for broker
    const notificationData = {
      recipientId: currentInvoice.brokerId,
      brokerId: currentInvoice.brokerId,
      type: 'payment_status_updated',
      title: 'Payment Status Updated',
      message: `Invoice ${currentInvoice.invoiceNumber} payment status updated to ${paymentData.status}`,
      status: 'unread',
      read: false,
      createdAt: serverTimestamp(),
      invoiceId,
      newStatus: paymentData.status
    };
    
    await addDoc(collection(db, 'notifications'), notificationData);
    
  } catch (error) {
    console.error('Error updating invoice payment status:', error);
    throw error;
  }
};

// Get broker invoice analytics (mirroring shipper payment analytics)
export const getBrokerInvoiceAnalytics = async (
  brokerId: string,
  timeRange: 'week' | 'month' | 'quarter' | 'year' = 'month'
): Promise<any> => {
  try {
    const now = new Date();
    let startDate: Date;
    
    // Calculate start date based on time range
    switch (timeRange) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        break;
      case 'quarter':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        break;
      case 'year':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    }
    
    // Query invoices within time range
    const invoicesQuery = query(
      collection(db, 'brokerInvoices'),
      where('brokerId', '==', brokerId),
      where('createdAt', '>=', startDate)
    );
    
    const invoicesSnapshot = await getDocs(invoicesQuery);
    const invoices = invoicesSnapshot.docs.map(doc => doc.data());
    
    // Calculate analytics
    const totalInvoices = invoices.length;
    const totalAmount = invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
    const paidInvoices = invoices.filter(inv => inv.status === 'Paid').length;
    const pendingInvoices = invoices.filter(inv => inv.status === 'Pending').length;
    const overdueInvoices = invoices.filter(inv => inv.status === 'Overdue').length;
    const unpaidInvoices = invoices.filter(inv => inv.status === 'Unpaid').length;
    
    const paidAmount = invoices
      .filter(inv => inv.status === 'Paid')
      .reduce((sum, inv) => sum + (inv.amount || 0), 0);
    
    const pendingAmount = invoices
      .filter(inv => inv.status === 'Pending')
      .reduce((sum, inv) => sum + (inv.amount || 0), 0);
    
    const overdueAmount = invoices
      .filter(inv => inv.status === 'Overdue')
      .reduce((sum, inv) => sum + (inv.amount || 0), 0);
    
    const unpaidAmount = invoices
      .filter(inv => inv.status === 'Unpaid')
      .reduce((sum, inv) => sum + (inv.amount || 0), 0);
    
    // Calculate factoring metrics
    const factoringRequested = invoices.filter(inv => inv.factoringStatus === 'requested').length;
    const factoringApproved = invoices.filter(inv => inv.factoringStatus === 'approved').length;
    
    return {
      timeRange,
      totalInvoices,
      totalAmount,
      paidInvoices,
      pendingInvoices,
      overdueInvoices,
      unpaidInvoices,
      paidAmount,
      pendingAmount,
      overdueAmount,
      unpaidAmount,
      factoringRequested,
      factoringApproved,
      collectionRate: totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0,
      averageInvoiceAmount: totalInvoices > 0 ? totalAmount / totalInvoices : 0,
      generatedAt: serverTimestamp()
    };
    
  } catch (error) {
    console.error('Error getting broker invoice analytics:', error);
    throw error;
  }
};

// Subscribe to real-time invoice updates (mirroring shipper payment tracking)
export const subscribeToBrokerInvoices = (
  brokerId: string,
  callback: (invoices: any[]) => void
) => {
  const invoicesQuery = query(
    collection(db, 'brokerInvoices'),
    where('brokerId', '==', brokerId),
    orderBy('createdAt', 'desc')
  );
  
  return onSnapshot(invoicesQuery, (snapshot) => {
    const invoices = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(invoices);
  });
};
