import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp({ credential: applicationDefault() });
const db = getFirestore();

async function alignPartnerCarrierIds() {
  const usersSnap = await db.collection('users').get();
  for (const userDoc of usersSnap.docs) {
    const userId = userDoc.id;
    const partnersSnap = await db.collection('users').doc(userId).collection('partners').get();
    for (const partnerDoc of partnersSnap.docs) {
      const partnerData = partnerDoc.data();
      let carrierId: string | null = null;
      let matchReason = '';

      // Try to match by company name
      if (partnerData.companyName) {
        const match = await db.collection('carriers').where('companyName', '==', partnerData.companyName).limit(1).get();
        if (!match.empty) {
          carrierId = match.docs[0].id;
          matchReason = 'companyName';
        }
      }
      // Try to match by MC number
      if (!carrierId && partnerData.mcNumber) {
        const match = await db.collection('carriers').where('mcNumber', '==', partnerData.mcNumber).limit(1).get();
        if (!match.empty) {
          carrierId = match.docs[0].id;
          matchReason = 'mcNumber';
        }
      }
      // Try to match by email
      if (!carrierId && partnerData.email) {
        const match = await db.collection('carriers').where('email', '==', partnerData.email).limit(1).get();
        if (!match.empty) {
          carrierId = match.docs[0].id;
          matchReason = 'email';
        }
      }
      if (carrierId) {
        await partnerDoc.ref.update({ carrierId });
        console.log(`Updated partner ${partnerDoc.id} for user ${userId} with carrierId ${carrierId} (matched by ${matchReason})`);
      } else {
        console.warn(`No carrier match found for partner ${partnerDoc.id} (user ${userId})`);
      }
    }
  }
  console.log('Alignment complete.');
}

alignPartnerCarrierIds().catch(console.error); 