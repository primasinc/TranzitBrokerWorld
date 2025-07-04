import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import styles from './ShippingSchedule.module.css';
import { db } from '../../firebase';
import { collection, getDocs, doc, updateDoc, getDoc, addDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { useShipments } from '../../context/ShipmentsContext';
import CarrierProfileCard from '../../components/carrier/CarrierProfileCard';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, format, parse } from 'date-fns';
import { useMobileOptimization } from '../../hooks/useMobileOptimization';
import { MobileOptimizedList } from '../../components/common/MobileOptimizedList';

interface LocationState {
  filter?: 'active' | 'delayed';
  period?: string;
}

interface ScheduledShipment {
  id: string;
  date: string;
  time: string;
  destination: string;
  carrier: string;
  status: string;
  type: string;
  shipTo?: string;
  poNumber: string;
  pickup?: string;
}

const ShippingSchedule: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { shipments, refreshShipments } = useShipments();
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
    ? shipments.filter(schedule => schedule.status.toLowerCase() === filter && schedule.status.toLowerCase() !== 'completed')
    : shipments.filter(schedule => schedule.status.toLowerCase() !== 'completed');

  // Clear filter
  const handleClearFilter = () => {
    setFilter(null);
  };

  const handleEdit = (schedule: ScheduledShipment) => {
    setEditingId(schedule.id);
    setEditDate(schedule.date);
    setEditTime(schedule.time);
  };

  const handleEditSave = async (id: string) => {
    const scheduleRef = doc(db, 'purchaseOrders', id);
    await updateDoc(scheduleRef, { date: editDate, scheduledTime: editTime });
    refreshShipments();
    setEditingId(null);
  };

  const handleEditCancel = () => {
    setEditingId(null);
  };

  const handleCancel = (id: string) => {
    setConfirmCancelId(id);
  };

  const confirmCancel = async (id: string) => {
    const scheduleRef = doc(db, 'purchaseOrders', id);
    await updateDoc(scheduleRef, { status: 'Cancelled' });
    refreshShipments();
    setConfirmCancelId(null);
  };

  const cancelCancel = () => {
    setConfirmCancelId(null);
  };

  const handleCarrierReview = async (order: any) => {
    setReviewLoading(true);
    try {
      // Fetch the PO document to get the pendingCarrier field
      const poDocSnap = await getDoc(doc(db, 'purchaseOrders', order.id));
      if (!poDocSnap.exists()) {
        setReviewLoading(false);
        alert('Purchase order not found.');
        console.error('[CarrierReview] PO not found:', order.id);
        return;
      }
      const poData = poDocSnap.data();
      const pendingCarrier = poData?.pendingCarrier;
      console.log('[CarrierReview] pendingCarrier field:', pendingCarrier);
      if (!pendingCarrier || !pendingCarrier.id) {
        setReviewLoading(false);
        alert('No pending carrier found for this order.');
        console.error('[CarrierReview] No pending carrier found for PO:', order.id);
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
      setReviewOrderId(order.id);
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
    
    // Validate that reviewCarrierId is not the same as the shipper's userId
    const scheduleRef = doc(db, 'purchaseOrders', reviewOrderId);
    const poDoc = await getDoc(scheduleRef);
    const poData = poDoc.data();
    
    if (!poData) {
      console.error('[handleApproveCarrier] PO data not found for:', reviewOrderId);
      alert('Purchase order data not found. Please try again.');
      return;
    }
    
    if (poData.userId === reviewCarrierId) {
      console.error('[handleApproveCarrier] carrierId cannot be the same as shipper userId:', { 
        carrierId: reviewCarrierId, 
        shipperUserId: poData.userId 
      });
      alert('Invalid carrier assignment: Cannot assign shipper as carrier.');
      return;
    }
    
    try {
      // Set approvedCarrier, status to Active, clear pendingCarrier
      await updateDoc(scheduleRef, {
        approvedCarrier: {
          id: reviewCarrierId,
          companyName: reviewCarrierProfile.companyName || '',
          email: reviewCarrierProfile.email || '',
          phone: reviewCarrierProfile.phoneNumber || '',
          mcNumber: reviewCarrierProfile.mcNumber || '',
          dotNumber: reviewCarrierProfile.dotNumber || '',
        },
        status: 'Active',
        shippingScheduleStatus: 'Active',
        pendingCarrier: null
      });
      
      // --- Update the corresponding load in 'loads' collection ---
      if (poData.poNumber) {
        // Fetch the shipper's name from the users collection
        let shipperName = '';
        if (poData.shipperId) {
          const shipperDoc = await getDoc(doc(db, 'users', poData.shipperId));
          if (shipperDoc.exists()) {
            const shipperData = shipperDoc.data();
            shipperName = shipperData.companyName || shipperData.displayName || '';
          }
        }
        
        const loadsQuery = query(
          collection(db, 'loads'),
          where('poNumber', '==', poData.poNumber)
        );
        const loadsSnap = await getDocs(loadsQuery);
        
        if (!loadsSnap.empty) {
          const loadDocRef = doc(db, 'loads', loadsSnap.docs[0].id);
          const loadData = loadsSnap.docs[0].data();
          
          // Validate that we're not overwriting with the wrong carrierId
          if (loadData.carrierId && loadData.carrierId !== reviewCarrierId) {
            console.warn('[handleApproveCarrier] Load already has different carrierId:', { 
              existing: loadData.carrierId, 
              new: reviewCarrierId 
            });
          }
          
          await updateDoc(loadDocRef, {
            carrierId: reviewCarrierId,
            status: 'active',
            updatedAt: serverTimestamp(),
            // Fill in all relevant info from PO
            pickup: {
              location: poData.vendorInfo?.streetAddress || '',
              time: poData.date || '',
              status: 'pending'
            },
            delivery: {
              location: poData.shipTo?.streetAddress || '',
              time: poData.date || '',
              status: 'pending'
            },
            payment: poData.rate || 0,
            weight: poData.items?.reduce((sum: number, item: any) => sum + (item.weight || 0), 0) || '',
            dimensions: poData.items && poData.items.length > 0
              ? `${poData.items[0].length || ''}x${poData.items[0].width || ''}x${poData.items[0].height || ''}`
              : '',
            poNumber: poData.poNumber || '',
            shipper: shipperName
          });
          console.log('[handleApproveCarrier] Updated load with carrierId:', reviewCarrierId);
        } else {
          console.warn('[handleApproveCarrier] No load found for poNumber:', poData.poNumber);
        }
      }
      
      setShowCarrierReview(false);
      refreshShipments();
    } catch (error) {
      console.error('[handleApproveCarrier] Error approving carrier:', error);
      alert('Failed to approve carrier. Please try again.');
    }
  };

  const handleRejectCarrier = async () => {
    if (!reviewOrderId || !reviewCarrierId || !reviewCarrierProfile) return;
    const scheduleRef = doc(db, 'purchaseOrders', reviewOrderId);
    // Notify the carrier of rejection
    await addDoc(collection(db, 'notifications'), {
      carrierId: reviewCarrierId,
      recipientId: reviewCarrierId,
      shipperId: reviewCarrierProfile.shipperId || '',
      poNumber: reviewOrderId,
      status: 'rejected',
      type: 'carrier_reject',
      message: 'Carrier has been rejected for this load.',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      requiresAction: true
    });
    // Set status to Open, clear pendingCarrier
    await updateDoc(scheduleRef, {
      status: 'Open',
      pendingCarrier: null
    });
    setShowCarrierReview(false);
    refreshShipments();
  };

  // Helper: get all loads for a given date
  const getLoadsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return shipments.filter(s => s.date === dateStr);
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
        const hasLoads = shipments.some(s => s.date === fullDate);
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
            {hasLoads && <div className={styles.loadMarker} title="Loads scheduled">●</div>}
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

  // Mobile card component
  const renderMobileCard = (schedule: any) => {
    return (
      <div key={schedule.id} className={styles.mobileCard}>
        {/* Header - PO and Status */}
        <div className={styles.cardHeader}>
          <div className={styles.poSection}>
            <h3>PO: {schedule.poNumber || 'N/A'}</h3>
            <div className={styles.dateTime}>
              {editingId === schedule.id ? (
                <input 
                  type="date" 
                  value={editDate} 
                  onChange={e => setEditDate(e.target.value)}
                  className={styles.mobileDateInput}
                />
              ) : (
                <span>{schedule.date || 'N/A'}</span>
              )}
              {schedule.time && <span className={styles.time}> • {schedule.time}</span>}
            </div>
          </div>
          <div className={styles.statusSection}>
            <span className={styles[schedule.status?.toLowerCase().replace(/\s+/g, '') || 'pending']}>
              {schedule.status || 'Unknown'}
            </span>
          </div>
        </div>
        
        {/* Route Information */}
        <div className={styles.routeSection}>
          <div className={styles.routeItem}>
            <div className={styles.routeLabel}>Pickup:</div>
            <div className={styles.routeValue}>{schedule.pickup || schedule.vendorInfo?.streetAddress || 'N/A'}</div>
          </div>
          <div className={styles.routeItem}>
            <div className={styles.routeLabel}>Destination:</div>
            <div className={styles.routeValue}>{schedule.destination || schedule.shipTo?.streetAddress || 'N/A'}</div>
          </div>
        </div>
        
        {/* Details Section - Matching Desktop Table Columns */}
        <div className={styles.detailsSection}>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Carrier:</span>
            <span className={styles.detailValue}>{
              schedule.carrier 
                ? (typeof schedule.carrier === 'object'
                    ? schedule.carrier.companyName || schedule.carrier.id || 'TBD'
                    : schedule.carrier)
                : schedule.approvedCarrier?.companyName || 'TBD'
            }</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Type:</span>
            <span className={styles.detailValue}>{schedule.type || 'Standard'}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Ship To:</span>
            <span className={styles.detailValue}>{schedule.shipTo || schedule.shipTo?.companyName || 'N/A'}</span>
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
          
          {schedule.status === 'Carrier Pending' && (schedule.carrier === 'Marketplace' || !schedule.carrier) && (
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
            <div className={styles.confirmMessage}>Are you sure you want to cancel this shipment?</div>
            <div className={styles.confirmButtons}>
              <button className={styles.confirmYes} onClick={() => confirmCancel(schedule.id)}>Yes</button>
              <button className={styles.confirmNo} onClick={cancelCancel}>No</button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Shipping Schedule</h1>
        <div className={styles.controls}>
          {filter && (
            <div className={styles.filterBadge}>
              <span>{filter === 'active' ? 'Active' : 'Delayed'} Shipments</span>
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
              <h3>Loads for {format(selectedDate, 'MMMM d, yyyy')}</h3>
              {getLoadsForDate(selectedDate).length === 0 ? (
                <div>No loads scheduled for this day.</div>
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
                          <span className={styles.detailValue}>{
                            typeof load.carrier === 'object'
                              ? (load.carrier as any).companyName || (load.carrier as any).id || 'TBD'
                              : load.carrier
                          }</span>
                        </div>
                        <div className={styles.detailRow}>
                          <span className={styles.detailLabel}>Type:</span>
                          <span className={styles.detailValue}>{load.type}</span>
                        </div>
                        <div className={styles.detailRow}>
                          <span className={styles.detailLabel}>Ship To:</span>
                          <span className={styles.detailValue}>{load.shipTo}</span>
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
                <div className={styles.noData}>No shipments found.</div>
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
                    // Refresh shipments data
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    refreshShipments();
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
                      <td>{
                        typeof schedule.carrier === 'object'
                          ? (schedule.carrier as any).companyName || (schedule.carrier as any).id || 'TBD'
                          : schedule.carrier
                      }</td>
                      <td>
                        <span className={styles[schedule.status.toLowerCase().replace(/\s+/g, '')]}> 
                          {schedule.status}
                        </span>
                      </td>
                      <td>{schedule.type}</td>
                      <td>{schedule.shipTo}</td>
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
                            <span>Are you sure you want to cancel this shipment?</span>
                            <button className={styles.actionButton} onClick={() => confirmCancel(schedule.id)}>Yes</button>
                            <button className={styles.actionButton} onClick={cancelCancel}>No</button>
                          </div>
                        )}
                        {/* Carrier Review button only for marketplace loads in Carrier Pending status */}
                        {schedule.status === 'Carrier Pending' && schedule.carrier === 'Marketplace' && (
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