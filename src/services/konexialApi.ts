import axios from 'axios';

// Constants
const BASE_URL = 'https://user-service.konexial.com/public_api/v1';

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

// Helper to create a Konexial API client with per-user credentials
const createKonexialClient = (carrierId: string, apiToken: string) => axios.create({
  baseURL: BASE_URL,
  headers: {
    'CarrierID': carrierId,
    'Authorization': `Bearer ${apiToken}`,
  },
});

export const KonexialApi = {
  // Get all users (including drivers, admins, managers)
  async getUsers(carrierId: string, apiToken: string): Promise<KonexialUser[]> {
    try {
      const client = createKonexialClient(carrierId, apiToken);
      const response = await client.get('/users');
      return response.data;
    } catch (error) {
      console.error('Error fetching Konexial users:', error);
      throw error;
    }
  },

  // Get only drivers
  async getDrivers(carrierId: string, apiToken: string): Promise<KonexialUser[]> {
    const users = await this.getUsers(carrierId, apiToken);
    return users.filter(user => user.role === 'driver');
  },

  // Get all vehicles with pagination
  async getVehicles(carrierId: string, apiToken: string, pageCount: number = 100): Promise<KonexialVehicle[]> {
    try {
      const client = createKonexialClient(carrierId, apiToken);
      const response = await client.get(`/vehicles?page_count=${pageCount}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching Konexial vehicles:', error);
      throw error;
    }
  },

  // Get vehicle position by ID (using My20 internal ID from vehicles endpoint)
  async getVehiclePosition(carrierId: string, apiToken: string, vehicleId: string): Promise<KonexialVehiclePosition> {
    try {
      const client = createKonexialClient(carrierId, apiToken);
      const response = await client.get(`/vehicles/${vehicleId}/locations?limit=1`);
      return response.data?.locations?.[0] ?? null;
    } catch (error) {
      console.error('Error fetching Konexial vehicle position:', error);
      throw error;
    }
  },

  // Get locations for all vehicles in one call
  async getFleetLocations(carrierId: string, apiToken: string): Promise<any[]> {
    try {
      const client = createKonexialClient(carrierId, apiToken);
      const response = await client.get('/vehicles/locations');
      return response.data.locations || [];
    } catch (error) {
      console.error('Error fetching fleet locations:', error);
      throw error;
    }
  },
};

export default KonexialApi; 