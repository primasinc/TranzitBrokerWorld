import { collection, getDocs, query, where, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../src/config/firebase';

/**
 * Script to clean up orphaned carrier rejection notifications
 * This removes notifications that don't have corresponding purchase orders
 */
export async function cleanupOrphanedNotifications() {
  console.log('[cleanupOrphanedNotifications] Starting cleanup...');
  
  try {
    // Get all carrier rejection notifications
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('type', '==', 'carrier_reject')
    );
    
    const notificationsSnapshot = await getDocs(notificationsQuery);
    let cleanedCount = 0;
    let totalCount = 0;
    
    for (const notificationDoc of notificationsSnapshot.docs) {
      totalCount++;
      const notificationData = notificationDoc.data();
      
      if (notificationData.poNumber) {
        // Check if the purchase order exists
        const poQuery = query(
          collection(db, 'purchaseOrders'),
          where('poNumber', '==', notificationData.poNumber)
        );
        const poSnapshot = await getDocs(poQuery);
        
        if (poSnapshot.empty) {
          // PO doesn't exist, mark notification as read
          console.log(`[cleanupOrphanedNotifications] Cleaning up orphaned notification for PO: ${notificationData.poNumber}`);
          await updateDoc(doc(db, 'notifications', notificationDoc.id), {
            read: true,
            updatedAt: serverTimestamp(),
          });
          cleanedCount++;
        }
      }
    }
    
    console.log(`[cleanupOrphanedNotifications] Cleanup complete. Processed ${totalCount} notifications, cleaned ${cleanedCount} orphaned notifications.`);
    
  } catch (error) {
    console.error('[cleanupOrphanedNotifications] Error during cleanup:', error);
  }
}

// Run cleanup if this script is executed directly
if (require.main === module) {
  cleanupOrphanedNotifications().then(() => {
    console.log('Cleanup script completed.');
    process.exit(0);
  }).catch((error) => {
    console.error('Cleanup script failed:', error);
    process.exit(1);
  });
} 