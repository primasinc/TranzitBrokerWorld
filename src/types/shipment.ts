import { Timestamp } from 'firebase/firestore';

export type ShipmentStatus = 'scheduled' | 'in_transit' | 'delivered' | 'delayed' | 'cancelled';

export interface ShipmentData {
  id: string;
  shipperId: string;
  poNumber: string;
  origin: string;
  destination: string;
  carrier: {
    id: string;
    name: string;
  };
  scheduledPickup: Timestamp;
  scheduledDelivery: Timestamp;
  actualPickup?: Timestamp;
  actualDelivery?: Timestamp;
  status: ShipmentStatus;
  cost: number;
  isOnTime: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface MetricsData {
  shipperId: string;
  totalShipments: number;
  completedShipments: number;
  onTimeDeliveries: number;
  totalCost: number;
  lastUpdated: Timestamp;
  // Calculated fields
  onTimeDeliveryPercentage: number;
  averageCostPerLoad: number;
}

// Helper function to calculate if a shipment is on time
export const calculateIsOnTime = (shipment: ShipmentData): boolean => {
  if (!shipment.actualDelivery || shipment.status !== 'delivered') {
    return false;
  }

  // Consider a shipment on time if delivered within 1 hour of scheduled time
  const scheduledTime = shipment.scheduledDelivery.toMillis();
  const actualTime = shipment.actualDelivery.toMillis();
  const oneHourInMs = 60 * 60 * 1000;

  return actualTime <= (scheduledTime + oneHourInMs);
};

// Helper function to calculate metrics from shipments
export const calculateMetrics = (shipments: ShipmentData[]): Omit<MetricsData, 'shipperId' | 'lastUpdated'> => {
  const completedShipments = shipments.filter(s => s.status === 'delivered');
  const onTimeDeliveries = completedShipments.filter(s => s.isOnTime).length;
  const totalCost = shipments.reduce((sum, s) => sum + s.cost, 0);

  return {
    totalShipments: shipments.length,
    completedShipments: completedShipments.length,
    onTimeDeliveries,
    totalCost,
    onTimeDeliveryPercentage: completedShipments.length > 0 
      ? (onTimeDeliveries / completedShipments.length) * 100 
      : 0,
    averageCostPerLoad: shipments.length > 0 
      ? totalCost / shipments.length 
      : 0
  };
}; 