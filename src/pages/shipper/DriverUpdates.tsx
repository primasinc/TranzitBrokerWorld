import React, { useState } from 'react';
import styles from './DriverUpdates.module.css';
import { getCarrier } from '../../services/carrierService'; // Import carrier fetch

interface DriverUpdate {
  driverId: string;
  driverName: string;
  location: string;
  status: string;
  lastUpdate: string;
  eta: string;
  load: string;
  carrierId?: string; // Add carrierId for lookup
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
      load: "PO-12345",
      carrierId: "CARRIER123" // Example carrierId
    },
    // Add more sample updates
  ];

  // State for modals
  const [contactInfo, setContactInfo] = useState<{phone: string, email: string} | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [eldDetails, setEldDetails] = useState<{location: string, coordinates: [number, number]} | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsView, setDetailsView] = useState<'map' | 'location'>('map');

  // Handler for Contact button
  const handleContactClick = async (carrierId?: string) => {
    if (!carrierId) return;
    const carrier = await getCarrier(carrierId);
    if (carrier) {
      setContactInfo({ phone: carrier.phone, email: carrier.email });
      setShowContactModal(true);
    }
  };

  // Handler for View Details button
  const handleViewDetailsClick = async (driverId: string) => {
    // Simulate fetching ELD/location data
    // Replace with real API call as needed
    setEldDetails({ location: 'Chicago, IL', coordinates: [-87.6298, 41.8781] });
    setDetailsView('map');
    setShowDetailsModal(true);
  };

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
                  <button className={styles.actionButton} onClick={() => handleContactClick(update.carrierId)}>Contact</button>
                  <button className={styles.actionButton} onClick={() => handleViewDetailsClick(update.driverId)}>View Details</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Contact Modal */}
      {showContactModal && contactInfo && (
        <div className={styles.modalOverlay} onClick={() => setShowContactModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2>Carrier Contact Information</h2>
            <p><strong>Phone:</strong> {contactInfo.phone}</p>
            <p><strong>Email:</strong> {contactInfo.email}</p>
            <button onClick={() => setShowContactModal(false)}>Close</button>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && eldDetails && (
        <div className={styles.modalOverlay} onClick={() => setShowDetailsModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2>Driver Route Details</h2>
            <div style={{ marginBottom: 16 }}>
              <button onClick={() => setDetailsView('map')} disabled={detailsView === 'map'}>Map</button>
              <button onClick={() => setDetailsView('location')} disabled={detailsView === 'location'}>Location</button>
            </div>
            {detailsView === 'map' ? (
              <div style={{ height: 200, background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {/* Replace with real map component */}
                <span>Map showing coordinates: {eldDetails.coordinates[0]}, {eldDetails.coordinates[1]}</span>
              </div>
            ) : (
              <div>
                <p><strong>Current Location:</strong> {eldDetails.location}</p>
                <p><strong>Coordinates:</strong> {eldDetails.coordinates[0]}, {eldDetails.coordinates[1]}</p>
              </div>
            )}
            <button onClick={() => setShowDetailsModal(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverUpdates; 