import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function migrateLoads() {
  const loadsRef = db.collection('loads');
  const snapshot = await loadsRef.get();
  let updatedCount = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    let updateData: any = {};

    // Always set from first item if available
    if (Array.isArray(data.items) && data.items.length > 0) {
      const firstItem = data.items[0];
      if (firstItem.weight) {
        updateData.weight = firstItem.weight;
      }
      if (firstItem.dimensions) {
        if (typeof firstItem.dimensions === 'object' && firstItem.dimensions !== null) {
          const { length, width, height } = firstItem.dimensions;
          updateData.dimensions = `${length || ''}x${width || ''}x${height || ''}`;
        } else {
          updateData.dimensions = firstItem.dimensions;
        }
      }
    }
    // Remove lingering carrierId from marketplace loads
    if (data.isMarketplace && 'carrierId' in data) {
      updateData.carrierId = admin.firestore.FieldValue.delete();
    }
    if (Object.keys(updateData).length > 0) {
      await doc.ref.update(updateData);
      updatedCount++;
      console.log(`Updated load ${doc.id}:`, updateData);
    }
  }
  console.log(`Migration complete. Updated ${updatedCount} loads.`);
}

migrateLoads().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
}); 