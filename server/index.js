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

// Konexial API configuration
const KONEXIAL_API_BASE = 'https://user-service.konexial.com/public_api/v1';
const API_ID = process.env.REACT_APP_KONEXIAL_API_ID;
const API_KEY = process.env.REACT_APP_KONEXIAL_API_KEY;

const headers = {
  'X-API-ID': API_ID,
  'X-API-KEY': API_KEY,
  'Accept': 'application/json'
};

// Proxy endpoint for vehicles
app.get('/api/vehicles', async (req, res) => {
  try {
    console.log('Proxying request to Konexial API for vehicles...');
    const response = await axios.get(`${KONEXIAL_API_BASE}/vehicles`, { headers });
    console.log('Konexial API Response:', response.status);
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching vehicles:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data || 'Internal Server Error'
    });
  }
});

// Proxy endpoint for specific vehicle
app.get('/api/vehicles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Proxying request to Konexial API for vehicle ${id}...`);
    const response = await axios.get(`${KONEXIAL_API_BASE}/vehicles/${id}`, { headers });
    console.log('Konexial API Response:', response.status);
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching vehicle:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data || 'Internal Server Error'
    });
  }
});

app.listen(port, () => {
  console.log(`Proxy server running at http://localhost:${port}`);
  console.log('API Configuration:', {
    API_ID_PRESENT: !!API_ID,
    API_KEY_PRESENT: !!API_KEY
  });
}); 