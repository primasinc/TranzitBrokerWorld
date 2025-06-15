import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

export interface ScheduledShipment {
  id: string;
  date: string;
  time: string;
  destination: string;
  pickup?: string;
  carrier: string;
  status: 'Open' | 'Carrier Review' | 'Active' | 'Completed' | 'Cancelled';
  type: string;
  shipTo?: string;
  cost: number;
  poNumber: string;
}

interface ShipmentsContextType {
  shipments: ScheduledShipment[];
  refreshShipments: () => Promise<void>;
}

const ShipmentsContext = createContext<ShipmentsContextType | undefined>(undefined);

export const ShipmentsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [shipments, setShipments] = useState<ScheduledShipment[]>([]);

  const refreshShipments = async () => {
    const statusMap: { [key: string]: ScheduledShipment['status'] } = {
      'open': 'Open',
      'carrier review': 'Carrier Review',
      'carrier pending': 'Carrier Review',
      'carrier pending/approval': 'Carrier Review',
      'active': 'Active',
      'completed': 'Completed',
      'cancelled': 'Cancelled',
    };
    const querySnapshot = await getDocs(collection(db, 'purchaseOrders'));
    const shipmentsData = querySnapshot.docs
      .filter(doc => {
        const s = (doc.data().shippingScheduleStatus || doc.data().status || '').toLowerCase();
        return s !== 'cancelled';
      })
      .map(doc => {
        const data = doc.data();
        const normalizedStatus = (data.shippingScheduleStatus || data.status || '').toLowerCase();
        const status: ScheduledShipment['status'] = statusMap[normalizedStatus] || 'Open';
        return {
          id: doc.id,
          date: data.date || '',
          time: data.scheduledTime || '',
          destination: data.shipTo?.cityStateZip || '',
          pickup: data.vendorInfo?.cityStateZip || data.pickupLocation?.address || '',
          carrier: data.carrierOption === 'carrier'
            ? (typeof data.selectedCarrier === 'object'
                ? (data.selectedCarrier.companyName || data.selectedCarrier.id || 'TBD')
                : (data.selectedCarrier || 'TBD'))
            : 'Marketplace',
          status,
          type: data.type || 'Full Load',
          shipTo: data.shipTo?.name || '',
          cost: typeof data.rate === 'number' ? data.rate : (typeof data.total === 'number' ? data.total : 0),
          poNumber: data.poNumber || '',
        } as ScheduledShipment;
      });
    setShipments(shipmentsData);
  };

  useEffect(() => {
    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
      if (user) {
        refreshShipments(); // Only fetch after login
      } else {
        setShipments([]); // Clear if logged out
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <ShipmentsContext.Provider value={{ shipments, refreshShipments }}>
      {children}
    </ShipmentsContext.Provider>
  );
};

export const useShipments = () => {
  const context = useContext(ShipmentsContext);
  if (!context) {
    throw new Error('useShipments must be used within a ShipmentsProvider');
  }
  return context;
}; 