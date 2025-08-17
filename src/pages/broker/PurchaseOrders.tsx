import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './PurchaseOrders.module.css';
import { db } from '../../config/firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, where, getDoc, setDoc } from 'firebase/firestore';
import { PurchaseOrderForm } from '../../components/shipper/forms/PurchaseOrderForm';

enum PurchaseOrderStatus {
  PROCESSING = 'Processing',
  ACTIVE = 'Active',
  COMPLETED = 'Completed',
  CANCELLED = 'Cancelled'
}

interface PurchaseOrder {
  id?: string;
  poNumber: string;
  date: string;
  vendorInfo?: { name?: string };
  companyInfo?: { name?: string };
  shipTo?: { name?: string };
  status: string;
  amount?: number;
  total?: number;
  items?: any[];
  [key: string]: any; // fallback for any other fields
}

const PurchaseOrders: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [viewingPO, setViewingPO] = useState<PurchaseOrder | null>(null);
  const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [removeConfirmId, setRemoveConfirmId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const fetchOrders = async () => {
      const querySnapshot = await getDocs(collection(db, 'purchaseOrders'));
      const ordersData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data
        } as PurchaseOrder;
      });
      setOrders(ordersData);
    };
    fetchOrders();
  }, []);

  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      const isMobileScreen = window.innerWidth <= 768;
      setIsMobile(isMobileDevice || isMobileScreen);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.vendorInfo?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.companyInfo?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.shipTo?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || order.status === filterStatus;
    // Hide completed POs from this page
    const notCompleted = order.status !== 'Completed';
    return matchesSearch && matchesFilter && notCompleted;
  });

  const handleView = (po: PurchaseOrder) => setViewingPO(po);
  const handleEdit = (po: PurchaseOrder) => {
    navigate('/broker/test-po', { 
      state: { 
        editingPO: po,
        isEditing: true
      }
    });
  };
  const handleEditSave = async (data: any) => {
    if (!editingPO) return;
    const poRef = doc(db, 'purchaseOrders', editingPO.id!);
    await updateDoc(poRef, { ...data, userId: editingPO.userId });
    setOrders(orders => orders.map(o => o.id === editingPO.id ? { ...o, ...data, userId: editingPO.userId } : o));
    setEditingPO(null);
  };
  const handleDelete = (id: string) => setRemoveConfirmId(id);
  const handleRemoveFromList = async (id: string) => {
    try {
      console.log('Attempting to delete PO with id:', id);
      if (typeof id !== 'string' || !id.trim()) {
        alert('Invalid PO ID. Aborting deletion.');
        return;
      }
      // Find the PO to get its poNumber
      const poToDelete = orders.find(o => o.id === id);
      if (!poToDelete) {
        alert('PO not found.');
        return;
      }
      const poNumber = poToDelete.poNumber;
      // Delete all notifications with this poNumber
      if (poNumber) {
        const notificationsSnapshot = await getDocs(query(collection(db, 'notifications'), where('poNumber', '==', poNumber)));
        const deletePromises: Promise<void>[] = [];
        notificationsSnapshot.forEach(docSnap => {
          if (docSnap.exists() && docSnap.id && typeof docSnap.id === 'string' && docSnap.id.trim()) {
            console.log('Deleting notification:', docSnap.id);
            deletePromises.push(deleteDoc(doc(db, 'notifications', docSnap.id)));
          } else {
            console.warn('Skipping invalid notification doc:', docSnap.id);
          }
        });
        await Promise.all(deletePromises);
        // Delete all loads with this poNumber
        const loadsSnapshot = await getDocs(query(collection(db, 'loads'), where('poNumber', '==', poNumber)));
        const loadDeletePromises: Promise<void>[] = [];
        loadsSnapshot.forEach(loadDoc => {
          if (loadDoc.exists() && loadDoc.id && typeof loadDoc.id === 'string' && loadDoc.id.trim()) {
            console.log('Deleting load:', loadDoc.id);
            loadDeletePromises.push(deleteDoc(doc(db, 'loads', loadDoc.id)));
          } else {
            console.warn('Skipping invalid load doc:', loadDoc.id);
          }
        });
        await Promise.all(loadDeletePromises);
      }
      // Delete the PO itself
      const poRef = doc(db, 'purchaseOrders', id);
      const poDoc = await getDoc(poRef);
      if (poDoc.exists()) {
        console.log('Deleting PO:', id);
        await deleteDoc(poRef);
      } else {
        alert('PO document not found in Firestore.');
      }
      setOrders(orders => orders.filter(o => o.id !== id));
      setRemoveConfirmId(null);
    } catch (error) {
      console.error('Failed to remove PO:', error);
      alert('Failed to remove PO.');
      setRemoveConfirmId(null);
    }
  };
  const cancelAndSetCancelled = async (id: string) => {
    // Find the PO to get its poNumber
    const poToDelete = orders.find(o => o.id === id);
    if (!poToDelete) return;
    const poNumber = poToDelete.poNumber;
    try {
      // Mark the PO as cancelled instead of deleting it
      const poRef = doc(db, 'purchaseOrders', id);
      await updateDoc(poRef, {
        status: 'Cancelled',
        shippingScheduleStatus: 'Cancelled',
        cancelledAt: new Date().toISOString(),
      });
      // Mark related POs with the same poNumber as cancelled
      const schedulesSnapshot = await getDocs(query(collection(db, 'purchaseOrders'), where('poNumber', '==', poNumber)));
      const batchUpdates: Promise<any>[] = [];
      schedulesSnapshot.forEach(docSnap => {
        if (docSnap.id !== id) {
          batchUpdates.push(updateDoc(doc(db, 'purchaseOrders', docSnap.id), {
            status: 'Cancelled',
            shippingScheduleStatus: 'Cancelled',
            cancelledAt: new Date().toISOString(),
          }));
        }
      });
      await Promise.all(batchUpdates);
      // Mark related loads as cancelled
      const loadsSnapshot = await getDocs(query(collection(db, 'loads'), where('poNumber', '==', poNumber)));
      const loadUpdates: Promise<any>[] = [];
      loadsSnapshot.forEach(loadDoc => {
        loadUpdates.push(updateDoc(doc(db, 'loads', loadDoc.id), {
          status: 'cancelled',
          cancelledAt: new Date().toISOString(),
        }));
      });
      await Promise.all(loadUpdates);
      // Mark related notifications as cancelled
      const notificationsSnapshot = await getDocs(query(collection(db, 'notifications'), where('poNumber', '==', poNumber)));
      const notificationUpdates: Promise<any>[] = [];
      notificationsSnapshot.forEach(notificationDoc => {
        notificationUpdates.push(updateDoc(doc(db, 'notifications', notificationDoc.id), {
          status: 'cancelled',
          cancelledAt: new Date().toISOString(),
        }));
      });
      await Promise.all(notificationUpdates);
      // Update local state to reflect the status change
      setOrders(orders => orders.map(o =>
        o.id === id || o.poNumber === poNumber
          ? { ...o, status: 'Cancelled', shippingScheduleStatus: 'Cancelled' }
          : o
      ));
      setRemoveConfirmId(null);
    } catch (error) {
      console.error('Error cancelling PO:', error);
      alert('Failed to cancel PO. Please try again.');
      setRemoveConfirmId(null);
    }
  };
  const handleCancelInstead = async (id: string) => {
    setRemoveConfirmId(null);
    await cancelAndSetCancelled(id);
  };

  const handleCompletePO = async (order: any) => {
    try {
      console.log('[handleCompletePO] Completing PO:', order.poNumber, order.id);
      // Update the PO status to 'Completed' in 'purchaseOrders'
      const poRef = doc(db, 'purchaseOrders', order.id);
      await updateDoc(poRef, {
        status: 'Completed',
        shippingScheduleStatus: 'Completed',
        completedAt: new Date().toISOString(),
      });
      // Optionally, copy the PO to the 'poArchive' collection for historical purposes
      const poSnap = await getDoc(poRef);
      if (poSnap.exists()) {
        const poData = poSnap.data();
        const archiveRef = doc(collection(db, 'poArchive'));
        await setDoc(archiveRef, { ...poData, archivedAt: new Date().toISOString() });
      }
      // Update all related loads to completed
      if (order.poNumber) {
        const loadsSnapshot = await getDocs(query(collection(db, 'loads'), where('poNumber', '==', order.poNumber)));
        console.log('[handleCompletePO] Loads found for poNumber', order.poNumber, ':', loadsSnapshot.size);
        const loadUpdates: Promise<any>[] = [];
        loadsSnapshot.forEach(loadDoc => {
          console.log('[handleCompletePO] Updating load:', loadDoc.id);
          loadUpdates.push(updateDoc(doc(db, 'loads', loadDoc.id), {
            status: 'completed',
            shippingScheduleStatus: 'Completed',
            completedAt: new Date().toISOString(),
          }));
        });
        await Promise.all(loadUpdates);
        console.log('[handleCompletePO] All related loads updated.');
      }
      // Redirect to Load Archive page
      navigate('/broker/archive');
    } catch (err) {
      console.error('[handleCompletePO] Error completing PO:', err);
      alert('Failed to complete PO.');
    }
  };

  // Mobile card renderer
  const renderMobileCard = (order: PurchaseOrder) => (
    <div key={order.id || order.poNumber} className={styles.mobileCard}>
      <div className={styles.cardHeader}>
        <div className={styles.poSection}>
          <h3>PO: {order.poNumber}</h3>
          <div className={styles.date}>{order.date}</div>
        </div>
        <div className={styles.statusSection}>
          <span className={`${styles.status} ${styles[order.status.toLowerCase()]}`}>{order.status}</span>
        </div>
      </div>
      <div className={styles.cardContent}>
        <div className={styles.infoRow}><span className={styles.label}>Vendor:</span> <span className={styles.value}>{order.vendorInfo?.name || '-'}</span></div>
        <div className={styles.infoRow}><span className={styles.label}>Company:</span> <span className={styles.value}>{order.companyInfo?.name || '-'}</span></div>
        <div className={styles.infoRow}><span className={styles.label}>Ship To:</span> <span className={styles.value}>{order.shipTo?.name || '-'}</span></div>
        <div className={styles.infoRow}><span className={styles.label}>Amount:</span> <span className={styles.value}>${(order.rate ? order.rate : 0).toFixed(2)}</span></div>
        <div className={styles.infoRow}><span className={styles.label}>Items:</span> <span className={styles.value}>{order.items?.length ?? 0}</span></div>
        <div className={styles.infoRow}><span className={styles.label}>Delivery Date:</span> <span className={styles.value}>{order.date}</span></div>
      </div>
      <div className={styles.cardActions}>
        <button className={styles.actionButton} onClick={() => handleView(order)}>View</button>
        <button className={styles.actionButton} onClick={() => handleEdit(order)}>Edit</button>
        {order.status === 'Completed' ? (
          <button
            className={styles.completeButton}
            style={{ backgroundColor: '#28a745', color: 'white' }}
            onClick={() => handleCompletePO(order)}
          >
            Complete PO
          </button>
        ) : (
          <button className={styles.deleteButton} onClick={() => handleDelete(order.id!)}>Delete</button>
        )}
      </div>
    </div>
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Purchase Orders</h1>
        <button 
          className={styles.createButton}
          onClick={() => navigate('/broker/test-po')}
        >
          Create New PO
        </button>
      </div>

      <div className={styles.filters}>
        <div className={styles.searchBar}>
          <input
            type="text"
            placeholder="Search PO number, vendor, company, or ship to..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className={styles.statusFilter}>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value={PurchaseOrderStatus.PROCESSING}>Processing</option>
            <option value={PurchaseOrderStatus.ACTIVE}>Active</option>
            <option value={PurchaseOrderStatus.COMPLETED}>Completed</option>
            <option value={PurchaseOrderStatus.CANCELLED}>Cancelled</option>
          </select>
        </div>
      </div>

      <div className={styles.ordersTable}>
        {isMobile ? (
          <div className={styles.mobileCardsContainer}>
            {filteredOrders.length === 0 ? (
              <div className={styles.noData}>No purchase orders found.</div>
            ) : (
              filteredOrders.map(renderMobileCard)
            )}
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>PO Number</th>
                <th>Date</th>
                <th>Vendor</th>
                <th>Company</th>
                <th>Ship To</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Items</th>
                <th>Delivery Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.poNumber}>
                  <td>{order.poNumber}</td>
                  <td>{order.date}</td>
                  <td>{order.vendorInfo?.name}</td>
                  <td>{order.companyInfo?.name}</td>
                  <td>{order.shipTo?.name}</td>
                  <td>${(order.rate ? order.rate : 0).toFixed(2)}</td>
                  <td>
                    <span className={`${styles.status} ${styles[order.status.toLowerCase()]}`}>
                      {order.status}
                    </span>
                  </td>
                  <td>{order.items?.length ?? 0}</td>
                  <td>{order.date}</td>
                  <td>
                    <div className={styles.actions}>
                      <button className={styles.actionButton} onClick={() => handleView(order)}>View</button>
                      <button className={styles.actionButton} onClick={() => handleEdit(order)}>Edit</button>
                      {order.status === 'Completed' ? (
                        <button
                          className={styles.completeButton}
                          style={{ backgroundColor: '#28a745', color: 'white' }}
                          onClick={() => handleCompletePO(order)}
                        >
                          Complete PO
                        </button>
                      ) : (
                        <button className={styles.deleteButton} onClick={() => handleDelete(order.id!)}>Delete</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {viewingPO && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h2>Purchase Order Details</h2>
            <div>
              <strong>PO Number:</strong> {viewingPO.poNumber}<br />
              <strong>Date:</strong> {viewingPO.date}<br />
              <strong>Vendor:</strong> {viewingPO.vendorInfo?.name}<br />
              <strong>Company:</strong> {viewingPO.companyInfo?.name}<br />
              <strong>Ship To:</strong> {viewingPO.shipTo?.name}<br />
              <strong>Status:</strong> {viewingPO.status}<br />
              <strong>Amount:</strong> ${(viewingPO.total ?? viewingPO.amount ?? 0)}<br />
              <strong>Items:</strong>
              <ul>
                {(Array.isArray(viewingPO.items) ? viewingPO.items : []).map((item, idx) => (
                  <li key={idx}>
                    {item.description} (Qty: {item.quantity}, Price: ${item.price})
                  </li>
                ))}
              </ul>
            </div>
            <button onClick={() => setViewingPO(null)}>Close</button>
          </div>
        </div>
      )}
      {editingPO && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h2>Edit Purchase Order</h2>
            <PurchaseOrderForm
              onSubmit={handleEditSave}
              onCancel={() => setEditingPO(null)}
              initialData={editingPO}
            />
          </div>
        </div>
      )}
      {removeConfirmId && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalMessage}>Do you want to remove this purchase order from your list?</div>
            <div className={styles.modalActions}>
              <button className={styles.confirmButton} onClick={() => handleRemoveFromList(removeConfirmId)}>Yes</button>
              <button className={styles.confirmButton} onClick={() => handleCancelInstead(removeConfirmId)}>No</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseOrders;
