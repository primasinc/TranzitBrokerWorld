import * as admin from 'firebase-admin';
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount)
});

export const db = admin.firestore();

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import vehiclesRoutes from './routes/vehicles';
import quickbooksRoutes from './routes/quickbooks';

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehiclesRoutes);
app.use('/api/quickbooks', quickbooksRoutes);

app.post('/api/po/book-load', async (req, res) => {
  try {
    const { poNumber, carrier } = req.body;
    if (!poNumber || !carrier) {
      return res.status(400).json({ error: 'Missing poNumber or carrier' });
    }
    // Find the PO by poNumber
    const poSnapshot = await db.collection('purchaseOrders').where('poNumber', '==', poNumber).get();
    if (poSnapshot.empty) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }
    const poRef = poSnapshot.docs[0].ref;
    await poRef.update({
      status: 'Carrier Pending',
      pendingCarrier: carrier
    });
    return res.json({ success: true });
  } catch (error) {
    console.error('Error updating PO:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/vehicles', (req, res) => {
  res.json({ message: 'Vehicles endpoint is working!' });
});

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tranzit')
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
  });

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 