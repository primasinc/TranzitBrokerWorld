import { db } from '../config/firebase';
import { doc, getDoc } from 'firebase/firestore';

// Cache for geocoded addresses to avoid repeated API calls
const geocodeCache = new Map<string, [number, number]>();

export interface GeocodingResult {
  coordinates: [number, number];
  formattedAddress: string;
  confidence: number;
}

/**
 * Geocode an address using Mapbox API with caching
 */
export const geocodeAddress = async (
  address: string,
  accessToken: string
): Promise<GeocodingResult | null> => {
  try {
    // Check cache first
    const cacheKey = address.toLowerCase().trim();
    if (geocodeCache.has(cacheKey)) {
      const cached = geocodeCache.get(cacheKey)!;
      return {
        coordinates: cached,
        formattedAddress: address,
        confidence: 0.9
      };
    }

    // Geocode using Mapbox API
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${accessToken}&limit=1&types=place,address`
    );

    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      const feature = data.features[0];
      const [lng, lat] = feature.center;
      const coordinates: [number, number] = [lng, lat];
      
      // Cache the result
      geocodeCache.set(cacheKey, coordinates);
      
      return {
        coordinates,
        formattedAddress: feature.place_name,
        confidence: feature.relevance
      };
    }

    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

/**
 * Geocode a load's pickup location using real address data
 */
export const geocodeLoadLocation = async (
  load: any,
  accessToken: string
): Promise<[number, number] | null> => {
  try {
    // Try to get the most specific address available
    let addressToGeocode = '';
    
    if (load.pickupLocation?.fullAddress) {
      addressToGeocode = load.pickupLocation.fullAddress;
    } else if (load.pickupLocation?.cityStateZip) {
      addressToGeocode = load.pickupLocation.cityStateZip;
    } else if (load.pickup) {
      addressToGeocode = load.pickup;
    } else if (load.origin) {
      addressToGeocode = load.origin;
    }

    if (!addressToGeocode) {
      return null;
    }

    const result = await geocodeAddress(addressToGeocode, accessToken);
    return result?.coordinates || null;
  } catch (error) {
    console.error('Error geocoding load location:', error);
    return null;
  }
}

/**
 * Get broker's default location from profile or use fallback
 */
export const getBrokerDefaultLocation = async (userId: string): Promise<[number, number]> => {
  try {
    const userDocRef = doc(db, 'users', userId);
    const docSnap = await getDoc(userDocRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      const addressParts = [data.address, data.city, data.state, data.zip].filter(Boolean);
      
      if (addressParts.length > 0) {
        const fullAddress = addressParts.join(', ');
        const accessToken = process.env.REACT_APP_MAPBOX_TOKEN;
        
        if (accessToken) {
          const result = await geocodeAddress(fullAddress, accessToken);
          if (result) {
            return result.coordinates;
          }
        }
      }
    }
  } catch (error) {
    console.error('Error getting broker default location:', error);
  }
  
  // Fallback to a central US location (Kansas City) instead of hardcoded Chicago
  return [-94.5786, 39.0997];
}

/**
 * Batch geocode multiple addresses efficiently
 */
export const batchGeocodeAddresses = async (
  addresses: string[],
  accessToken: string
): Promise<Map<string, [number, number]>> => {
  const results = new Map<string, [number, number]>();
  const uniqueAddresses = [...new Set(addresses)];
  
  // Process in parallel with rate limiting
  const batchSize = 5;
  for (let i = 0; i < uniqueAddresses.length; i += batchSize) {
    const batch = uniqueAddresses.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async (address) => {
      const result = await geocodeAddress(address, accessToken);
      if (result) {
        results.set(address, result.coordinates);
      }
    });
    
    await Promise.all(batchPromises);
    
    // Rate limiting: wait 100ms between batches
    if (i + batchSize < uniqueAddresses.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
}
