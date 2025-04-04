import React, { createContext, useContext, useState, ReactNode } from 'react';

interface CarrierPartner {
  id: string;
  name: string;
  rating: number;
  completedLoads: number;
  activeLoads: number;
  specialties: string[];
  status: 'Active' | 'Inactive';
  location: string;
  contact: {
    name: string;
    phone: string;
    email: string;
  };
  usdotNumber?: string;
  mcNumber?: string;
}

interface CarrierContextType {
  partnerCarriers: CarrierPartner[];
  addPartnerCarrier: (carrier: CarrierPartner) => void;
  removePartnerCarrier: (carrierId: string) => void;
}

const CarrierContext = createContext<CarrierContextType | undefined>(undefined);

export const useCarrierContext = () => {
  const context = useContext(CarrierContext);
  if (!context) {
    throw new Error('useCarrierContext must be used within a CarrierProvider');
  }
  return context;
};

export const CarrierProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [partnerCarriers, setPartnerCarriers] = useState<CarrierPartner[]>([]);

  const addPartnerCarrier = (carrier: CarrierPartner) => {
    setPartnerCarriers(prev => {
      // Check if carrier already exists
      if (prev.some(c => c.id === carrier.id)) {
        alert('This carrier is already in your partners list.');
        return prev;
      }
      return [...prev, carrier];
    });
  };

  const removePartnerCarrier = (carrierId: string) => {
    setPartnerCarriers(prev => prev.filter(c => c.id !== carrierId));
  };

  return (
    <CarrierContext.Provider value={{ partnerCarriers, addPartnerCarrier, removePartnerCarrier }}>
      {children}
    </CarrierContext.Provider>
  );
};

export default CarrierProvider; 