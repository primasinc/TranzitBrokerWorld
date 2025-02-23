import React, { useState } from 'react';
import styles from './ShippingSchedule.module.css';

interface ScheduledShipment {
  id: string;
  date: string;
  time: string;
  destination: string;
  carrier: string;
  status: string;
  type: string;
}

const ShippingSchedule: React.FC = () => {
  const [viewType, setViewType] = useState<'calendar' | 'list'>('calendar');
  const [currentDate, setCurrentDate] = useState(new Date());

  const schedules: ScheduledShipment[] = [
    {
      id: "SH001",
      date: "2024-02-23",
      time: "14:00",
      destination: "New York, NY",
      carrier: "ABC Trucking",
      status: "Confirmed",
      type: "Full Load"
    },
    // Add more schedules
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Shipping Schedule</h1>
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
              {schedules.map((schedule) => (
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