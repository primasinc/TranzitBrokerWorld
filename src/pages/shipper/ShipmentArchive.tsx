import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getShipperShipments, ShipmentFilters, PaginationParams } from '../../services/shipmentService';
import { ShipmentData } from '../../types/shipment';
import styles from './ShipmentArchive.module.css';
import { useMobileOptimization } from '../../hooks/useMobileOptimization';

const ShipmentArchive: React.FC = () => {
  const { user } = useAuth();
  const [shipments, setShipments] = useState<ShipmentData[]>([]);
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

  const loadShipments = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const filters: ShipmentFilters = {
        searchTerm: searchTerm || undefined,
        status: status || undefined,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined
      };

      const pagination: PaginationParams = {
        page: currentPage,
        limit: ITEMS_PER_PAGE
      };

      const userId = (user as any)?.uid || (user as any)?.email || '';
      const result = await getShipperShipments(userId, filters, pagination);
      
      setShipments(result.shipments);
      setTotalCount(result.totalCount);
      setHasMore(result.hasMore);
    } catch (err) {
      setError('Failed to load shipments. Please try again.');
      console.error('Error loading shipments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShipments();
  }, [user, searchTerm, startDate, endDate, status, currentPage]);

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

  // Mobile card component for shipments
  const renderMobileShipmentCard = (shipment: ShipmentData) => (
    <div key={shipment.id} className={styles.mobileShipmentCard}>
      <div className={styles.cardHeader}>
        <div className={styles.poNumber}>{shipment.poNumber}</div>
        <span className={`${styles.status} ${getStatusClass(shipment.status)}`}>
          {shipment.status}
        </span>
      </div>
      
      <div className={styles.cardContent}>
        <div className={styles.cardRow}>
          <span className={styles.label}>Carrier:</span>
          <span className={styles.value}>{shipment.carrier.name}</span>
        </div>
        <div className={styles.cardRow}>
          <span className={styles.label}>Origin:</span>
          <span className={styles.value}>{shipment.origin}</span>
        </div>
        <div className={styles.cardRow}>
          <span className={styles.label}>Destination:</span>
          <span className={styles.value}>{shipment.destination}</span>
        </div>
        <div className={styles.cardRow}>
          <span className={styles.label}>Pickup:</span>
          <span className={styles.value}>{formatDate(shipment.scheduledPickup)}</span>
        </div>
        <div className={styles.cardRow}>
          <span className={styles.label}>Delivery:</span>
          <span className={styles.value}>{formatDate(shipment.scheduledDelivery)}</span>
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

  if (loading && !shipments.length) {
    return <div className={styles.loading}>Loading shipments...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Shipment Archive</h1>
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
          <h3>Total Shipments</h3>
          <p>{totalCount}</p>
        </div>
        <div className={styles.statCard}>
          <h3>Filtered Shipments</h3>
          <p>{shipments.length}</p>
        </div>
        <div className={styles.statCard}>
          <h3>Total Cost</h3>
          <p>{formatCurrency(shipments.reduce((sum, s) => sum + s.cost, 0))}</p>
        </div>
      </div>

      {/* Mobile Cards View */}
      {isMobile ? (
        <div className={styles.mobileShipmentsGrid}>
          {shipments.length > 0 ? (
            shipments.map(renderMobileShipmentCard)
          ) : (
            <div className={styles.noResults}>No shipments found matching your criteria.</div>
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
              {shipments.map(shipment => (
                <tr key={shipment.id}>
                  <td>{shipment.poNumber}</td>
                  <td>{shipment.carrier.name}</td>
                  <td>{shipment.origin}</td>
                  <td>{shipment.destination}</td>
                  <td>{formatDate(shipment.scheduledPickup)}</td>
                  <td>{formatDate(shipment.scheduledDelivery)}</td>
                  <td>
                    <span className={`${styles.status} ${getStatusClass(shipment.status)}`}>
                      {shipment.status}
                    </span>
                  </td>
                  <td>{formatCurrency(shipment.cost)}</td>
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

      {shipments.length === 0 && !loading && !isMobile && (
        <div className={styles.noResults}>No shipments found matching your criteria.</div>
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