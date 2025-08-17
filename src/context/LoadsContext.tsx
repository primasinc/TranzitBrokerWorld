import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

export interface BrokerLoad {
  id: string;
  date: string;
  time: string;
  destination: string;
  pickup?: string;
  carrier: string;
  status: 'Open' | 'Carrier Pending' | 'Active' | 'Completed' | 'Cancelled';
  type: string;
  shipTo?: string;
  cost: number;
  poNumber: string;
  brokerId: string;
  loadType: string;
  equipmentType: string;
  weight?: number;
  dimensions?: string;
  specialInstructions?: string;
}

interface LoadsContextType {
  loads: BrokerLoad[];
  refreshLoads: () => Promise<void>;
  getLoadsByStatus: (status: BrokerLoad['status']) => BrokerLoad[];
  getLoadsByCarrier: (carrierId: string) => BrokerLoad[];
  getLoadsByDateRange: (startDate: Date, endDate: Date) => BrokerLoad[];
}

const LoadsContext = createContext<LoadsContextType | undefined>(undefined);

export const LoadsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loads, setLoads] = useState<BrokerLoad[]>([]);

  const refreshLoads = async () => {
    if (!auth.currentUser) return;

    const statusMap: { [key: string]: BrokerLoad['status'] } = {
      'open': 'Open',
      'carrier pending': 'Carrier Pending',
      'carrier pending/approval': 'Carrier Pending',
      'active': 'Active',
      'completed': 'Completed',
      'cancelled': 'Cancelled',
    };

    try {
      const querySnapshot = await getDocs(collection(db, 'loads'));
      const loadsData = querySnapshot.docs
        .filter(doc => {
          const data = doc.data();
          // Only include loads that belong to this broker
          return data.brokerId === auth.currentUser?.uid;
        })
        .map(doc => {
          const data = doc.data();
          const normalizedStatus = (data.status || '').toLowerCase();
          const status: BrokerLoad['status'] = statusMap[normalizedStatus] || 'Open';
          
          return {
            id: doc.id,
            date: data.date || '',
            time: data.scheduledTime || '',
            destination: data.deliveryLocation?.cityStateZip || data.destination || '',
            pickup: data.pickupLocation?.cityStateZip || data.origin || '',
            carrier: data.carrierId 
              ? (typeof data.carrier === 'object'
                  ? (data.carrier.companyName || data.carrier.id || 'TBD')
                  : (data.carrier || 'TBD'))
              : 'Unassigned',
            status,
            type: data.loadType || 'Full Load',
            shipTo: data.deliveryLocation?.name || '',
            cost: typeof data.rate === 'number' ? data.rate : (typeof data.total === 'number' ? data.total : 0),
            poNumber: data.poNumber || '',
            brokerId: data.brokerId || '',
            loadType: data.loadType || 'Full Load',
            equipmentType: data.equipmentType || 'Dry Van',
            weight: data.weight,
            dimensions: data.dimensions,
            specialInstructions: data.specialInstructions,
          } as BrokerLoad;
        });
      setLoads(loadsData);
    } catch (error) {
      console.error('Error refreshing loads:', error);
    }
  };

  const getLoadsByStatus = (status: BrokerLoad['status']) => {
    return loads.filter(load => load.status === status);
  };

  const getLoadsByCarrier = (carrierId: string) => {
    return loads.filter(load => load.carrier === carrierId);
  };

  const getLoadsByDateRange = (startDate: Date, endDate: Date) => {
    return loads.filter(load => {
      const loadDate = new Date(load.date);
      return loadDate >= startDate && loadDate <= endDate;
    });
  };

  useEffect(() => {
    // Listen for auth state changes
    const unsubscribeAuth = onAuthStateChanged(auth, (user: User | null) => {
      if (user) {
        // Set up real-time listener for loads
        const unsub = onSnapshot(collection(db, 'loads'), (querySnapshot) => {
          const statusMap: { [key: string]: BrokerLoad['status'] } = {
            'open': 'Open',
            'carrier pending': 'Carrier Pending',
            'carrier pending/approval': 'Carrier Pending',
            'active': 'Active',
            'completed': 'Completed',
            'cancelled': 'Cancelled',
          };

          const loadsData = querySnapshot.docs
            .filter(doc => {
              const data = doc.data();
              // Only include loads that belong to this broker
              return data.brokerId === user.uid;
            })
            .map(doc => {
              const data = doc.data();
              const normalizedStatus = (data.status || '').toLowerCase();
              const status: BrokerLoad['status'] = statusMap[normalizedStatus] || 'Open';
              
              return {
                id: doc.id,
                date: data.date || '',
                time: data.scheduledTime || '',
                destination: data.deliveryLocation?.cityStateZip || data.destination || '',
                pickup: data.pickupLocation?.cityStateZip || data.origin || '',
                carrier: data.carrierId 
                  ? (typeof data.carrier === 'object'
                      ? (data.carrier.companyName || data.carrier.id || 'TBD')
                      : (data.carrier || 'TBD'))
                  : 'Unassigned',
                status,
                type: data.loadType || 'Full Load',
                shipTo: data.deliveryLocation?.name || '',
                cost: typeof data.rate === 'number' ? data.rate : (typeof data.total === 'number' ? data.total : 0),
                poNumber: data.poNumber || '',
                brokerId: data.brokerId || '',
                loadType: data.loadType || 'Full Load',
                equipmentType: data.equipmentType || 'Dry Van',
                weight: data.weight,
                dimensions: data.dimensions,
                specialInstructions: data.specialInstructions,
              } as BrokerLoad;
            });
          setLoads(loadsData);
        });
        
        return () => unsub();
      }
    });
    
    return () => unsubscribeAuth();
  }, []);

  const value: LoadsContextType = {
    loads,
    refreshLoads,
    getLoadsByStatus,
    getLoadsByCarrier,
    getLoadsByDateRange,
  };

  return (
    <LoadsContext.Provider value={value}>
      {children}
    </LoadsContext.Provider>
  );
};

export const useLoads = () => {
  const context = useContext(LoadsContext);
  if (context === undefined) {
    throw new Error('useLoads must be used within a LoadsProvider');
  }
  return context;
};
