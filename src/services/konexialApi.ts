import axios from 'axios';

// Constants
const BASE_URL = 'https://user-service.konexial.com/public_api/v1';
const CARRIER_ID = process.env.REACT_APP_KONEXIAL_API_ID;
const API_TOKEN = process.env.REACT_APP_KONEXIAL_API_KEY;

if (!CARRIER_ID || !API_TOKEN) {
  throw new Error('Konexial API credentials not found in environment variables');
}

// Types
interface KonexialUser {
  id: string;
  role: string;
  // From their email: role = 'driver' for drivers
  name?: string;
}

interface KonexialVehicle {
  id: string;           // My20 internal identification
  truckNumber: string;  // carrier identifier for the truck
}

interface KonexialVehiclePosition {
  // Vehicle position data - to be expanded based on API response
  position?: {
    latitude: number;
    longitude: number;
    timestamp: string;
  };
}

// API client configuration
const konexialClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'CarrierID': CARRIER_ID,
    'Authorization': `Bearer ${API_TOKEN}`,
  },
});

export const KonexialApi = {
  // Get all users (including drivers, admins, managers)
  async getUsers(): Promise<KonexialUser[]> {
    try {
      const response = await konexialClient.get('/users');
      return response.data;
    } catch (error) {
      console.error('Error fetching Konexial users:', error);
      throw error;
    }
  },

  // Get only drivers
  async getDrivers(): Promise<KonexialUser[]> {
    const users = await this.getUsers();
    return users.filter(user => user.role === 'driver');
  },

  // Get all vehicles with pagination
  async getVehicles(pageCount: number = 100): Promise<KonexialVehicle[]> {
    try {
      const response = await konexialClient.get(`/vehicles?page_count=${pageCount}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching Konexial vehicles:', error);
      throw error;
    }
  },

  // Get vehicle position by ID (using My20 internal ID from vehicles endpoint)
  async getVehiclePosition(vehicleId: string): Promise<KonexialVehiclePosition> {
    try {
      const response = await konexialClient.get(`/vehicles/${vehicleId}/locations?limit=1`);
      return response.data?.locations?.[0] ?? null;
    } catch (error) {
      console.error('Error fetching Konexial vehicle position:', error);
      throw error;
    }
  },

  // Get locations for all vehicles in one call
  async getFleetLocations(): Promise<any[]> {
    try {
      const response = await konexialClient.get('/vehicles/locations');
      return response.data.locations || [];
    } catch (error) {
      console.error('Error fetching fleet locations:', error);
      throw error;
    }
  },
};

export default KonexialApi; 