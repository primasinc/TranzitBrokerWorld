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

async function auditMarketplaceLoads() {
  const loadsRef = db.collection('loads');
  const snapshot = await loadsRef.get();

  let count = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (data.isMarketplace && 'carrierId' in data) {
      console.log(`Marketplace load with carrierId: ${doc.id}`, data);
      count++;
    }
  }
  console.log(`Found ${count} marketplace loads with a carrierId field.`);
  process.exit(0);
}

async function migrateShipperIdToUserId() {
  const loadsRef = db.collection('loads');
  const snapshot = await loadsRef.get();
  let migrated = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if ('shipperId' in data && !('userId' in data)) {
      await doc.ref.update({
        userId: data.shipperId,
        shipperId: admin.firestore.FieldValue.delete()
      });
      console.log(`Migrated load ${doc.id}: set userId to ${data.shipperId} and removed shipperId.`);
      migrated++;
    }
  }
  console.log(`Migrated ${migrated} loads from shipperId to userId.`);
  process.exit(0);
}

// Uncomment to run the migration
migrateShipperIdToUserId();

auditMarketplaceLoads(); 