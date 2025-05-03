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

interface LocationResponse {
  vehicle_id: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  speed?: number;
  heading?: number;
}

export const konexialService = {
  async getVehicles(): Promise<KonexialVehicle[]> {
    try {
      console.log('Making request to proxy for vehicles...');
      
      // Get both vehicles and locations in parallel
      const [vehiclesResponse, locationsResponse] = await Promise.all([
        axios.get<KonexialVehicle[]>(`${PROXY_BASE}/vehicles`),
        axios.get<{locations: LocationResponse[]}>(`${PROXY_BASE}/vehicles/locations`)
      ]);
      
      console.log('Proxy Response:', vehiclesResponse.status, vehiclesResponse.statusText);
      console.log('Locations Response:', locationsResponse.status, locationsResponse.statusText);
      
      // Create a map of vehicle locations by vehicle ID
      const locationMap = new Map(
        (locationsResponse.data.locations || []).map((loc: LocationResponse) => [loc.vehicle_id, {
          latitude: loc.latitude,
          longitude: loc.longitude,
          timestamp: loc.timestamp,
          speed: loc.speed,
          heading: loc.heading
        }])
      );
      
      // Merge locations with vehicle data
      const vehicles = vehiclesResponse.data.map(vehicle => ({
        ...vehicle,
        last_position: locationMap.get(vehicle.id) || undefined
      }));
      
      // Debug output to see structure
      console.log('First vehicle data:');
      console.table(vehicles[0]);
      
      console.log('Processed vehicles with locations:', vehicles);
      return vehicles;
      
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
  }
}; 