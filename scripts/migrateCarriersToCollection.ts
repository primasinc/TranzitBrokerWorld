import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp({ credential: applicationDefault() });
const db = getFirestore();

async function migrateCarriers() {
  const usersSnap = await db.collection('users').where('userType', '==', 'carrier').get();
  for (const userDoc of usersSnap.docs) {
    const userData = userDoc.data();
    if (!userData.mcNumber) {
      console.warn(`User ${userDoc.id} is a carrier but has no MC Number. Skipping.`);
      continue;
    }
    // Use MC Number as the carrier document ID for uniqueness
    const carrierId = userData.mcNumber;
    const carrierData = {
      ...userData,
      userId: userDoc.id, // keep reference to original user
      migratedAt: new Date(),
    };
    await db.collection('carriers').doc(carrierId).set(carrierData, { merge: true });
    console.log(`Migrated carrier user ${userDoc.id} to carriers/${carrierId}`);
  }
  console.log('Carrier migration complete.');
}

migrateCarriers().catch(console.error); 