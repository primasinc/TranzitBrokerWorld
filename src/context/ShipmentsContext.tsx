import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

export interface ScheduledShipment {
  id: string;
  date: string;
  time: string;
  destination: string;
  carrier: string;
  status: 'Active' | 'Delayed' | 'Completed' | 'Cancelled';
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
    const querySnapshot = await getDocs(collection(db, 'purchaseOrders'));
    const shipmentsData = querySnapshot.docs.map(doc => {
      const data = doc.data();
      let status: 'Active' | 'Delayed' | 'Completed' | 'Cancelled' = 'Active';
      if (data.status === 'Delayed') status = 'Delayed';
      else if (data.status === 'Completed') status = 'Completed';
      else if (data.status === 'Cancelled') status = 'Cancelled';
      return {
        id: doc.id,
        date: data.date || '',
        time: data.scheduledTime || '',
        destination: data.shipTo?.cityStateZip || '',
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