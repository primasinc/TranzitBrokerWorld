require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const port = 3001;

// Enable CORS for our React app
app.use(cors({
  origin: 'http://localhost:3000'
}));

// Konexial API configuration - using exact values from their example
const KONEXIAL_API_BASE = 'https://user-service.konexial.com/public_api/v1';
const headers = {
  'CarrierID': '7620',
  'Authorization': 'Bearer $2b$12$CkkDJ91OiIGqfKVxUIU6zO0HtNTVBVpFupeHSmUA2LIPwf95NYQgS'
};

// Helper function to get vehicle position
async function getVehiclePosition(vehicleId) {
  try {
    console.log(`Fetching position for vehicle ${vehicleId}...`);
    const response = await axios.get(`${KONEXIAL_API_BASE}/vehicle/${vehicleId}/position`, { headers });
    console.log(`Position response for ${vehicleId}:`, response.status);
    return response.data;
  } catch (error) {
    console.error(`Error fetching position for vehicle ${vehicleId}:`, error.message);
    return null;
  }
}

// Proxy endpoint for vehicles
app.get('/api/vehicles', async (req, res) => {
  try {
    console.log('Proxying request to Konexial API for vehicles...');
    console.log('Using headers:', headers);
    
    // Get vehicles
    const vehiclesResponse = await axios.get(`${KONEXIAL_API_BASE}/vehicles?page_count=100`, { headers });
    console.log('Konexial API Response:', vehiclesResponse.status);
    
    // Get position for each vehicle
    const vehicles = await Promise.all(
      vehiclesResponse.data.map(async (vehicle) => {
        const position = await getVehiclePosition(vehicle.id);
        return {
          ...vehicle,
          last_position: position
        };
      })
    );
    
    res.json(vehicles);
  } catch (error) {
    console.error('Error fetching vehicles:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('Full error response:', JSON.stringify(error.response.data, null, 2));
    }
    res.status(error.response?.status || 500).json({
      error: error.response?.data || 'Internal Server Error'
    });
  }
});

// Proxy endpoint for specific vehicle position
app.get('/api/vehicles/:id/position', async (req, res) => {
  try {
    const { id } = req.params;
    const position = await getVehiclePosition(id);
    if (position) {
      res.json(position);
    } else {
      res.status(404).json({ error: 'Position not found' });
    }
  } catch (error) {
    console.error('Error fetching vehicle position:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data || 'Internal Server Error'
    });
  }
});

app.listen(port, () => {
  console.log(`Proxy server running at http://localhost:${port}`);
  console.log('Headers being used:', headers);
}); 