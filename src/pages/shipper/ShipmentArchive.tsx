import React, { useState } from 'react';
import styles from './ShipmentArchive.module.css';

interface Shipment {
  id: string;
  poNumber: string;
  shipDate: string;
  deliveryDate: string;
  origin: string;
  destination: string;
  carrier: string;
  status: 'Completed' | 'Cancelled';
  cost: number;
  weight: string;
  type: string;
}

const ShipmentArchive: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [statusFilter, setStatusFilter] = useState('all');

  const shipments: Shipment[] = [
    {
      id: "SH001",
      poNumber: "PO-12345",
      shipDate: "2024-01-15",
      deliveryDate: "2024-01-17",
      origin: "Chicago, IL",
      destination: "New York, NY",
      carrier: "ABC Trucking",
      status: "Completed",
      cost: 2500.00,
      weight: "15,000 lbs",
      type: "FTL"
    },
    {
      id: "SH002",
      poNumber: "PO-12346",
      shipDate: "2024-01-20",
      deliveryDate: "2024-01-22",
      origin: "Los Angeles, CA",
      destination: "Phoenix, AZ",
      carrier: "XYZ Logistics",
      status: "Completed",
      cost: 1800.00,
      weight: "8,000 lbs",
      type: "LTL"
    },
    // Add more shipments as needed
  ];

  const filteredShipments = shipments.filter(shipment => {
    const matchesSearch = 
      shipment.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shipment.carrier.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shipment.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shipment.destination.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || shipment.status.toLowerCase() === statusFilter.toLowerCase();
    
    const matchesDate = (!dateRange.start || shipment.shipDate >= dateRange.start) &&
                       (!dateRange.end || shipment.shipDate <= dateRange.end);
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Shipment Archive</h1>
        <div className={styles.exportButton}>
          <button>Export Data</button>
        </div>
      </div>

      <div className={styles.filters}>
        <div className={styles.searchBar}>
          <input
            type="text"
            placeholder="Search shipments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className={styles.dateFilters}>
          <input
            type="date"
            placeholder="Start Date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
          />
          <input
            type="date"
            placeholder="End Date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
          />
        </div>

        <div className={styles.statusFilter}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <div className={styles.statsCards}>
        <div className={styles.statCard}>
          <h3>Total Shipments</h3>
          <p>{shipments.length}</p>
        </div>
        <div className={styles.statCard}>
          <h3>Total Cost</h3>
          <p>${shipments.reduce((sum, ship) => sum + ship.cost, 0).toFixed(2)}</p>
        </div>
        <div className={styles.statCard}>
          <h3>Completion Rate</h3>
          <p>{((shipments.filter(s => s.status === 'Completed').length / shipments.length) * 100).toFixed(1)}%</p>
        </div>
      </div>

      <div className={styles.shipmentsTable}>
        <table>
          <thead>
            <tr>
              <th>PO Number</th>
              <th>Ship Date</th>
              <th>Delivery Date</th>
              <th>Origin</th>
              <th>Destination</th>
              <th>Carrier</th>
              <th>Status</th>
              <th>Cost</th>
              <th>Weight</th>
              <th>Type</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredShipments.map((shipment) => (
              <tr key={shipment.id}>
                <td>{shipment.poNumber}</td>
                <td>{shipment.shipDate}</td>
                <td>{shipment.deliveryDate}</td>
                <td>{shipment.origin}</td>
                <td>{shipment.destination}</td>
                <td>{shipment.carrier}</td>
                <td>
                  <span className={`${styles.status} ${styles[shipment.status.toLowerCase()]}`}>
                    {shipment.status}
                  </span>
                </td>
                <td>${shipment.cost.toFixed(2)}</td>
                <td>{shipment.weight}</td>
                <td>{shipment.type}</td>
                <td>
                  <div className={styles.actions}>
                    <button className={styles.viewButton}>View</button>
                    <button className={styles.downloadButton}>Download</button>
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

export default ShipmentArchive; 