import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import styles from './ShippingSchedule.module.css';
import { db } from '../../firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { useShipments } from '../../context/ShipmentsContext';

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
  status: 'Active' | 'Delayed' | 'Completed' | 'Cancelled';
  type: string;
  shipTo?: string;
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
          {/* Calendar implementation */}
          <div className={styles.calendarHeader}>
            <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))}>
              Previous
            </button>
            <h2>{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
            <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))}>
              Next
            </button>
          </div>
          <div className={styles.calendarGrid}>
            {/* Calendar grid implementation */}
          </div>
        </div>
      ) : (
        <div className={styles.listView}>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
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
                  <td>{editingId === schedule.id ? (
                    <input type="time" value={editTime} onChange={e => setEditTime(e.target.value)} />
                  ) : schedule.time}</td>
                  <td>{schedule.destination}</td>
                  <td>{
                    typeof schedule.carrier === 'object'
                      ? (schedule.carrier as any).companyName || (schedule.carrier as any).id || 'TBD'
                      : schedule.carrier
                  }</td>
                  <td>
                    <span className={`${styles.status} ${styles[schedule.status.toLowerCase()]}`}>
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ShippingSchedule; 