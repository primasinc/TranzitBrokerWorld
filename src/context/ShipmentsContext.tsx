import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export interface ScheduledShipment {
  id: string;
  date: string;
  time: string;
  destination: string;
  carrier: string;
  status: 'Active' | 'Delayed' | 'Completed' | 'Cancelled';
  type: string;
  shipTo?: string;
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
        carrier: data.carrierOption === 'carrier' ? (data.selectedCarrier || 'TBD') : 'Marketplace',
        status,
        type: data.type || 'Full Load',
        shipTo: data.shipTo?.name || '',
      } as ScheduledShipment;
    });
    setShipments(shipmentsData);
  };

  useEffect(() => {
    refreshShipments();
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