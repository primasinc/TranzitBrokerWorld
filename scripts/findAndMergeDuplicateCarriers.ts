// scripts/findAndMergeDuplicateCarriers.ts
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp({ credential: applicationDefault() });
const db = getFirestore();

async function findAndMergeDuplicateCarriers() {
  const usersSnap = await db.collection('users').where('userType', '==', 'carrier').get();
  const carriersByMC: Record<string, any[]> = {};
  usersSnap.forEach(doc => {
    const data = doc.data();
    if (data.mcNumber) {
      if (!carriersByMC[data.mcNumber]) carriersByMC[data.mcNumber] = [];
      carriersByMC[data.mcNumber].push({ id: doc.id, ...data });
    }
  });
  for (const mc in carriersByMC) {
    if (carriersByMC[mc].length > 1) {
      // Keep the first, merge others
      const [primary, ...duplicates] = carriersByMC[mc];
      console.log(`Merging duplicates for MC ${mc}:`, duplicates.map(d => d.id));
      // Update all partner references to use primary.id
      const users = await db.collection('users').get();
      for (const userDoc of users.docs) {
        const partnersSnap = await db.collection('users').doc(userDoc.id).collection('partners').get();
        for (const partnerDoc of partnersSnap.docs) {
          const partnerData = partnerDoc.data();
          if (duplicates.some(d => d.id === partnerData.carrierId)) {
            await db.collection('users').doc(userDoc.id).collection('partners').doc(partnerDoc.id).update({ carrierId: primary.id });
          }
        }
      }
      // Optionally, merge data from duplicates into primary (not implemented here)
      // Delete duplicates
      for (const dup of duplicates) {
        await db.collection('users').doc(dup.id).delete();
      }
    }
  }
  console.log('Duplicate carrier merge complete.');
}

findAndMergeDuplicateCarriers().catch(console.error); 