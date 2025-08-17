import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter,
  writeBatch,
  serverTimestamp,
  QueryDocumentSnapshot,
  DocumentData
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Broker Purchase Orders Service
export class BrokerPurchaseOrderService {
  private collectionName = 'brokerPurchaseOrders';

  async getPurchaseOrders(brokerId: string, status?: string): Promise<any[]> {
    try {
      let q = query(
        collection(db, this.collectionName),
        where('brokerId', '==', brokerId)
      );
      
      if (status && status !== 'all') {
        q = query(q, where('status', '==', status));
      }
      
      q = query(q, orderBy('createdAt', 'desc'));
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching broker purchase orders:', error);
      throw error;
    }
  }

  async getPurchaseOrder(poId: string): Promise<any> {
    try {
      const docRef = doc(db, this.collectionName, poId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      }
      return null;
    } catch (error) {
      console.error('Error fetching purchase order:', error);
      throw error;
    }
  }

  async createPurchaseOrder(data: any): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, this.collectionName), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating purchase order:', error);
      throw error;
    }
  }

  async updatePurchaseOrder(poId: string, data: any): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, poId);
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating purchase order:', error);
      throw error;
    }
  }

  async deletePurchaseOrder(poId: string): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, poId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting purchase order:', error);
      throw error;
    }
  }

  async getPurchaseOrdersPaginated(
    brokerId: string, 
    pageSize: number = 20, 
    lastDoc?: QueryDocumentSnapshot<DocumentData>
  ): Promise<{ data: any[], lastDoc: QueryDocumentSnapshot<DocumentData> | null }> {
    try {
      let q = query(
        collection(db, this.collectionName),
        where('brokerId', '==', brokerId),
        orderBy('createdAt', 'desc'),
        limit(pageSize)
      );

      if (lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return {
        data,
        lastDoc: snapshot.docs[snapshot.docs.length - 1] || null
      };
    } catch (error) {
      console.error('Error fetching paginated purchase orders:', error);
      throw error;
    }
  }
}

// Broker Loads Service
export class BrokerLoadService {
  private collectionName = 'brokerLoads';

  async getLoads(brokerId: string, status?: string): Promise<any[]> {
    try {
      let q = query(
        collection(db, this.collectionName),
        where('brokerId', '==', brokerId)
      );
      
      if (status && status !== 'all') {
        q = query(q, where('status', '==', status));
      }
      
      q = query(q, orderBy('createdAt', 'desc'));
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching broker loads:', error);
      throw error;
    }
  }

  async getLoad(loadId: string): Promise<any> {
    try {
      const docRef = doc(db, this.collectionName, loadId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      }
      return null;
    } catch (error) {
      console.error('Error fetching load:', error);
      throw error;
    }
  }

  async createLoad(data: any): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, this.collectionName), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating load:', error);
      throw error;
    }
  }

  async updateLoad(loadId: string, data: any): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, loadId);
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating load:', error);
      throw error;
    }
  }

  async deleteLoad(loadId: string): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, loadId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting load:', error);
      throw error;
    }
  }
}

// Broker Notifications Service
export class BrokerNotificationService {
  private collectionName = 'brokerNotifications';

  async getNotifications(brokerId: string, unreadOnly: boolean = false): Promise<any[]> {
    try {
      let q = query(
        collection(db, this.collectionName),
        where('brokerId', '==', brokerId)
      );
      
      if (unreadOnly) {
        q = query(q, where('read', '==', false));
      }
      
      q = query(q, orderBy('createdAt', 'desc'));
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching broker notifications:', error);
      throw error;
    }
  }

  async markAsRead(notificationId: string): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, notificationId);
      await updateDoc(docRef, {
        read: true,
        readAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  async createNotification(data: any): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, this.collectionName), {
        ...data,
        createdAt: serverTimestamp(),
        read: false
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }
}

// Broker Metrics Service
export class BrokerMetricsService {
  private collectionName = 'brokerMetrics';

  async getMetrics(brokerId: string): Promise<any> {
    try {
      const docRef = doc(db, this.collectionName, brokerId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      }
      return null;
    } catch (error) {
      console.error('Error fetching broker metrics:', error);
      throw error;
    }
  }

  async updateMetrics(brokerId: string, data: any): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, brokerId);
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating broker metrics:', error);
      throw error;
    }
  }

  async incrementMetric(brokerId: string, field: string, amount: number = 1): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, brokerId);
      await updateDoc(docRef, {
        [field]: amount,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error incrementing broker metric:', error);
      throw error;
    }
  }
}

// Export service instances
export const brokerPurchaseOrderService = new BrokerPurchaseOrderService();
export const brokerLoadService = new BrokerLoadService();
export const brokerNotificationService = new BrokerNotificationService();
export const brokerMetricsService = new BrokerMetricsService();
