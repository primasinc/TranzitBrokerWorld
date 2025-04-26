import axios from 'axios';

const PROXY_BASE = 'http://localhost:3001/api';

export interface KonexialVehicle {
  id: string;
  truck_number: string;
  last_position?: {
    latitude: number;
    longitude: number;
    timestamp: string;
    speed?: number;
    heading?: number;
  };
}

interface KonexialResponse<T> {
  data: T;
  status: number;
  message?: string;
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
      const response = await axios.get<KonexialResponse<KonexialVehicle[]>>(`${PROXY_BASE}/vehicles`);
      console.log('Proxy Response:', response.status, response.statusText);
      return response.data.data || [];
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
      const response = await axios.get<KonexialResponse<KonexialVehicle>>(`${PROXY_BASE}/vehicles/${vehicleId}`);
      console.log('Vehicle position response:', response.status, response.statusText);
      return response.data.data;
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
  }
}; 