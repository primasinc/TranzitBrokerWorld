import { createCarrier, updateCarrierMetrics } from '../services/carrierService';
import { CarrierProfile, Equipment, Insurance, ServiceArea } from '../types/carrier';
import { Timestamp } from 'firebase/firestore';

const generateRandomEquipment = (): Equipment[] => {
  const equipmentTypes = ['dry_van', 'reefer', 'flatbed', 'step_deck', 'box_truck'];
  const count = 1 + Math.floor(Math.random() * 3); // 1-3 equipment types
  
  return equipmentTypes
    .sort(() => Math.random() - 0.5)
    .slice(0, count)
    .map(type => ({
      type: type as Equipment['type'],
      count: 1 + Math.floor(Math.random() * 5), // 1-5 units
      capacity: 10000 + Math.floor(Math.random() * 30000), // 10k-40k lbs
      dimensions: {
        length: 48 + Math.floor(Math.random() * 5), // 48-53 feet
        width: 102, // Standard width in inches
        height: 102 + Math.floor(Math.random() * 10) // 102-112 inches
      }
    }));
};

const generateRandomInsurance = (): Insurance[] => {
  const insuranceTypes = ['liability', 'cargo', 'physical_damage', 'workers_comp'];
  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 1);
  
  return insuranceTypes.map(type => ({
    type: type as Insurance['type'],
    provider: ['Progressive', 'State Farm', 'Nationwide', 'Liberty Mutual'][Math.floor(Math.random() * 4)],
    policyNumber: `POL${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`,
    coverage: 1000000 + Math.floor(Math.random() * 4000000), // $1M-$5M coverage
    expiresAt: Timestamp.fromDate(futureDate)
  }));
};

const generateRandomServiceAreas = (): ServiceArea[] => {
  const states = [
    'CA', 'TX', 'FL', 'NY', 'IL', 'PA', 'OH', 'GA', 'NC', 'MI',
    'NJ', 'VA', 'WA', 'AZ', 'MA', 'TN', 'IN', 'MD', 'MO', 'WI'
  ];
  
  const count = 5 + Math.floor(Math.random() * 6); // 5-10 service areas
  return states
    .sort(() => Math.random() - 0.5)
    .slice(0, count)
    .map(state => ({
      state,
      preferred: Math.random() > 0.7, // 30% chance of being preferred
      restrictions: Math.random() > 0.8 ? ['hazmat', 'oversize'] : [] // 20% chance of restrictions
    }));
};

export const generateTestCarrier = async (userId: string) => {
  try {
    console.log('Generating test carrier data...');
    
    const carrierData: Omit<CarrierProfile, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'lastActive'> = {
      companyName: `Test Carrier ${Math.floor(Math.random() * 1000)}`,
      mcNumber: `MC${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`,
      dotNumber: `${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`,
      status: 'active',
      email: `carrier${Math.floor(Math.random() * 1000)}@test.com`,
      phone: `(${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
      address: {
        street: `${Math.floor(Math.random() * 9000) + 1000} Test St`,
        city: ['Chicago', 'New York', 'Los Angeles', 'Houston', 'Phoenix'][Math.floor(Math.random() * 5)],
        state: ['IL', 'NY', 'CA', 'TX', 'AZ'][Math.floor(Math.random() * 5)],
        zip: `${Math.floor(Math.random() * 90000) + 10000}`
      },
      insurance: generateRandomInsurance(),
      equipment: generateRandomEquipment(),
      serviceAreas: generateRandomServiceAreas(),
      documents: [], // Start with no documents
      
      // Initialize performance metrics
      totalLoads: Math.floor(Math.random() * 100),
      completedLoads: 0,
      onTimeDeliveries: 0,
      averageTransitTime: 0,
      averageResponseTime: 0,
      rating: 5,
      
      // Initialize preferences
      preferredLoadTypes: ['dry_van', 'reefer'],
      minimumRate: 1.5 + Math.random() * 1.5, // $1.50-$3.00 per mile
      preferredLaneRates: {}
    };

    // Calculate some realistic metrics
    carrierData.completedLoads = Math.floor(carrierData.totalLoads * 0.8); // 80% completion rate
    carrierData.onTimeDeliveries = Math.floor(carrierData.completedLoads * 0.9); // 90% on-time rate
    carrierData.averageTransitTime = 24 + Math.random() * 48; // 24-72 hours
    carrierData.averageResponseTime = 5 + Math.random() * 25; // 5-30 minutes
    carrierData.rating = 3.5 + Math.random() * 1.5; // 3.5-5.0 rating

    // Create the carrier
    const carrier = await createCarrier(userId, carrierData);
    console.log('Created test carrier:', carrier.id);

    // Update metrics with more detailed data
    await updateCarrierMetrics(carrier.id, {
      monthlyLoads: Math.floor(carrierData.totalLoads / 12),
      monthlyMiles: Math.floor(Math.random() * 10000) + 5000,
      monthlyRevenue: Math.floor(Math.random() * 50000) + 25000,
      monthlyOnTimeRate: 90 + Math.floor(Math.random() * 10),
      totalLoads: carrierData.totalLoads,
      totalMiles: Math.floor(Math.random() * 100000) + 50000,
      totalRevenue: Math.floor(Math.random() * 500000) + 250000,
      averageLoadRate: 2.5 + Math.random(),
      averageMileRate: 2.75 + Math.random(),
      onTimeDeliveryRate: 90 + Math.floor(Math.random() * 10),
      safetyScore: 85 + Math.floor(Math.random() * 15),
      reliabilityScore: 85 + Math.floor(Math.random() * 15),
      communicationScore: 85 + Math.floor(Math.random() * 15),
      overallScore: 85 + Math.floor(Math.random() * 15)
    });

    console.log('Successfully generated test carrier data');
    return carrier;
  } catch (error) {
    console.error('Error generating test carrier:', error);
    throw error;
  }
}; 