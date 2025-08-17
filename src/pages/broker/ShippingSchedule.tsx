import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import styles from './ShippingSchedule.module.css';
import { db } from '../../config/firebase';
import { collection, getDocs, doc, updateDoc, getDoc, addDoc, serverTimestamp, query, where } from 'firebase/firestore';
import CarrierProfileCard from '../../components/carrier/CarrierProfileCard';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, format, parse } from 'date-fns';
import { useMobileOptimization } from '../../hooks/useMobileOptimization';
import { MobileOptimizedList } from '../../components/common/MobileOptimizedList';

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
  status: string;
  type: string;
  shipTo?: string;
  poNumber: string;
  pickup?: string;
}

const ShippingSchedule: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
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

  // Mock loads data for now since we don't have the full implementation
  const [loads, setLoads] = useState<ScheduledLoad[]>([
    {
      id: 'LD001',
      date: '2024-01-15',
      time: '10:00 AM',
      destination: 'New York, NY',
      carrier: 'ABC Trucking',
      status: 'Active',
      type: 'Full Truckload',
      poNumber: 'PO-001',
      pickup: 'Chicago, IL'
    }
  ]);

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
      // Mock update for now since broker services aren't fully implemented
      console.log('Updating load schedule:', id, 'with date:', editDate, 'time:', editTime);
      
      // Update local state
      setLoads(prev => prev.map(load => 
        load.id === id 
          ? { ...load, date: editDate, time: editTime }
          : load
      ));
      
      setEditingId(null);
      setEditDate('');
      setEditTime('');
    } catch (error) {
      console.error('Error updating load schedule:', error);
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
      // Mock cancellation for now since broker services aren't fully implemented
      console.log('Cancelling load schedule:', id);
      
      // Update local state
      setLoads(prev => prev.map(load => 
        load.id === id 
          ? { ...load, status: 'cancelled' }
          : load
      ));
      
      setConfirmCancelId(null);
    } catch (error) {
      console.error('Error cancelling load schedule:', error);
    }
  };

  const cancelCancel = () => {
    setConfirmCancelId(null);
  };

  const handleCarrierReview = async (schedule: ScheduledLoad) => {
    setReviewLoading(true);
    try {
      // Mock carrier profile fetch for now since broker services aren't fully implemented
      console.log('Fetching carrier profile for review:', schedule.carrier);
      
      // Mock carrier profile data
      const mockCarrierProfile = {
        id: 'mock-carrier-id',
        companyName: schedule.carrier,
        displayName: schedule.carrier,
        phone: '555-123-4567',
        email: 'info@abctrucking.com',
        rating: 4.5,
        totalShipments: 150,
        onTimeDelivery: 95
      };
      
      setReviewCarrierProfile(mockCarrierProfile);
      setReviewOrderId(schedule.id);
      setReviewCarrierId('mock-carrier-id');
      setShowCarrierReview(true);
    } catch (error) {
      console.error('Error fetching carrier profile:', error);
    } finally {
      setReviewLoading(false);
    }
  };

  const handleApproveCarrier = async () => {
    if (!reviewOrderId || !reviewCarrierId) return;
    
    try {
      // Mock approval for now since broker services aren't fully implemented
      console.log('Approving carrier for order:', reviewOrderId, 'carrier:', reviewCarrierId);
      
      // Update local state
      setLoads(prev => prev.map(load => 
        load.id === reviewOrderId 
          ? { ...load, status: 'approved' }
          : load
      ));
      
      setShowCarrierReview(false);
      setReviewCarrierProfile(null);
      setReviewOrderId(null);
      setReviewCarrierId(null);
    } catch (error) {
      console.error('Error approving carrier:', error);
    }
  };

  const handleRejectCarrier = async () => {
    if (!reviewOrderId || !reviewCarrierId) return;
    
    try {
      // Mock rejection for now since broker services aren't fully implemented
      console.log('Rejecting carrier for order:', reviewOrderId, 'carrier:', reviewCarrierId);
      
      // Update local state
      setLoads(prev => prev.map(load => 
        load.id === reviewOrderId 
          ? { ...load, status: 'rejected' }
          : load
      ));
      
      setShowCarrierReview(false);
      setReviewCarrierProfile(null);
      setReviewOrderId(null);
      setReviewCarrierId(null);
    } catch (error) {
      console.error('Error rejecting carrier:', error);
    }
  };

  const renderCalendarGrid = () => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const days = [];
    
    for (let day = start; day <= end; day = addDays(day, 1)) {
      days.push(day);
    }

    const firstDayOfWeek = start.getDay();
    const leadingDays = [];
    for (let i = 0; i < firstDayOfWeek; i++) {
      leadingDays.push(null);
    }

    const allDays = [...leadingDays, ...days];
    const weeks = [];
    for (let i = 0; i < allDays.length; i += 7) {
      weeks.push(allDays.slice(i, i + 7));
    }

    return weeks.map((week, weekIndex) => (
      <div key={weekIndex} className={styles.calendarWeek}>
        {week.map((day, dayIndex) => (
          <div
            key={dayIndex}
            className={`${styles.calendarDay} ${!day ? styles.emptyDay : ''} ${day && isSameDay(day, new Date()) ? styles.today : ''}`}
            onClick={() => day && setSelectedDate(day)}
          >
            {day && (
              <>
                <span className={styles.dayNumber}>{format(day, 'd')}</span>
                {loads.filter(load => isSameDay(parse(load.date, 'yyyy-MM-dd', new Date()), day)).length > 0 && (
                  <div className={styles.loadIndicator}>
                    {loads.filter(load => isSameDay(parse(load.date, 'yyyy-MM-dd', new Date()), day)).length}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    ));
  };

  const getLoadsForDate = (date: Date) => {
    return loads.filter(load => isSameDay(parse(load.date, 'yyyy-MM-dd', new Date()), date));
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

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Load Schedule</h1>
        <div className={styles.controls}>
          {filter && (
            <div className={styles.filterBadge}>
              <span>{filter === 'active' ? 'Active' : 'Delayed'} Loads</span>
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
                <div className={styles.noData}>No loads found.</div>
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
                    // Refresh loads data
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    // Mock refresh for now
                    console.log('Refreshing loads data...');
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
                            <span>Are you sure you want to cancel this load?</span>
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
