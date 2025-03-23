import { Timestamp, setDoc, doc, addDoc, collection } from 'firebase/firestore';
import { db } from '../config/firebase';
import { ShipmentData } from '../types/shipment';
import { clearShipperData } from '../services/shipmentService';

interface ShipmentMetrics {
  totalShipments: number;
  completedShipments: number;
  onTimeDeliveries: number;
  totalCost: number;
  activeShipments: number;
  delayedShipments: number;
  onTimeDeliveryPercentage: number;
  averageCostPerLoad: number;
  lastUpdated: Timestamp;
  shipperId: string;
}

interface GeneratedShipment {
  id: string;
  shipperId: string;
  origin: string;
  destination: string;
  carrier: {
    id: string;
    name: string;
  };
  scheduledPickup: Timestamp;
  scheduledDelivery: Timestamp;
  actualDelivery?: Timestamp;
  status: ShipmentData['status'];
  cost: number;
  isOnTime: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

const generateRandomShipment = (shipperId: string, daysAgo: number): GeneratedShipment => {
  const cities = [
    { name: 'Chicago, IL', position: { lat: 41.8781, lng: -87.6298 } },
    { name: 'New York, NY', position: { lat: 40.7128, lng: -74.0060 } },
    { name: 'Los Angeles, CA', position: { lat: 34.0522, lng: -118.2437 } },
    { name: 'Houston, TX', position: { lat: 29.7604, lng: -95.3698 } },
    { name: 'Phoenix, AZ', position: { lat: 33.4484, lng: -112.0740 } }
  ];

  const carriers = [
    { id: 'C1', name: 'ABC Trucking' },
    { id: 'C2', name: 'XYZ Logistics' },
    { id: 'C3', name: 'Fast Transit' },
    { id: 'C4', name: 'Reliable Transport' }
  ];

  const origin = cities[Math.floor(Math.random() * cities.length)];
  let destination = cities[Math.floor(Math.random() * cities.length)];
  while (destination.name === origin.name) {
    destination = cities[Math.floor(Math.random() * cities.length)];
  }

  const carrier = carriers[Math.floor(Math.random() * carriers.length)];
  const cost = Math.floor(Math.random() * 2000) + 1000; // Random cost between 1000 and 3000
  const isDelayed = Math.random() < 0.2; // 20% chance of delay
  
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  
  const scheduledDelivery = new Date(date);
  scheduledDelivery.setHours(scheduledDelivery.getHours() + Math.floor(Math.random() * 72)); // Random delivery within 72 hours

  return {
    id: `SH${Math.random().toString(36).substr(2, 9)}`,
    shipperId,
    origin: origin.name,
    destination: destination.name,
    carrier: {
      id: carrier.id,
      name: carrier.name
    },
    scheduledPickup: Timestamp.fromDate(date),
    scheduledDelivery: Timestamp.fromDate(scheduledDelivery),
    status: 'delivered' as ShipmentData['status'],
    cost,
    isOnTime: !isDelayed,
    createdAt: Timestamp.fromDate(date),
    updatedAt: Timestamp.fromDate(date)
  };
};

const calculateMetrics = (shipments: any[], shipperId: string): ShipmentMetrics => {
  const totalShipments = shipments.length;
  const deliveredShipments = shipments.filter(s => s.status === 'delivered');
  const activeShipments = shipments.filter(s => s.status === 'in_transit').length;
  const onTimeDeliveries = deliveredShipments.filter(s => s.isOnTime).length;
  const totalCost = shipments.reduce((sum, s) => sum + s.cost, 0);
  const delayedShipments = deliveredShipments.filter(s => !s.isOnTime).length;

  return {
    totalShipments,
    completedShipments: deliveredShipments.length,
    activeShipments,
    delayedShipments,
    onTimeDeliveries,
    totalCost,
    onTimeDeliveryPercentage: deliveredShipments.length > 0 
      ? (onTimeDeliveries / deliveredShipments.length) * 100 
      : 0,
    averageCostPerLoad: totalShipments > 0 
      ? totalCost / totalShipments 
      : 0,
    lastUpdated: Timestamp.now(),
    shipperId
  };
};

export const generateTestData = async (userId: string) => {
  try {
    console.log('Starting test data generation...');
    
    // Clear existing data first
    await clearShipperData(userId);
    console.log('Cleared existing data');

    // Generate shipments over the last 30 days
    const shipments: Partial<ShipmentData>[] = [];
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Generate 50 shipments
    for (let i = 0; i < 50; i++) {
      const scheduledPickup = new Date(
        thirtyDaysAgo.getTime() + Math.random() * (now.getTime() - thirtyDaysAgo.getTime())
      );
      
      // Scheduled delivery is 1-3 days after pickup
      const scheduledDelivery = new Date(
        scheduledPickup.getTime() + (1 + Math.floor(Math.random() * 3)) * 24 * 60 * 60 * 1000
      );
      
      // 20% of shipments are in_transit
      const isInTransit = Math.random() < 0.2;
      const status = isInTransit ? 'in_transit' : 'delivered';
      
      // For delivered shipments, set actual delivery
      let actualDelivery = null; // Initialize as null instead of undefined
      let isOnTime = true;
      if (status === 'delivered') {
        // 80% chance of being on time (within 1 hour of scheduled)
        isOnTime = Math.random() < 0.8;
        if (isOnTime) {
          actualDelivery = new Date(
            scheduledDelivery.getTime() + Math.random() * 60 * 60 * 1000 // Up to 1 hour late
          );
        } else {
          actualDelivery = new Date(
            scheduledDelivery.getTime() + (1 + Math.random() * 24) * 60 * 60 * 1000 // 1-24 hours late
          );
        }
      }
      
      // Random cost between $1000 and $3000
      const cost = Math.floor(1000 + Math.random() * 2000);
      
      // Random carrier from list
      const carriers = [
        { id: 'C1', name: 'ABC Trucking' },
        { id: 'C2', name: 'XYZ Logistics' },
        { id: 'C3', name: 'Fast Freight Inc' },
        { id: 'C4', name: 'Reliable Transport' },
        { id: 'C5', name: 'Eagle Shipping' }
      ];
      const carrier = carriers[Math.floor(Math.random() * carriers.length)];
      
      // Random cities
      const cities = [
        'Chicago, IL',
        'New York, NY',
        'Los Angeles, CA',
        'Houston, TX',
        'Miami, FL',
        'Seattle, WA',
        'Denver, CO',
        'Atlanta, GA'
      ];
      const origin = cities[Math.floor(Math.random() * cities.length)];
      let destination;
      do {
        destination = cities[Math.floor(Math.random() * cities.length)];
      } while (destination === origin);
      
      // Create the base shipment data
      const shipmentData: Record<string, any> = {
        shipperId: userId,
        poNumber: `PO${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
        origin,
        destination,
        carrier,
        scheduledPickup: Timestamp.fromDate(scheduledPickup),
        scheduledDelivery: Timestamp.fromDate(scheduledDelivery),
        status: status as ShipmentData['status'],
        cost,
        isOnTime,
        createdAt: Timestamp.fromDate(scheduledPickup),
        updatedAt: Timestamp.fromDate(new Date())
      };

      // Only add actualDelivery if it exists
      if (actualDelivery) {
        shipmentData.actualDelivery = Timestamp.fromDate(actualDelivery);
      }
      
      shipments.push(shipmentData);
    }
    
    console.log('Adding shipments to Firestore...');
    
    // Add all shipments to Firestore
    const addPromises = shipments.map(shipment => 
      addDoc(collection(db, 'shipments'), shipment)
    );
    
    await Promise.all(addPromises);
    
    console.log('Calculating metrics...');
    
    // Calculate metrics
    const completedShipments = shipments.filter(s => s.status === 'delivered');
    const onTimeDeliveries = completedShipments.filter(s => s.isOnTime).length;
    const totalCost = shipments.reduce((sum, s) => sum + (s.cost || 0), 0);
    
    // Update metrics document
    const metrics = {
      shipperId: userId,
      totalShipments: shipments.length,
      completedShipments: completedShipments.length,
      onTimeDeliveries,
      totalCost,
      onTimeDeliveryPercentage: (onTimeDeliveries / completedShipments.length) * 100,
      averageCostPerLoad: totalCost / shipments.length,
      lastUpdated: Timestamp.now()
    };
    
    console.log('Updating metrics in Firestore:', metrics);
    await setDoc(doc(db, 'metrics', userId), metrics);
    
    console.log('Successfully completed test data generation');
    return true;
  } catch (error) {
    console.error('Error generating test data:', error);
    return false;
  }
}; 