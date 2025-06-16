import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import styles from './ShippingSchedule.module.css';
import { db } from '../../firebase';
import { collection, getDocs, doc, updateDoc, getDoc, addDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { useShipments } from '../../context/ShipmentsContext';
import CarrierProfileCard from '../../components/carrier/CarrierProfileCard';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, format, parse } from 'date-fns';

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

  // Get filter from navigation state
  useEffect(() => {
    const state = location.state as LocationState;
    if (state?.filter) {
      setFilter(state.filter);
      // Clear the state to prevent filter persisting on refresh
      navigate('.', { replace: true });
    }
  }, [location, navigate]);

  // Filter schedules based on status
  const filteredSchedules = filter
    ? shipments.filter(schedule => schedule.status.toLowerCase() === filter)
    : shipments;

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
    const scheduleRef = doc(db, 'purchaseOrders', reviewOrderId);
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
    const poDoc = await getDoc(scheduleRef);
    const poData = poDoc.data();
    if (poData && poData.poNumber) {
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
      }
    }
    setShowCarrierReview(false);
    refreshShipments();
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
                <table className={styles.loadsTable}>
                  <thead>
                    <tr>
                      <th>PO Number</th>
                      <th>Pickup</th>
                      <th>Destination</th>
                      <th>Carrier</th>
                      <th>Status</th>
                      <th>Type</th>
                      <th>Ship To</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getLoadsForDate(selectedDate).map(load => (
                      <tr key={load.id}>
                        <td>{load.poNumber}</td>
                        <td>{load.pickup || ''}</td>
                        <td>{load.destination}</td>
                        <td>{typeof load.carrier === 'object' ? (load.carrier as any).companyName || (load.carrier as any).id || 'TBD' : load.carrier}</td>
                        <td>
                          <span className={styles[load.status.toLowerCase().replace(/\s+/g, '')]}>
                            {load.status}
                          </span>
                        </td>
                        <td>{load.type}</td>
                        <td>{load.shipTo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className={styles.listView}>
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

      {showCarrierReview && reviewCarrierProfile && (
        <div className={styles.modalOverlay} onClick={() => setShowCarrierReview(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <CarrierProfileCard carrier={{ ...reviewCarrierProfile, complianceStatus: 'compliant' }} />
            <div style={{ display: 'flex', gap: 16, marginTop: 24 }}>
              <button className={styles.actionButton} style={{ background: '#28a745' }} onClick={handleApproveCarrier}>Accept</button>
              <button className={styles.actionButton} style={{ background: '#dc3545' }} onClick={handleRejectCarrier}>Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShippingSchedule; 