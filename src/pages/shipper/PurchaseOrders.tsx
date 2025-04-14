import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './PurchaseOrders.module.css';

interface PurchaseOrder {
  poNumber: string;
  date: string;
  vendor: string;
  amount: number;
  status: string;
  items: number;
  deliveryDate: string;
}

const PurchaseOrders: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const orders: PurchaseOrder[] = [
    {
      poNumber: "PO-12345",
      date: "2024-02-23",
      vendor: "ABC Supplies",
      amount: 5000.00,
      status: "Processing",
      items: 3,
      deliveryDate: "2024-03-01"
    },
    {
      poNumber: "PO-12346",
      date: "2024-02-22",
      vendor: "XYZ Corp",
      amount: 7500.00,
      status: "Shipped",
      items: 5,
      deliveryDate: "2024-02-28"
    },
    // Add more orders as needed
  ];

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.vendor.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || order.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

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
            placeholder="Search PO number or vendor..."
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
            <option value="Processing">Processing</option>
            <option value="Shipped">Shipped</option>
            <option value="Delivered">Delivered</option>
            <option value="Cancelled">Cancelled</option>
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
                <td>{order.vendor}</td>
                <td>${order.amount.toFixed(2)}</td>
                <td>
                  <span className={`${styles.status} ${styles[order.status.toLowerCase()]}`}>
                    {order.status}
                  </span>
                </td>
                <td>{order.items}</td>
                <td>{order.deliveryDate}</td>
                <td>
                  <div className={styles.actions}>
                    <button className={styles.actionButton}>View</button>
                    <button className={styles.actionButton}>Edit</button>
                    <button className={`${styles.actionButton} ${styles.deleteButton}`}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PurchaseOrders; 