import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../src/config/firebase';

/**
 * Script to fix data inconsistencies in the loads collection
 * This ensures the law: isMarketplace: true should never have carrierId
 */
export async function fixLoadFlags() {
  console.log('[fixLoadFlags] Starting data consistency check...');
  
  const loadsSnapshot = await getDocs(collection(db, 'loads'));
  let fixedCount = 0;
  let errorCount = 0;
  
  for (const docSnapshot of loadsSnapshot.docs) {
    const data = docSnapshot.data();
    const updates: any = {};
    
    // Fix inconsistent flags
    if (data.isMarketplace === true && 'carrierId' in data) {
      console.log(`[fixLoadFlags] Fixing load ${docSnapshot.id}: marketplace load has carrierId field`);
      // Remove carrierId field entirely for marketplace loads
      updates.carrierId = null; // This will remove the field
      fixedCount++;
    }
    
    if (data.isMarketplace === false && !('carrierId' in data)) {
      console.log(`[fixLoadFlags] Fixing load ${docSnapshot.id}: partner load missing carrierId field`);
      updates.isMarketplace = true;
      fixedCount++;
    }
    
    if (Object.keys(updates).length > 0) {
      try {
        await updateDoc(doc(db, 'loads', docSnapshot.id), updates);
        console.log(`[fixLoadFlags] Successfully updated load ${docSnapshot.id}`);
      } catch (error) {
        console.error(`[fixLoadFlags] Error updating load ${docSnapshot.id}:`, error);
        errorCount++;
      }
    }
  }
  
  console.log(`[fixLoadFlags] Completed. Fixed ${fixedCount} loads, ${errorCount} errors.`);
}

// Run the script if called directly
if (require.main === module) {
  fixLoadFlags()
    .then(() => {
      console.log('[fixLoadFlags] Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[fixLoadFlags] Script failed:', error);
      process.exit(1);
    });
} 