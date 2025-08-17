import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
// import { getShipperShipments, ShipmentFilters, PaginationParams } from '../../services/shipmentService';
import { ShipmentData } from '../../types/shipment';
import styles from './ShipmentArchive.module.css';
import { useMobileOptimization } from '../../hooks/useMobileOptimization';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../config/firebase';

const ShipmentArchive: React.FC = () => {
  const { user } = useAuth();
  const [archivedPOs, setArchivedPOs] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const ITEMS_PER_PAGE = 10;

  // Mobile optimization
  const { 
    isLowBandwidth, 
    isLowBattery, 
    getOptimalPageSize, 
    shouldFetchData, 
    measurePerformance 
  } = useMobileOptimization({
    enableOfflineMode: true,
    enableLowBandwidthMode: true,
    enableBatteryOptimization: true
  });

  // Device detection for mobile layout
  const isMobile = window.innerWidth <= 768;

  const loadArchivedPOs = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const brokerId = user.uid;
      
      // Fetch POs from poArchive collection using brokerId
      const archiveQuery = query(collection(db, 'poArchive'), where('brokerId', '==', brokerId));
      const archiveSnapshot = await getDocs(archiveQuery);
      let archivedPOs = archiveSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        source: 'archive' // Mark as from archive collection
      }));
      
      // Fetch completed/cancelled POs from purchaseOrders collection using brokerId
      const completedQuery = query(
        collection(db, 'purchaseOrders'), 
        where('brokerId', '==', brokerId),
        where('status', 'in', ['Completed', 'Cancelled'])
      );
      const completedSnapshot = await getDocs(completedQuery);
      const completedPOs = completedSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        source: 'purchaseOrders' // Mark as from purchaseOrders collection
      }));
      
      // Combine both sets of POs
      let allPOs = [...archivedPOs, ...completedPOs];
      
      // Optional: filter/search logic
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        allPOs = allPOs.filter((po: any) =>
          (po.poNumber || '').toLowerCase().includes(searchLower) ||
          (po.vendorInfo?.name || '').toLowerCase().includes(searchLower) ||
          (po.companyInfo?.name || '').toLowerCase().includes(searchLower) ||
          (po.shipTo?.name || '').toLowerCase().includes(searchLower)
        );
      }
      
      setArchivedPOs(allPOs);
      setTotalCount(allPOs.length);
    } catch (err) {
      setError('Failed to load archived POs. Please try again.');
      console.error('Error loading archived POs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadArchivedPOs();
  }, [user, searchTerm]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page on new search
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'startDate') setStartDate(value);
    if (name === 'endDate') setEndDate(value);
    setCurrentPage(1);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatus(e.target.value);
    setCurrentPage(1);
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp.seconds * 1000).toLocaleDateString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatusClass = (status: string) => {
    return styles[status.toLowerCase()] || '';
  };

  // Always use the 'rate' field for cost (never N/A)
  const normalizedArchivedPOs = archivedPOs.map((po) => ({
    ...po,
    cost: typeof po.rate === 'number' ? po.rate : 0, // Always use 'rate' for cost
    // ...rest of normalization as before
    id: po.id || '',
    poNumber: po.poNumber || '',
    origin: po.origin || po.vendorInfo?.cityStateZip || '',
    destination: po.destination || po.shipTo?.cityStateZip || '',
    carrier: typeof po.carrier === 'object' && po.carrier !== null
      ? { id: po.carrier.id || '', name: po.carrier.name || '' }
      : { id: '', name: po.carrier || po.carrierName || '' },
    scheduledPickup: po.scheduledPickup || po.pickupDate || po.createdAt || null,
    scheduledDelivery: po.scheduledDelivery || po.deliveryDate || po.updatedAt || null,
    status: po.status || 'archived',
    userId: po.userId || '',
    isOnTime: typeof po.isOnTime === 'boolean' ? po.isOnTime : false,
    createdAt: po.createdAt || null,
    updatedAt: po.updatedAt || null,
  }));

  // Calculate Total Cost as the sum of cost for all filtered/displayed POs
  const totalCostDisplayed = normalizedArchivedPOs.reduce((sum, po) => sum + po.cost, 0);

  // Defensive mobile card renderer
  const renderMobileShipmentCard = (shipment: any) => (
    <div key={shipment.id} className={styles.mobileShipmentCard}>
      <div className={styles.cardHeader}>
        <div className={styles.poNumber}>{shipment.poNumber || 'N/A'}</div>
        <span className={`${styles.status} ${getStatusClass(shipment.status)}`}>
          {shipment.status || 'N/A'}
        </span>
      </div>
      <div className={styles.cardContent}>
        <div className={styles.cardRow}>
          <span className={styles.label}>Carrier:</span>
          <span className={styles.value}>{shipment.carrier?.name || 'N/A'}</span>
        </div>
        <div className={styles.cardRow}>
          <span className={styles.label}>Origin:</span>
          <span className={styles.value}>{shipment.origin || 'N/A'}</span>
        </div>
        <div className={styles.cardRow}>
          <span className={styles.label}>Destination:</span>
          <span className={styles.value}>{shipment.destination || 'N/A'}</span>
        </div>
        <div className={styles.cardRow}>
          <span className={styles.label}>Pickup:</span>
          <span className={styles.value}>{shipment.scheduledPickup ? formatDate(shipment.scheduledPickup) : 'N/A'}</span>
        </div>
        <div className={styles.cardRow}>
          <span className={styles.label}>Delivery:</span>
          <span className={styles.value}>{shipment.scheduledDelivery ? formatDate(shipment.scheduledDelivery) : 'N/A'}</span>
        </div>
        <div className={styles.cardRow}>
          <span className={styles.label}>Cost:</span>
          <span className={styles.value}>{formatCurrency(shipment.cost)}</span>
        </div>
      </div>
      <div className={styles.cardActions}>
        <button className={styles.viewButton}>View</button>
        <button className={styles.downloadButton}>Download</button>
      </div>
    </div>
  );

  if (loading && !archivedPOs.length) {
    return <div className={styles.loading}>Loading archived POs...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Load Archive</h1>
        <div className={styles.exportButton}>
          <button onClick={() => console.log('Export functionality to be implemented')}>
            Export to CSV
          </button>
        </div>
      </div>

      <div className={styles.filters}>
        <div className={styles.searchBar}>
          <input
            type="text"
            placeholder="Search by carrier, origin, destination, or PO number"
            value={searchTerm}
            onChange={handleSearch}
          />
        </div>

        <div className={styles.dateFilters}>
          <div className={styles.dateInputGroup}>
            <label htmlFor="startDate" className={styles.dateLabel}>Start Date</label>
            <input
              type="date"
              id="startDate"
              name="startDate"
              value={startDate}
              onChange={handleDateChange}
              placeholder="Start Date"
            />
          </div>
          <div className={styles.dateInputGroup}>
            <label htmlFor="endDate" className={styles.dateLabel}>End Date</label>
            <input
              type="date"
              id="endDate"
              name="endDate"
              value={endDate}
              onChange={handleDateChange}
              placeholder="End Date"
            />
          </div>
        </div>

        <div className={styles.statusFilter}>
          <select value={status} onChange={handleStatusChange}>
            <option value="">All Statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="in_transit">In Transit</option>
            <option value="delivered">Delivered</option>
          </select>
        </div>
      </div>

      <div className={styles.statsCards}>
        <div className={styles.statCard}>
          <h3>Total Archived POs</h3>
          <p>{totalCount}</p>
        </div>
        <div className={styles.statCard}>
          <h3>Filtered Archived POs</h3>
          <p>{archivedPOs.length}</p>
        </div>
        <div className={styles.statCard}>
          <h3>Total Cost</h3>
          <p>{formatCurrency(totalCostDisplayed)}</p>
        </div>
      </div>

      {/* Mobile Cards View */}
      {isMobile ? (
        <div className={styles.mobileShipmentsGrid}>
          {normalizedArchivedPOs.length > 0 ? (
            normalizedArchivedPOs.map(renderMobileShipmentCard)
          ) : (
            <div className={styles.noResults}>No archived POs found matching your criteria.</div>
          )}
        </div>
      ) : (
        /* Desktop Table View */
        <div className={styles.shipmentsTable}>
          <table>
            <thead>
              <tr>
                <th>PO Number</th>
                <th>Carrier</th>
                <th>Origin</th>
                <th>Destination</th>
                <th>Scheduled Pickup</th>
                <th>Scheduled Delivery</th>
                <th>Status</th>
                <th>Cost</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {normalizedArchivedPOs.map(po => (
                <tr key={po.id}>
                  <td>{po.poNumber || 'N/A'}</td>
                  <td>{po.carrier?.name || 'N/A'}</td>
                  <td>{po.origin || 'N/A'}</td>
                  <td>{po.destination || 'N/A'}</td>
                  <td>{po.scheduledPickup ? formatDate(po.scheduledPickup) : 'N/A'}</td>
                  <td>{po.scheduledDelivery ? formatDate(po.scheduledDelivery) : 'N/A'}</td>
                  <td>
                    <span className={`${styles.status} ${getStatusClass(po.status)}`}>
                      {po.status || 'N/A'}
                    </span>
                  </td>
                  <td>{formatCurrency(po.cost)}</td>
                  <td className={styles.actions}>
                    <button className={styles.viewButton}>View</button>
                    <button className={styles.downloadButton}>Download</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {archivedPOs.length === 0 && !loading && !isMobile && (
        <div className={styles.noResults}>No archived POs found matching your criteria.</div>
      )}

      {hasMore && (
        <div className={styles.loadMore}>
          <button onClick={() => setCurrentPage(prev => prev + 1)}>
            Load More
          </button>
        </div>
      )}

      {/* Mobile performance indicator */}
      {(isLowBandwidth || isLowBattery) && (
        <div className={styles.performanceIndicator}>
          {isLowBandwidth && <span>📶 Slow connection - Optimized loading</span>}
          {isLowBattery && <span>🔋 Low battery - Reduced animations</span>}
        </div>
      )}
    </div>
  );
};

export default ShipmentArchive;
