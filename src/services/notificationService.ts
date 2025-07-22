import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, getDoc, query, where, getDocs, setDoc } from 'firebase/firestore';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';

export interface LoadRequestNotification {
  id?: string;
  carrierId: string;
  shipperId: string;
  shippingScheduleId: string;
  loadId?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'counter_offer';
  loadDetails: {
    pickupLocation: {
      address: string;
      city: string;
      state: string;
      zipCode: string;
      date: string;
      time: string;
    };
    deliveryLocation: {
      address: string;
      city: string;
      state: string;
      zipCode: string;
      date: string;
      time: string;
    };
    dimensions: {
      length: number;
      width: number;
      height: number;
    };
    weight: number;
    rate: number;
    shipperCompany?: string;
    poNumber?: string;
    carrierOption?: string;
  };
  createdAt: any;
  updatedAt: any;
}

export const sendLoadRequestToCarrier = async (
  carrierId: string,
  shipperId: string,
  shippingScheduleId: string,
  loadDetails: LoadRequestNotification['loadDetails']
) => {
  // Fetch shipper profile for senderName
  let senderName = '';
  try {
    const shipperDoc = await getDoc(doc(db, 'users', shipperId));
    if (shipperDoc.exists()) {
      const shipperProfile = shipperDoc.data();
      senderName = shipperProfile.companyName || shipperProfile.displayName || '';
    }
  } catch (err) {
    console.error('[sendLoadRequestToCarrier] Error fetching shipper profile:', err);
  }

  const notificationRef = collection(db, 'notifications');
  const notificationData: Omit<LoadRequestNotification, 'id'> & { recipientId: string; type: string; message: string; senderName: string; read: boolean } = {
    carrierId,
    shipperId,
    recipientId: carrierId, // Ensure carrier receives the notification
    shippingScheduleId,
    status: 'pending',
    loadDetails,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    type: 'load_request',
    message: 'You have a new load request.',
    senderName,
    read: false
  };

  const docRef = await addDoc(notificationRef, notificationData);
  return docRef.id;
};

export const updateLoadRequestStatus = async (
  poNumber: string,
  status: LoadRequestNotification['status'],
  counterOffer?: number
) => {
  console.log('[updateLoadRequestStatus] Called with:', { poNumber, status, counterOffer });
  
  return new Promise((resolve, reject) => {
    const auth = getAuth();
    
    // Handle auth state changes properly for production
    const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
      unsubscribe(); // Clean up listener immediately
      
      if (!user?.uid) {
        reject(new Error('User not authenticated'));
        return;
      }
      
      try {
        const notificationsQuery = query(
          collection(db, 'notifications'),
          where('poNumber', '==', poNumber),
          where('carrierId', '==', user.uid),
          where('type', '==', 'partner_request')
        );
        
        const notificationsSnap = await getDocs(notificationsQuery);
        if (notificationsSnap.empty) {
          reject(new Error(`No notification found for PO ${poNumber} and carrier ${user.uid}`));
          return;
        }
        
        const notificationDoc = notificationsSnap.docs[0];
        const notificationRef = doc(db, 'notifications', notificationDoc.id);
        const currentData = notificationDoc.data() as LoadRequestNotification;
        
        if (!currentData) {
          reject(new Error('Notification data is null or undefined'));
          return;
        }
        
        const updateData: Partial<LoadRequestNotification> = {
          status,
          updatedAt: serverTimestamp()
        };

        if (counterOffer !== undefined) {
          // SAFE ACCESS: Check if loadDetails exists before spreading
          updateData.loadDetails = {
            ...(currentData.loadDetails || {}),
            rate: counterOffer
          };
        }

        await updateDoc(notificationRef, updateData);
        console.log('[updateLoadRequestStatus] Notification status updated successfully');

        // Handle business logic based on status using poNumber
        if (status === 'rejected') {
          await handleLoadRejection(poNumber, notificationDoc.id);
        } else if (status === 'accepted') {
          await handleLoadAcceptance(poNumber, notificationDoc.id);
        } else if (status === 'counter_offer' && counterOffer !== undefined) {
          await handleCounterOffer(poNumber, notificationDoc.id, counterOffer);
        }
        
        resolve(undefined);
      } catch (error) {
        reject(error);
      }
    });
  });
};

export const acceptLoadForPO = async (
  poNumber: string,
  carrierId: string,
  isPartnered: boolean
) => {
  console.log('[acceptLoadForPO] Called with:', { poNumber, carrierId, isPartnered });
  
  // Validate inputs
  if (!poNumber || !carrierId) {
    console.error('[acceptLoadForPO] Missing required parameters:', { poNumber, carrierId });
    throw new Error('Missing required parameters');
  }

  // 1. Find PO by poNumber
  const poSnapshot = await getDocs(query(collection(db, 'purchaseOrders'), where('poNumber', '==', poNumber)));
  if (poSnapshot.empty) {
    console.error('[acceptLoadForPO] PO not found for poNumber:', poNumber);
    throw new Error('PO not found');
  }
  const poDoc = poSnapshot.docs[0];
  const poId = poDoc.id;
  const poData = poDoc.data();

  // Validate that carrierId is not the same as the shipper's userId
  if (poData.userId === carrierId) {
    console.error('[acceptLoadForPO] carrierId cannot be the same as shipper userId:', { carrierId, shipperUserId: poData.userId });
    throw new Error('Invalid carrier assignment: carrierId matches shipper userId');
  }

  // 2. Fetch carrier profile
  let carrierProfile: Record<string, any> = {};
  try {
    const carrierDoc = await getDoc(doc(db, 'users', carrierId));
    if (carrierDoc.exists()) {
      carrierProfile = carrierDoc.data();
    }
  } catch (err) {
    console.error('[acceptLoadForPO] Error fetching carrier profile:', err);
  }

  // 3. Prepare carrier info
  const carrierInfo = {
    id: carrierId,
    companyName: carrierProfile.companyName || '',
    email: carrierProfile.email || '',
    acceptedAt: new Date().toISOString(),
    status: isPartnered ? 'approved' : 'pending'
  };

  // 4. Write to carriers subcollection
  try {
    await setDoc(doc(db, 'purchaseOrders', poId, 'carriers', carrierId), carrierInfo);
    console.log('[acceptLoadForPO] Added carrier to PO carriers subcollection.');
  } catch (err) {
    console.error('[acceptLoadForPO] Error writing carrier subcollection:', err);
  }

  // 5. Update PO summary fields
  try {
    // Use selectedCarrier.id to determine if this is a partnered carrier request
    const poSelectedCarrier = poData.selectedCarrier;
    const isPartneredFinal = isPartnered || (poSelectedCarrier && poSelectedCarrier.id === carrierId);
    let newStatus = 'Active';
    let newShippingScheduleStatus = 'Active'; // Always set to 'Active' when carrier is assigned
    await updateDoc(doc(db, 'purchaseOrders', poId), {
      shippingScheduleStatus: newShippingScheduleStatus,
      status: newStatus,
      carrierOption: 'carrier',
      selectedCarrier: carrierInfo,
      [isPartneredFinal ? 'approvedCarrier' : 'pendingCarrier']: carrierInfo
    });
    console.log('[acceptLoadForPO] Updated PO with carrier info, status set to Active, and carrierOption/selectedCarrier.');
  } catch (err) {
    console.error('[acceptLoadForPO] Error updating PO:', err);
  }

  // 6. Update the corresponding load in 'loads' collection to set carrierId
  try {
    if (poData.poNumber) {
      const loadsQuery = query(
        collection(db, 'loads'),
        where('poNumber', '==', poData.poNumber)
      );
      const loadsSnap = await getDocs(loadsQuery);
      if (!loadsSnap.empty) {
        const loadDocRef = doc(db, 'loads', loadsSnap.docs[0].id);
        const loadData = loadsSnap.docs[0].data();
        // Validate that we're not overwriting with the wrong carrierId
        if (loadData.carrierId && loadData.carrierId !== carrierId) {
          console.warn('[acceptLoadForPO] Load already has different carrierId:', { 
            existing: loadData.carrierId, 
            new: carrierId 
          });
        }
        // Merge all relevant PO fields into the load, matching UI expectations
        const pickupLocation = poData.pickupLocation || poData.vendorInfo || {};
        const deliveryLocation = poData.deliveryLocation || poData.shipTo || {};
        const pickup = {
          location: pickupLocation.streetAddress || pickupLocation.address || '',
          time: poData.date || pickupLocation.date || '',
          status: 'pending',
        };
        const delivery = {
          location: deliveryLocation.streetAddress || deliveryLocation.address || '',
          time: poData.date || deliveryLocation.date || '',
          status: 'pending',
        };
        const updateFields: any = {
          carrierId: carrierId,
          isMarketplace: false, // Always set to false when assigning a carrier
          shippingScheduleStatus: 'Active',
          updatedAt: serverTimestamp(),
          status: 'active',
          poNumber: poData.poNumber || '',
          shipperId: poData.userId || '',
          shipper: poData.companyInfo?.name || poData.vendorInfo?.name || '',
          pickup, // for UI
          delivery, // for UI
          payment: poData.rate || 0, // for UI
          pickupLocation, // for backward compatibility
          deliveryLocation, // for backward compatibility
          rate: poData.rate || 0,
          weight: poData.items?.reduce((sum: number, item: any) => sum + (item.weight || 0), 0) || '',
          dimensions: poData.items && poData.items.length > 0
            ? `${poData.items[0].length || ''}x${poData.items[0].width || ''}x${poData.items[0].height || ''}`
            : '',
        };
        if (!updateFields.shipperId) {
          console.error('[acceptLoadForPO] Missing shipperId for load update:', updateFields);
          throw new Error('Missing shipperId for load update');
        }
        await updateDoc(loadDocRef, updateFields);
        console.log('[acceptLoadForPO] Updated load with carrierId, isMarketplace=false, and merged PO fields for permissions:', carrierId);
      } else {
        console.warn('[acceptLoadForPO] No load found for poNumber:', poData.poNumber);
      }
    }
  } catch (err) {
    console.error('[acceptLoadForPO] Error updating load with carrierId:', err);
    throw new Error('Failed to update load with carrier assignment');
  }
};

// New poNumber-driven functions
const handleLoadRejection = async (poNumber: string, notificationId: string) => {
  console.log('[handleLoadRejection] Processing rejection for poNumber:', poNumber, 'notificationId:', notificationId);
  
  try {
    // 1. Update load status to 'pending' and remove carrierId so shipper can see it
    const loadsQuery = query(collection(db, 'loads'), where('poNumber', '==', poNumber));
    const loadsSnap = await getDocs(loadsQuery);
    
    console.log('[handleLoadRejection] Found', loadsSnap.docs.length, 'loads for poNumber:', poNumber);
    
    for (const loadDoc of loadsSnap.docs) {
      await updateDoc(doc(db, 'loads', loadDoc.id), {
        status: 'pending', // Changed to 'pending' so shipper can see it
        carrierId: null, // Remove carrier assignment
        updatedAt: serverTimestamp(),
      });
    }
    console.log('[handleLoadRejection] Load status updated to pending, carrierId removed');

    // 2. Update purchase order status back to Active and get correct shipperId
    const poQuery = query(collection(db, 'purchaseOrders'), where('poNumber', '==', poNumber));
    const poSnap = await getDocs(poQuery);
    
    console.log('[handleLoadRejection] Found', poSnap.docs.length, 'POs for poNumber:', poNumber);
    
    let shipperId: string | null = null;
    
    if (!poSnap.empty) {
      const poData = poSnap.docs[0].data();
      shipperId = poData.userId; // Get correct shipperId from purchase order using userId
      
      await updateDoc(doc(db, 'purchaseOrders', poSnap.docs[0].id), {
        status: 'Active',
        updatedAt: serverTimestamp(),
      });
      console.log('[handleLoadRejection] PO status updated to Active, shipperId from PO:', shipperId);
    }

    // 3. Create notification record for shipper using correct shipperId from PO
    if (shipperId) {
      const shipperNotificationRef = collection(db, 'notifications');
      await addDoc(shipperNotificationRef, {
        shipperId: shipperId,
        recipientId: shipperId,
        poNumber: poNumber,
        status: 'declined',
        type: 'carrier_decline',
        message: `Carrier declined load for PO ${poNumber}. Please select a new carrier.`,
        read: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        requiresAction: true
      });
      console.log('[handleLoadRejection] Shipper notification created with correct shipperId:', shipperId);
    } else {
      console.warn('[handleLoadRejection] No shipperId found in purchase order data for poNumber:', poNumber);
    }
    
  } catch (err) {
    console.error('[handleLoadRejection] Error:', err);
    throw new Error(`Failed to handle load rejection: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
};

const handleLoadAcceptance = async (poNumber: string, notificationId: string) => {
  console.log('[handleLoadAcceptance] Processing acceptance for poNumber:', poNumber);
  
  try {
    // Get notification data for carrier info
    const notificationDoc = await getDoc(doc(db, 'notifications', notificationId));
    const notifData = notificationDoc.data() as LoadRequestNotification;
    
    if (!notifData?.carrierId) {
      throw new Error('No carrierId found in notification data');
    }

    // 1. Update load status and assign carrier
    const loadsQuery = query(collection(db, 'loads'), where('poNumber', '==', poNumber));
    const loadsSnap = await getDocs(loadsQuery);
    
    for (const loadDoc of loadsSnap.docs) {
      await updateDoc(doc(db, 'loads', loadDoc.id), {
        status: 'active',
        carrierId: notifData.carrierId, // Assign the carrier
        updatedAt: serverTimestamp(),
      });
    }
    console.log('[handleLoadAcceptance] Load assigned to carrier');

    // 2. Create notification record for shipper
    if (notifData.shipperId) {
      const shipperNotificationRef = collection(db, 'notifications');
      await addDoc(shipperNotificationRef, {
        shipperId: notifData.shipperId,
        recipientId: notifData.shipperId,
        poNumber: poNumber,
        status: 'accepted',
        type: 'carrier_accept',
        message: `Carrier accepted load for PO ${poNumber}`,
        read: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log('[handleLoadAcceptance] Shipper notification created');
    }
    
  } catch (err) {
    console.error('[handleLoadAcceptance] Error:', err);
    throw new Error(`Failed to handle load acceptance: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
};

const handleCounterOffer = async (poNumber: string, notificationId: string, counterOffer: number) => {
  console.log('[handleCounterOffer] Processing counter offer for poNumber:', poNumber, 'amount:', counterOffer);
  
  try {
    // Get notification data for carrier info
    const notificationDoc = await getDoc(doc(db, 'notifications', notificationId));
    const notifData = notificationDoc.data() as LoadRequestNotification;
    
    if (!notifData?.shipperId) {
      throw new Error('No shipperId found in notification data');
    }

    // Create notification record for shipper
    const shipperNotificationRef = collection(db, 'notifications');
    await addDoc(shipperNotificationRef, {
      shipperId: notifData.shipperId,
      recipientId: notifData.shipperId,
      poNumber: poNumber,
      status: 'counter_offer',
      type: 'carrier_counter_offer',
      message: `Carrier made counter offer of $${counterOffer.toFixed(2)} for PO ${poNumber}`,
      read: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      requiresAction: true
    });
    console.log('[handleCounterOffer] Shipper notification created');
    
  } catch (err) {
    console.error('[handleCounterOffer] Error:', err);
    throw new Error(`Failed to handle counter offer: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}; 