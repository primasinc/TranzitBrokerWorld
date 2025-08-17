import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import styles from './ShippingSchedule.module.css';
import { db } from '../../config/firebase';
import { collection, getDocs, doc, updateDoc, getDoc, addDoc, serverTimestamp, query, where } from 'firebase/firestore';
import CarrierProfileCard from '../../components/carrier/CarrierProfileCard';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, format, parse } from 'date-fns';
import { useMobileOptimization } from '../../hooks/useMobileOptimization';
import { MobileOptimizedList } from '../../components/common/MobileOptimizedList';
import { useAuth } from '../../contexts/AuthContext';

interface LocationState {
  filter?: 'active' | 'delayed';
  period?: string;
}

interface ScheduledLoad {
  id: string;
  date: string;
  time: string;
  destination: string;
  carrier: string;
  status: 'Open' | 'Carrier Pending' | 'Active' | 'Completed';
  type: string;
  shipTo?: string;
  poNumber: string;
  pickup?: string;
  cost: number;
}

const ShippingSchedule: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [viewType, setViewType] = useState<'calendar' | 'list'>('list');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filter, setFilter] = useState<'active' | 'delayed' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [showCarrierReview, setShowCarrierReview] = useState(false);
  const [reviewCarrierProfile, setReviewCarrierProfile] = useState<any>(null);
  const [reviewOrderId, setReviewOrderId] = useState<string | null>(null);
  const [reviewCarrierId, setReviewCarrierId] = useState<string | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const [loads, setLoads] = useState<ScheduledLoad[]>([]);
  const [loading, setLoading] = useState(true);

  // Status mapping function to match shipper's system
  const getNormalizedStatus = (status: string): ScheduledLoad['status'] => {
    const statusMap: { [key: string]: ScheduledLoad['status'] } = {
      'open': 'Open',
      'carrier pending': 'Carrier Pending',
      'carrier pending/approval': 'Carrier Pending',
      'processing': 'Carrier Pending', // Map broker's 'Processing' to 'Carrier Pending'
      'active': 'Active',
      'completed': 'Completed'
    };
    const normalizedStatus = (status || '').toLowerCase();
    return statusMap[normalizedStatus] || 'Open';
  };

  // Function to refresh purchase orders data
  const refreshPurchaseOrders = async () => {
    try {
      setLoading(true);
      if (!user?.uid) {
        console.warn('No authenticated user found');
        setLoading(false);
        return;
      }
      
      const brokerId = user.uid;
      
      const purchaseOrdersQuery = query(
        collection(db, 'purchaseOrders'),
        where('brokerId', '==', brokerId)
      );
      const purchaseOrdersSnapshot = await getDocs(purchaseOrdersQuery);
      
      const loadsData: ScheduledLoad[] = [];
      purchaseOrdersSnapshot.forEach(doc => {
        const po = doc.data();
        // Filter out cancelled orders like shipper does
        if (po.status?.toLowerCase() === 'cancelled') return;
        
        loadsData.push({
          id: doc.id,
          date: po.date || new Date().toISOString().split('T')[0],
          time: po.scheduledTime || 'TBD',
          destination: po.shipTo?.cityStateZip || po.shipTo?.streetAddress || 'N/A',
          carrier: po.approvedCarrier?.companyName || po.pendingCarrier?.companyName || 'TBD',
          status: getNormalizedStatus(po.status),
          type: po.carrierOption === 'carrier' ? 'Partnered Carrier' : 
                po.carrierOption === 'marketplace' ? 'Marketplace' : 'Standard',
          poNumber: po.poNumber || 'N/A',
          pickup: po.vendorInfo?.cityStateZip || po.vendorInfo?.streetAddress || 'N/A',
          shipTo: po.shipTo?.name || 'N/A',
          cost: typeof po.rate === 'number' ? po.rate : (typeof po.total === 'number' ? po.total : 0)
        });
      });
      
      setLoads(loadsData);
    } catch (error) {
      console.error('Error refreshing purchase orders:', error);
    } finally {
      setLoading(false);
    }
  };

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

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);

  // Mobile detection effect
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

  // Fetch broker purchase orders on component mount
  useEffect(() => {
    if (authLoading) return; // Wait for auth to load
    
    if (!isAuthenticated || !user?.uid) {
      setLoading(false);
      return;
    }
    
    const fetchBrokerPurchaseOrders = async () => {
      try {
        setLoading(true);
        const brokerId = user.uid;
        
        // Fetch purchase orders for this broker
        const purchaseOrdersQuery = query(
          collection(db, 'purchaseOrders'),
          where('brokerId', '==', brokerId)
        );
        const purchaseOrdersSnapshot = await getDocs(purchaseOrdersQuery);
        
        const loadsData: ScheduledLoad[] = [];
        purchaseOrdersSnapshot.forEach(doc => {
          const po = doc.data();
          // Filter out cancelled orders like shipper does
          if (po.status?.toLowerCase() === 'cancelled') return;
          
          loadsData.push({
            id: doc.id,
            date: po.date || new Date().toISOString().split('T')[0],
            time: po.scheduledTime || 'TBD',
            destination: po.shipTo?.cityStateZip || po.shipTo?.streetAddress || 'N/A',
            carrier: po.approvedCarrier?.companyName || po.pendingCarrier?.companyName || 'TBD',
            status: getNormalizedStatus(po.status),
            type: po.carrierOption === 'carrier' ? 'Partnered Carrier' : 
                  po.carrierOption === 'marketplace' ? 'Marketplace' : 'Standard',
            poNumber: po.poNumber || 'N/A',
            pickup: po.vendorInfo?.cityStateZip || po.vendorInfo?.streetAddress || 'N/A',
            shipTo: po.shipTo?.name || 'N/A',
            cost: typeof po.rate === 'number' ? po.rate : (typeof po.total === 'number' ? po.total : 0)
          });
        });
        
        setLoads(loadsData);
      } catch (error) {
        console.error('Error fetching broker purchase orders:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchBrokerPurchaseOrders();
  }, [isAuthenticated, user?.uid, authLoading]);

  // Get filter from navigation state
  useEffect(() => {
    const state = location.state as LocationState;
    if (state?.filter) {
      setFilter(state.filter);
      // Clear the state to prevent filter persisting on refresh
      navigate('.', { replace: true });
    }
  }, [location, navigate]);

  // Filter schedules based on status and exclude completed
  const filteredSchedules = filter
    ? loads.filter(schedule => schedule.status.toLowerCase() === filter && schedule.status.toLowerCase() !== 'completed')
    : loads.filter(schedule => schedule.status.toLowerCase() !== 'completed');

  // Clear filter
  const handleClearFilter = () => {
    setFilter(null);
  };

  const handleEdit = (schedule: ScheduledLoad) => {
    setEditingId(schedule.id);
    setEditDate(schedule.date);
    setEditTime(schedule.time);
  };

  const handleEditSave = async (id: string) => {
    try {
      // Update the purchase order in Firestore
      const poRef = doc(db, 'purchaseOrders', id);
      await updateDoc(poRef, { 
        date: editDate, 
        scheduledTime: editTime,
        updatedAt: serverTimestamp()
      });
      
      // Refresh data to ensure consistency
      await refreshPurchaseOrders();
      
      setEditingId(null);
      setEditDate('');
      setEditTime('');
    } catch (error) {
      console.error('Error updating purchase order schedule:', error);
    }
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditDate('');
    setEditTime('');
  };

  const handleCancel = (id: string) => {
    setConfirmCancelId(id);
  };

  const confirmCancel = async (id: string) => {
    try {
      // Update the purchase order status in Firestore
      const poRef = doc(db, 'purchaseOrders', id);
      await updateDoc(poRef, { 
        status: 'Cancelled',
        updatedAt: serverTimestamp()
      });
      
      // Refresh data to ensure consistency
      await refreshPurchaseOrders();
      
      setConfirmCancelId(null);
    } catch (error) {
      console.error('Error cancelling purchase order schedule:', error);
    }
  };

  const cancelCancel = () => {
    setConfirmCancelId(null);
  };

  const handleCarrierReview = async (schedule: ScheduledLoad) => {
    setReviewLoading(true);
    try {
      // Fetch the purchase order document to get the pendingCarrier field
      const poDocSnap = await getDoc(doc(db, 'purchaseOrders', schedule.id));
      if (!poDocSnap.exists()) {
        setReviewLoading(false);
        alert('Purchase order not found.');
        console.error('[CarrierReview] Purchase order not found:', schedule.id);
        return;
      }
      const poData = poDocSnap.data();
      const pendingCarrier = poData?.pendingCarrier;
      console.log('[CarrierReview] pendingCarrier field:', pendingCarrier);
      if (!pendingCarrier || !pendingCarrier.id) {
        setReviewLoading(false);
        alert('No pending carrier found for this purchase order.');
        console.error('[CarrierReview] No pending carrier found for purchase order:', schedule.id);
        return;
      }
      // Fetch the full carrier profile from the users collection
      const carrierProfileSnap = await getDoc(doc(db, 'users', pendingCarrier.id));
      if (!carrierProfileSnap.exists()) {
        setReviewLoading(false);
        alert('Carrier profile not found.');
        console.error('[CarrierReview] Carrier profile not found for id:', pendingCarrier.id);
        return;
      }
      console.log('[CarrierReview] Carrier profile data:', carrierProfileSnap.data());
      setReviewCarrierProfile({ ...carrierProfileSnap.data(), id: pendingCarrier.id });
      setReviewOrderId(schedule.id);
      setReviewCarrierId(pendingCarrier.id);
      setShowCarrierReview(true);
    } catch (err) {
      alert('Error fetching carrier profile.');
      console.error('[CarrierReview] Error:', err);
    }
    setReviewLoading(false);
  };

  const handleApproveCarrier = async () => {
    if (!reviewOrderId || !reviewCarrierId || !reviewCarrierProfile) return;
    
    try {
      // Set approvedCarrier, status to Active, clear pendingCarrier - matching shipper logic
      const poRef = doc(db, 'purchaseOrders', reviewOrderId);
      await updateDoc(poRef, {
        approvedCarrier: {
          id: reviewCarrierId,
          companyName: reviewCarrierProfile.companyName || '',
          email: reviewCarrierProfile.email || '',
          phone: reviewCarrierProfile.phoneNumber || reviewCarrierProfile.phone || '',
          mcNumber: reviewCarrierProfile.mcNumber || '',
          dotNumber: reviewCarrierProfile.dotNumber || '',
        },
        status: 'Active',
        shippingScheduleStatus: 'Active', // Add shippingScheduleStatus like shipper
        carrierId: reviewCarrierId,
        pendingCarrier: null,
        updatedAt: serverTimestamp()
      });
      
      // Refresh data to ensure consistency
      await refreshPurchaseOrders();
      
      setShowCarrierReview(false);
      setReviewCarrierProfile(null);
      setReviewOrderId(null);
      setReviewCarrierId(null);
    } catch (error) {
      console.error('Error approving carrier:', error);
      alert('Failed to approve carrier. Please try again.');
    }
  };

  const handleRejectCarrier = async () => {
    if (!reviewOrderId || !reviewCarrierId || !reviewCarrierProfile) return;
    
    try {
      // Set status to Open, clear pendingCarrier - matching shipper logic
      const poRef = doc(db, 'purchaseOrders', reviewOrderId);
      await updateDoc(poRef, {
        status: 'Open',
        pendingCarrier: null,
        updatedAt: serverTimestamp()
      });
      
      // Refresh data to ensure consistency
      await refreshPurchaseOrders();
      
      setShowCarrierReview(false);
      setReviewCarrierProfile(null);
      setReviewOrderId(null);
      setReviewCarrierId(null);
    } catch (error) {
      console.error('Error rejecting carrier:', error);
      alert('Failed to reject carrier. Please try again.');
    }
  };

  // Helper: get all purchase orders for a given date
  const getLoadsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return loads.filter(load => load.date === dateStr);
  };

  // Calendar grid logic
  const renderCalendarGrid = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = '';
    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, 'd');
        const fullDate = format(day, 'yyyy-MM-dd');
        const hasLoads = loads.some(load => load.date === fullDate);
        days.push(
          <td
            key={day.toString()}
            className={
              `${styles.calendarCell} ${!isSameMonth(day, monthStart) ? styles.notCurrentMonth : ''} ` +
              `${selectedDate && isSameDay(day, selectedDate) ? styles.selectedDate : ''}`
            }
            onClick={() => setSelectedDate(parse(fullDate, 'yyyy-MM-dd', new Date()))}
            style={{ cursor: 'pointer', background: selectedDate && isSameDay(day, selectedDate) ? '#e3f2fd' : hasLoads ? '#e8f5e9' : undefined }}
          >
            <div>{formattedDate}</div>
            {hasLoads && <div className={styles.loadMarker} title="Purchase orders scheduled">●</div>}
          </td>
        );
        day = addDays(day, 1);
      }
      rows.push(<tr key={day.toString()}>{days}</tr>);
      days = [];
    }
    return (
      <table className={styles.calendarTable}>
        <thead>
          <tr>
            <th>Sun</th><th>Mon</th><th>Tue</th><th>Wed</th><th>Thu</th><th>Fri</th><th>Sat</th>
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
    );
  };



  const renderMobileCard = (schedule: ScheduledLoad) => {
    return (
      <div key={schedule.id} className={styles.mobileCard}>
        <div className={styles.cardHeader}>
          <div className={styles.poSection}>
            <h3>PO: {schedule.poNumber}</h3>
          </div>
          <div className={styles.statusSection}>
            <span className={styles[schedule.status.toLowerCase().replace(/\s+/g, '')]}>
              {schedule.status}
            </span>
          </div>
        </div>
        <div className={styles.routeSection}>
          <div className={styles.routeItem}>
            <div className={styles.routeLabel}>Pickup:</div>
            <div className={styles.routeValue}>{schedule.pickup || 'N/A'}</div>
          </div>
          <div className={styles.routeItem}>
            <div className={styles.routeLabel}>Destination:</div>
            <div className={styles.routeValue}>{schedule.destination}</div>
          </div>
        </div>
        <div className={styles.detailsSection}>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Carrier:</span>
            <span className={styles.detailValue}>{schedule.carrier}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Type:</span>
            <span className={styles.detailValue}>{schedule.type}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Ship To:</span>
            <span className={styles.detailValue}>{schedule.shipTo || 'N/A'}</span>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className={styles.actionSection}>
          {editingId === schedule.id ? (
            <div className={styles.buttonRow}>
              <button className={styles.saveButton} onClick={() => handleEditSave(schedule.id)}>Save</button>
              <button className={styles.cancelButton} onClick={handleEditCancel}>Cancel</button>
            </div>
          ) : (
            <div className={styles.buttonRow}>
              <button className={styles.editButton} onClick={() => handleEdit(schedule)}>Edit</button>
              <button className={styles.cancelButton} onClick={() => handleCancel(schedule.id)}>Cancel</button>
            </div>
          )}
          
          {schedule.status === 'Carrier Pending' && schedule.type === 'Marketplace' && (
            <button
              className={styles.reviewButton}
              onClick={() => handleCarrierReview(schedule)}
              disabled={reviewLoading}
            >
              Review Carrier
            </button>
          )}
        </div>
        
        {/* Confirmation Dialog */}
        {confirmCancelId === schedule.id && (
          <div className={styles.confirmDialog}>
            <div className={styles.confirmMessage}>Are you sure you want to cancel this load?</div>
            <div className={styles.confirmButtons}>
              <button className={styles.confirmYes} onClick={() => confirmCancel(schedule.id)}>Yes</button>
              <button className={styles.confirmNo} onClick={cancelCancel}>No</button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Show loading while auth is initializing
  if (authLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Initializing...</p>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!isAuthenticated || !user?.uid) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Please log in to view the shipping schedule.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Loading purchase order schedule...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Load Schedule</h1>
        <div className={styles.controls}>
          {filter && (
            <div className={styles.filterBadge}>
                              <span>{filter === 'active' ? 'Active' : 'Delayed'} Purchase Orders</span>
              <button 
                className={styles.clearFilter}
                onClick={handleClearFilter}
                aria-label="Clear filter"
              >
                ×
              </button>
            </div>
          )}
          <div className={styles.viewToggle}>
            <button 
              className={`${styles.toggleButton} ${viewType === 'calendar' ? styles.active : ''}`}
              onClick={() => setViewType('calendar')}
            >
              Calendar View
            </button>
            <button 
              className={`${styles.toggleButton} ${viewType === 'list' ? styles.active : ''}`}
              onClick={() => setViewType('list')}
            >
              List View
            </button>
          </div>
        </div>
      </div>

      {viewType === 'calendar' ? (
        <div className={styles.calendar}>
          <div className={styles.calendarHeader}>
            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}>
              Previous
            </button>
            <h2>{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}>
              Next
            </button>
          </div>
          <div className={styles.calendarGrid}>
            {renderCalendarGrid()}
          </div>
          {selectedDate && (
            <div className={styles.loadsForDay}>
                              <h3>Purchase Orders for {format(selectedDate, 'MMMM d, yyyy')}</h3>
              {getLoadsForDate(selectedDate).length === 0 ? (
                <div>No purchase orders scheduled for this day.</div>
              ) : (
                <div className={styles.mobileCardsContainer}>
                  {getLoadsForDate(selectedDate).map(load => (
                    <div key={load.id} className={styles.mobileCard}>
                      <div className={styles.cardHeader}>
                        <div className={styles.poSection}>
                          <h3>PO: {load.poNumber}</h3>
                        </div>
                        <div className={styles.statusSection}>
                          <span className={styles[load.status.toLowerCase().replace(/\s+/g, '')]}>
                            {load.status}
                          </span>
                        </div>
                      </div>
                      <div className={styles.routeSection}>
                        <div className={styles.routeItem}>
                          <div className={styles.routeLabel}>Pickup:</div>
                          <div className={styles.routeValue}>{load.pickup || 'N/A'}</div>
                        </div>
                        <div className={styles.routeItem}>
                          <div className={styles.routeLabel}>Destination:</div>
                          <div className={styles.routeValue}>{load.destination}</div>
                        </div>
                      </div>
                      <div className={styles.detailsSection}>
                        <div className={styles.detailRow}>
                          <span className={styles.detailLabel}>Carrier:</span>
                          <span className={styles.detailValue}>{load.carrier}</span>
                        </div>
                        <div className={styles.detailRow}>
                          <span className={styles.detailLabel}>Type:</span>
                          <span className={styles.detailValue}>{load.type}</span>
                        </div>
                        <div className={styles.detailRow}>
                          <span className={styles.detailLabel}>Ship To:</span>
                          <span className={styles.detailValue}>{load.shipTo || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className={styles.listView}>
          {isMobile ? (
            <div className={styles.mobileCardsContainer}>
              {filteredSchedules.length === 0 ? (
                <div className={styles.noData}>No purchase orders found.</div>
              ) : (
                <MobileOptimizedList
                  items={filteredSchedules}
                  renderItem={renderMobileCard}
                  keyExtractor={(schedule) => schedule.id}
                  itemHeight={320}
                  containerHeight={isMobile ? 400 : 500}
                  enableVirtualization={isMobile}
                  enablePullToRefresh={isMobile}
                  onRefresh={async () => {
                    // Refresh purchase orders data
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    await refreshPurchaseOrders();
                  }}
                  className={styles.mobileSchedulesList}
                />
              )}
            </div>
          ) : (
            <div className={styles.tableContainer}>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>PO Number</th>
                    <th>Pickup</th>
                    <th>Destination</th>
                    <th>Carrier</th>
                    <th>Status</th>
                    <th>Type</th>
                    <th>Ship To</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSchedules.map((schedule) => (
                    <tr key={schedule.id}>
                      <td>{editingId === schedule.id ? (
                        <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} />
                      ) : schedule.date}</td>
                      <td>{schedule.poNumber}</td>
                      <td>{schedule.pickup || ''}</td>
                      <td>{schedule.destination}</td>
                      <td>{schedule.carrier}</td>
                      <td>
                        <span className={styles[schedule.status.toLowerCase().replace(/\s+/g, '')]}> 
                          {schedule.status}
                        </span>
                      </td>
                      <td>{schedule.type}</td>
                      <td>{schedule.shipTo || 'N/A'}</td>
                      <td>
                        {editingId === schedule.id ? (
                          <>
                            <button className={styles.actionButton} onClick={() => handleEditSave(schedule.id)}>Save</button>
                            <button className={styles.actionButton} onClick={handleEditCancel}>Cancel</button>
                          </>
                        ) : (
                          <>
                            <button className={styles.actionButton} onClick={() => handleEdit(schedule)}>Edit</button>
                            <button className={styles.actionButton} onClick={() => handleCancel(schedule.id)}>Cancel</button>
                          </>
                        )}
                        {confirmCancelId === schedule.id && (
                          <div className={styles.confirmDialog}>
                            <span>Are you sure you want to cancel this purchase order?</span>
                            <button className={styles.actionButton} onClick={() => confirmCancel(schedule.id)}>Yes</button>
                            <button className={styles.actionButton} onClick={cancelCancel}>No</button>
                          </div>
                        )}
                        {/* Carrier Review button only for marketplace loads in Carrier Pending status - matching shipper logic */}
                        {schedule.status === 'Carrier Pending' && schedule.type === 'Marketplace' && (
                          <button
                            className={styles.carrierReviewButton}
                            onClick={() => handleCarrierReview(schedule)}
                            disabled={reviewLoading}
                          >
                            Carrier Review
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showCarrierReview && reviewCarrierProfile && (
        <div className={styles.modalOverlay} onClick={() => setShowCarrierReview(false)}>
          <div className={`${styles.modal} ${isMobile ? styles.mobileModal : ''}`} onClick={e => e.stopPropagation()}>
            <CarrierProfileCard carrier={{ ...reviewCarrierProfile, complianceStatus: 'compliant' }} />
            <div className={styles.modalActions}>
              <button className={styles.actionButton} style={{ background: '#28a745' }} onClick={handleApproveCarrier}>Accept</button>
              <button className={styles.actionButton} style={{ background: '#dc3545' }} onClick={handleRejectCarrier}>Reject</button>
            </div>
          </div>
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

export default ShippingSchedule;
