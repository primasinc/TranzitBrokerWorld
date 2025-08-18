import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  getDocs,
  doc,
  getDoc,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { BrokerLoad } from '../context/LoadsContext';

export interface RealBrokerMetrics {
  activeLoads: number;
  onTimeDelivery: number;
  averageCost: number;
  totalRevenue: number;
  carrierCount: number;
  loadCount: number;
  completedLoads: number;
  pendingLoads: number;
  // Business metrics brokers actually need
  outstandingPayments: number; // Total unpaid invoices
  averageLoadValue: number;
  carrierPerformance: {
    onTime: number;
    delayed: number;
    damaged: number;
  };
  revenueByPeriod: {
    daily: number;
    weekly: number;
    monthly: number;
  };
}

export interface LoadDeliveryData {
  loadId: string;
  scheduledDelivery: Date;
  actualDelivery?: Date;
  isOnTime: boolean;
  delayHours?: number;
  damageClaims?: number;
  brokerCommission: number;
  factoringStatus: 'pending' | 'paid' | 'overdue';
}

/**
 * Subscribe to real-time broker metrics with actual calculations
 */
export const subscribeToRealBrokerMetrics = (
  brokerId: string, 
  callback: (metrics: RealBrokerMetrics) => void
) => {
  // Subscribe to loads collection
  const loadsQuery = query(
    collection(db, 'loads'),
    where('brokerId', '==', brokerId),
    orderBy('createdAt', 'desc')
  );

  // Subscribe to broker-specific collections
  const brokerMetricsQuery = query(
    collection(db, 'brokerMetrics'),
    where('brokerId', '==', brokerId)
  );

  const brokerPaymentsQuery = query(
    collection(db, 'brokerPayments'),
    where('brokerId', '==', brokerId),
    orderBy('paymentDate', 'desc')
  );

  const unsubscribeLoads = onSnapshot(loadsQuery, async (loadsSnapshot) => {
    const loads = loadsSnapshot.docs.map(doc => doc.data() as BrokerLoad);
    
    // Get additional broker-specific data
    const brokerMetricsSnap = await getDocs(brokerMetricsQuery);
    const brokerMetrics = brokerMetricsSnap.docs[0]?.data();
    
    const brokerPaymentsSnap = await getDocs(brokerPaymentsQuery);
    const brokerPayments = brokerPaymentsSnap.docs.map(doc => doc.data());

    const metrics = await calculateRealBrokerMetrics(
      loads, 
      brokerMetrics, 
      brokerPayments,
      brokerId
    );

    callback(metrics);
  });

  return unsubscribeLoads;
};

/**
 * Calculate real broker metrics based on actual data
 */
const calculateRealBrokerMetrics = async (
  loads: BrokerLoad[],
  brokerMetrics: any,
  brokerPayments: any[],
  brokerId: string
): Promise<RealBrokerMetrics> => {
  // Calculate basic metrics
  const activeLoads = loads.filter(load => 
    load.status === 'Active' || load.status === 'Carrier Pending'
  ).length;
  
  const completedLoads = loads.filter(load => load.status === 'Completed');
  const pendingLoads = loads.filter(load => load.status === 'Open');
  
  // Calculate real on-time delivery percentage
  const onTimeDelivery = await calculateRealOnTimeDelivery(completedLoads, brokerId);
  
  // Calculate business metrics brokers actually need
  const outstandingPayments = calculateOutstandingPayments(brokerPayments);
  
  // Calculate revenue metrics
  const totalRevenue = loads.reduce((sum, load) => sum + (load.cost || 0), 0);
  const averageCost = loads.length > 0 ? totalRevenue / loads.length : 0;
  const averageLoadValue = totalRevenue / Math.max(loads.length, 1);
  
  // Calculate carrier performance
  const carrierPerformance = await calculateCarrierPerformance(loads, brokerId);
  
  // Calculate revenue by period
  const revenueByPeriod = calculateRevenueByPeriod(loads);

  return {
    activeLoads,
    onTimeDelivery,
    averageCost,
    totalRevenue,
    carrierCount: getUniqueCarrierCount(loads),
    loadCount: loads.length,
    completedLoads: completedLoads.length,
    pendingLoads: pendingLoads.length,
    outstandingPayments,
    averageLoadValue,
    carrierPerformance,
    revenueByPeriod
  };
};

/**
 * Calculate real on-time delivery percentage based on actual delivery times
 */
const calculateRealOnTimeDelivery = async (
  completedLoads: BrokerLoad[],
  brokerId: string
): Promise<number> => {
  if (completedLoads.length === 0) return 0;

  let onTimeCount = 0;
  let totalDelivered = 0;

  for (const load of completedLoads) {
    try {
      // Get delivery details from broker-specific collection
      const deliveryDoc = await getDoc(doc(db, 'brokerLoadDeliveries', load.id));
      
      if (deliveryDoc.exists()) {
        const deliveryData = deliveryDoc.data();
        const scheduledDelivery = deliveryData.scheduledDelivery?.toDate();
        const actualDelivery = deliveryData.actualDelivery?.toDate();
        
        if (scheduledDelivery && actualDelivery) {
          totalDelivered++;
          
          // Consider on-time if within 2 hours of scheduled time
          const delayHours = (actualDelivery.getTime() - scheduledDelivery.getTime()) / (1000 * 60 * 60);
          if (delayHours <= 2) {
            onTimeCount++;
          }
        }
      }
    } catch (error) {
      console.error(`Error calculating delivery time for load ${load.id}:`, error);
    }
  }

  return totalDelivered > 0 ? (onTimeCount / totalDelivered) * 100 : 0;
};

/**
 * Calculate outstanding payments (unpaid invoices) that brokers need to manage
 */
const calculateOutstandingPayments = (brokerPayments: any[]): number => {
  return brokerPayments
    .filter(payment => payment.status === 'pending' || payment.status === 'overdue')
    .reduce((sum, payment) => sum + (payment.amount || 0), 0);
};

/**
 * Calculate carrier performance metrics
 */
const calculateCarrierPerformance = async (
  loads: BrokerLoad[],
  brokerId: string
): Promise<{ onTime: number; delayed: number; damaged: number }> => {
  let onTime = 0;
  let delayed = 0;
  let damaged = 0;

  for (const load of loads) {
    if (load.status === 'Completed') {
      try {
        const deliveryDoc = await getDoc(doc(db, 'brokerLoadDeliveries', load.id));
        
        if (deliveryDoc.exists()) {
          const deliveryData = deliveryDoc.data();
          const scheduledDelivery = deliveryData.scheduledDelivery?.toDate();
          const actualDelivery = deliveryData.actualDelivery?.toDate();
          
          if (scheduledDelivery && actualDelivery) {
            const delayHours = (actualDelivery.getTime() - scheduledDelivery.getTime()) / (1000 * 60 * 60);
            
            if (delayHours <= 2) {
              onTime++;
            } else {
              delayed++;
            }
          }
          
          // Check for damage claims
          if (deliveryData?.damageClaims && deliveryData.damageClaims > 0) {
            damaged++;
          }
        }
      } catch (error) {
        console.error(`Error calculating carrier performance for load ${load.id}:`, error);
      }
    }
  }

  return { onTime, delayed, damaged };
};

/**
 * Calculate revenue by time period
 */
const calculateRevenueByPeriod = (loads: BrokerLoad[]): { daily: number; weekly: number; monthly: number } => {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const dailyRevenue = loads
    .filter(load => new Date(load.date) >= oneDayAgo)
    .reduce((sum, load) => sum + (load.cost || 0), 0);

  const weeklyRevenue = loads
    .filter(load => new Date(load.date) >= oneWeekAgo)
    .reduce((sum, load) => sum + (load.cost || 0), 0);

  const monthlyRevenue = loads
    .filter(load => new Date(load.date) >= oneMonthAgo)
    .reduce((sum, load) => sum + (load.cost || 0), 0);

  return { daily: dailyRevenue, weekly: weeklyRevenue, monthly: monthlyRevenue };
};

/**
 * Get unique carrier count
 */
const getUniqueCarrierCount = (loads: BrokerLoad[]): number => {
  const carriers = new Set(loads.map(load => load.carrier).filter(carrier => carrier !== 'Unassigned'));
  return carriers.size;
};


