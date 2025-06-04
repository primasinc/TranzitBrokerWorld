import axios from 'axios';
import { KonexialApi } from './konexialApi';

const PROXY_BASE = 'http://localhost:3001/api';

export interface KonexialVehicle {
  id: string;
  truck_number: string;
  carrier_name: string;
  truck_make: string;
  truck_model: string;
  license_plate_number: string;
  license_state_name: string;
  vin: string;
  last_position?: {
    latitude: number;
    longitude: number;
    timestamp: string;
    speed?: number;
    heading?: number;
  };
}

interface ErrorResponse {
  response?: {
    data: unknown;
    status: number;
    headers: unknown;
  };
}

export const konexialService = {
  async getVehicles(): Promise<KonexialVehicle[]> {
    try {
      console.log('Making request to proxy for vehicles...');
      const response = await axios.get<KonexialVehicle[]>(`${PROXY_BASE}/vehicles`);
      console.log('Received vehicles:', response.data);
      return response.data;
    } catch (error: unknown) {
      console.error('Error fetching vehicles:', error);
      const err = error as ErrorResponse;
      if (err.response) {
        console.error('Response:', err.response.data);
        console.error('Status:', err.response.status);
        console.error('Headers:', err.response.headers);
      }
      return [];
    }
  },

  async getVehiclePosition(vehicleId: string): Promise<KonexialVehicle | null> {
    try {
      console.log(`Fetching position for vehicle ${vehicleId}...`);
      const response = await axios.get<any>(`${PROXY_BASE}/vehicles/${vehicleId}/locations?limit=1`);
      console.log('Vehicle position response:', response.status, response.statusText);
      if (response.data.locations?.[0]) {
        return {
          id: vehicleId,
          last_position: {
            latitude: response.data.locations[0].latitude,
            longitude: response.data.locations[0].longitude,
            timestamp: response.data.locations[0].timestamp,
            speed: response.data.locations[0].speed,
            heading: response.data.locations[0].heading
          }
        } as KonexialVehicle;
      }
      return null;
    } catch (error: unknown) {
      console.error('Error fetching vehicle position:', error);
      const err = error as ErrorResponse;
      if (err.response) {
        console.error('Response:', err.response.data);
        console.error('Status:', err.response.status);
        console.error('Headers:', err.response.headers);
      }
      return null;
    }
  },

  // New: Get vehicles for a specific user using their ELD API ID and Key
  async getUserVehicles(eldApiId: string, eldApiKey: string): Promise<KonexialVehicle[]> {
    try {
      const vehicles = await KonexialApi.getVehicles(eldApiId, eldApiKey);
      // Map fields to match KonexialVehicle interface if needed
      return vehicles.map((v: any) => ({
        id: v.id,
        truck_number: v.truck_number || v.truckNumber || '',
        carrier_name: v.carrier_name || v.carrierName || '',
        truck_make: v.truck_make || v.truckMake || '',
        truck_model: v.truck_model || v.truckModel || '',
        license_plate_number: v.license_plate_number || v.licensePlateNumber || '',
        license_state_name: v.license_state_name || v.licenseStateName || '',
        vin: v.vin || '',
        last_position: v.last_position || v.position || undefined
      }));
    } catch (error) {
      console.error('Error fetching user vehicles from Konexial:', error);
      return [];
    }
  }
};