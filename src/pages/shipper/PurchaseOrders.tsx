import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './PurchaseOrders.module.css';
import { db } from '../../firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { PurchaseOrderForm } from '../../components/shipper/forms/PurchaseOrderForm';

enum PurchaseOrderStatus {
  DRAFT = 'Draft',
  PENDING_APPROVAL = 'Pending Approval',
  APPROVED = 'Approved',
  PROCESSING = 'Processing',
  PARTIALLY_SHIPPED = 'Partially Shipped',
  SHIPPED = 'Shipped',
  DELIVERED = 'Delivered',
  COMPLETED = 'Completed',
  CANCELLED = 'Cancelled',
  ON_HOLD = 'On Hold'
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

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.vendorInfo?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.companyInfo?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.shipTo?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || order.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const handleView = (po: PurchaseOrder) => setViewingPO(po);
  const handleEdit = (po: PurchaseOrder) => {
    navigate('/shipper/test-po', { 
      state: { 
        editingPO: po,
        isEditing: true
      }
    });
  };
  const handleEditSave = async (data: any) => {
    if (!editingPO) return;
    const poRef = doc(db, 'purchaseOrders', editingPO.id!);
    await updateDoc(poRef, data);
    setOrders(orders => orders.map(o => o.id === editingPO.id ? { ...o, ...data } : o));
    setEditingPO(null);
  };
  const handleDelete = (id: string) => setConfirmDeleteId(id);
  const confirmDelete = async (id: string) => {
    // Find the PO to get its poNumber
    const poToDelete = orders.find(o => o.id === id);
    if (!poToDelete) return;
    const poNumber = poToDelete.poNumber;
    // Delete from purchaseOrders
    await deleteDoc(doc(db, 'purchaseOrders', id));
    // Delete from shipping schedule (purchaseOrders collection, matching poNumber)
    const schedulesSnapshot = await getDocs(query(collection(db, 'purchaseOrders'), where('poNumber', '==', poNumber)));
    const batchDeletes: Promise<any>[] = [];
    schedulesSnapshot.forEach(docSnap => {
      if (docSnap.id !== id) { // Don't double-delete the same doc
        batchDeletes.push(deleteDoc(doc(db, 'purchaseOrders', docSnap.id)));
      }
    });
    await Promise.all(batchDeletes);
    setOrders(orders => orders.filter(o => o.id !== id && o.poNumber !== poNumber));
    setConfirmDeleteId(null);
  };
  const cancelDelete = () => setConfirmDeleteId(null);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Purchase Orders</h1>
        <button 
          className={styles.createButton}
          onClick={() => navigate('/shipper/test-po')}
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
            <option value={PurchaseOrderStatus.DRAFT}>Draft</option>
            <option value={PurchaseOrderStatus.PENDING_APPROVAL}>Pending Approval</option>
            <option value={PurchaseOrderStatus.APPROVED}>Approved</option>
            <option value={PurchaseOrderStatus.PROCESSING}>Processing</option>
            <option value={PurchaseOrderStatus.PARTIALLY_SHIPPED}>Partially Shipped</option>
            <option value={PurchaseOrderStatus.SHIPPED}>Shipped</option>
            <option value={PurchaseOrderStatus.DELIVERED}>Delivered</option>
            <option value={PurchaseOrderStatus.COMPLETED}>Completed</option>
            <option value={PurchaseOrderStatus.CANCELLED}>Cancelled</option>
            <option value={PurchaseOrderStatus.ON_HOLD}>On Hold</option>
          </select>
        </div>
      </div>

      <div className={styles.ordersTable}>
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
                <td>${(order.amount ?? 0).toFixed(2)}</td>
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
                    <button className={`${styles.actionButton} ${styles.deleteButton}`} onClick={() => handleDelete(order.id!)}>Delete</button>
                    {confirmDeleteId === order.id && (
                      <div className={styles.confirmDialog}>
                        <span>Are you sure you want to delete this PO?</span>
                        <button className={styles.actionButton} onClick={() => confirmDelete(order.id!)}>Yes</button>
                        <button className={styles.actionButton} onClick={cancelDelete}>No</button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
    </div>
  );
};

export default PurchaseOrders; 