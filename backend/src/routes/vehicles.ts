import { Router } from 'express';
import axios from 'axios';

const router = Router();

// Replace with your real Konexial API credentials
const KONEXIAL_API_BASE = 'https://user-service.konexial.com/public_api/v1';
const KONEXIAL_CARRIER_ID = '7620';
const KONEXIAL_API_KEY = '$2b$12$CkkDJ91OiIGqfKVxUIU6zO0HtNTVBVpFupeHSmUA2LIPwf95NYQgS';

const headers = {
  'CarrierID': KONEXIAL_CARRIER_ID,
  'Authorization': `Bearer ${KONEXIAL_API_KEY}`,
};

router.get('/', async (req, res) => {
  try {
    // Fetch vehicles
    const vehiclesResponse = await axios.get(`${KONEXIAL_API_BASE}/vehicles?page_count=100`, { headers });
    const vehicles = vehiclesResponse.data;

    // For each vehicle, fetch its latest location
    const vehiclesWithLocation = await Promise.all(
      vehicles.map(async (vehicle: any) => {
        try {
          const locRes = await axios.get(
            `${KONEXIAL_API_BASE}/vehicles/${vehicle.id}/locations?limit=1`,
            { headers }
          );
          const locations = locRes.data.locations || [];
          console.log(`Vehicle ${vehicle.id} locations:`, locations);
          return {
            ...vehicle,
            last_position: locations[0] || null
          };
        } catch (err) {
          // If location fetch fails, just return the vehicle without location
          return {
            ...vehicle,
            last_position: null
          };
        }
      })
    );

    res.json(vehiclesWithLocation);
  } catch (error: any) {
    if (error.response) {
      console.error('Konexial API error response:', error.response.data);
      res.status(error.response.status).json(error.response.data);
    } else {
      console.error('Error fetching vehicles from Konexial:', error.message);
      res.status(500).json({ error: 'Failed to fetch vehicles from Konexial' });
    }
  }
});

export default router;