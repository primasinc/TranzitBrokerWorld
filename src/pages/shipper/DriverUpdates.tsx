import React from 'react';
import styles from './DriverUpdates.module.css';

interface DriverUpdate {
  driverId: string;
  driverName: string;
  location: string;
  status: string;
  lastUpdate: string;
  eta: string;
  load: string;
}

const DriverUpdates: React.FC = () => {
  const updates: DriverUpdate[] = [
    {
      driverId: "D123",
      driverName: "John Smith",
      location: "Chicago, IL",
      status: "In Transit",
      lastUpdate: "10 mins ago",
      eta: "2 hours",
      load: "PO-12345"
    },
    // Add more sample updates
  ];

  return (
    <div className={styles.container}>
      <h1>Driver Updates</h1>
      <div className={styles.updatesTable}>
        <table>
          <thead>
            <tr>
              <th>Driver</th>
              <th>Location</th>
              <th>Status</th>
              <th>Last Update</th>
              <th>ETA</th>
              <th>Load</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {updates.map((update) => (
              <tr key={update.driverId}>
                <td>{update.driverName}</td>
                <td>{update.location}</td>
                <td>
                  <span className={`${styles.status} ${styles[update.status.toLowerCase()]}`}>
                    {update.status}
                  </span>
                </td>
                <td>{update.lastUpdate}</td>
                <td>{update.eta}</td>
                <td>{update.load}</td>
                <td>
                  <button className={styles.actionButton}>Contact</button>
                  <button className={styles.actionButton}>View Details</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DriverUpdates; 