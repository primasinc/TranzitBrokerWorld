// cleanupMarketplaceLoads.ts
// Run this script with: npx ts-node scripts/cleanupMarketplaceLoads.ts

import * as admin from 'firebase-admin';
import * as path from 'path';
import { Timestamp } from 'firebase-admin/firestore';

const serviceAccount = require(path.resolve(__dirname, '../backend/serviceAccountKey.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function cleanupMarketplaceLoads() {
  const loadsRef = db.collection('loads');
  const snapshot = await loadsRef.get();

  let count = 0;
  let converted = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data();
    // Remove carrierId if present (regardless of value)
    const updateData: any = {};
    if ('carrierId' in data) {
      updateData.carrierId = admin.firestore.FieldValue.delete();
      count++;
    }
    // Convert string createdAt to Firestore Timestamp
    if (typeof data.createdAt === 'string') {
      const date = new Date(data.createdAt);
      if (!isNaN(date.getTime())) {
        updateData.createdAt = Timestamp.fromDate(date);
        converted++;
      }
    }
    if (Object.keys(updateData).length > 0) {
      await doc.ref.update(updateData);
    }
  }
  console.log(`Removed carrierId from ${count} loads.`);
  console.log(`Converted createdAt to Timestamp for ${converted} loads.`);
  process.exit(0);
}

cleanupMarketplaceLoads().catch(console.error); 