import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import styles from './ShippingSchedule.module.css';

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
}

const ShippingSchedule: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [viewType, setViewType] = useState<'calendar' | 'list'>('list');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filter, setFilter] = useState<'active' | 'delayed' | null>(null);

  // Get filter from navigation state
  useEffect(() => {
    const state = location.state as LocationState;
    if (state?.filter) {
      setFilter(state.filter);
      // Clear the state to prevent filter persisting on refresh
      navigate('.', { replace: true });
    }
  }, [location, navigate]);

  const schedules: ScheduledShipment[] = [
    {
      id: "SH001",
      date: "2024-02-23",
      time: "14:00",
      destination: "New York, NY",
      carrier: "ABC Trucking",
      status: "Active",
      type: "Full Load"
    },
    {
      id: "SH002",
      date: "2024-02-24",
      time: "09:00",
      destination: "Los Angeles, CA",
      carrier: "XYZ Logistics",
      status: "Delayed",
      type: "Partial Load"
    },
    {
      id: "SH003",
      date: "2024-02-25",
      time: "11:00",
      destination: "Chicago, IL",
      carrier: "Fast Transit",
      status: "Active",
      type: "Full Load"
    },
    {
      id: "SH004",
      date: "2024-02-26",
      time: "13:30",
      destination: "Miami, FL",
      carrier: "South Logistics",
      status: "Delayed",
      type: "Partial Load"
    }
  ];

  // Filter schedules based on status
  const filteredSchedules = filter
    ? schedules.filter(schedule => schedule.status.toLowerCase() === filter)
    : schedules;

  // Clear filter
  const handleClearFilter = () => {
    setFilter(null);
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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSchedules.map((schedule) => (
                <tr key={schedule.id}>
                  <td>{schedule.date}</td>
                  <td>{schedule.time}</td>
                  <td>{schedule.destination}</td>
                  <td>{schedule.carrier}</td>
                  <td>
                    <span className={`${styles.status} ${styles[schedule.status.toLowerCase()]}`}>
                      {schedule.status}
                    </span>
                  </td>
                  <td>{schedule.type}</td>
                  <td>
                    <button className={styles.actionButton}>Edit</button>
                    <button className={styles.actionButton}>Cancel</button>
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