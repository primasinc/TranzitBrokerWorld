import React, { useState } from 'react';
import styles from './CarrierProfileCard.module.css';

interface CarrierProfileCardProps {
  carrier: any;
  onPartnerRequest?: (carrier: any) => void;
}

const CarrierProfileCard: React.FC<CarrierProfileCardProps> = ({ carrier, onPartnerRequest }) => {
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSaferModal, setShowSaferModal] = useState(false);

  return (
    <div className={styles.card}>
      <h2>{carrier.companyName}</h2>
      {carrier.companyRep && <p>Rep: {carrier.companyRep}</p>}
      {carrier.phoneNumber && <p>Phone: {carrier.phoneNumber}</p>}
      {carrier.email && <p>Email: {carrier.email}</p>}
      {carrier.state && <p>State: {carrier.state}</p>}
      {carrier.loadTypes && <p>Load Types: {carrier.loadTypes.join(', ')}</p>}
      {carrier.trailerTypes && <p>Trailer Types: {carrier.trailerTypes.join(', ')}</p>}
      {carrier.endorsements && <p>Endorsements: {carrier.endorsements.join(', ')}</p>}
      <div className={styles.actions}>
        <button className={styles.viewButton} onClick={() => setShowProfileModal(true)}>
          View Profile
        </button>
        <button className={styles.saferButton} onClick={() => setShowSaferModal(true)}>
          SAFER Check
        </button>
        <button
          className={styles.partnerButton}
          onClick={() => {
            if (typeof onPartnerRequest === 'function') {
              onPartnerRequest(carrier);
            } else {
              alert('Partner request sent (placeholder).');
            }
          }}
        >
          Partner Request
        </button>
      </div>
      {/* Profile Modal */}
      {showProfileModal && (
        <div className={styles.modalOverlay} onClick={() => setShowProfileModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2>{carrier.companyName || 'Carrier Profile'}</h2>
            <div style={{marginBottom: 12}}>
              <strong>MC Number:</strong> {carrier.mcNumber || 'N/A'}<br/>
              <strong>DOT Number:</strong> {carrier.dotNumber || 'N/A'}<br/>
              <strong>Status:</strong> {carrier.status || 'N/A'}<br/>
              <strong>Address:</strong> {
                carrier.address
                  ? `${carrier.address.street || ''}, ${carrier.address.city || ''}, ${carrier.address.state || ''} ${carrier.address.zip || ''}`
                  : `${carrier.street || ''}, ${carrier.city || ''}, ${carrier.state || ''} ${carrier.zip || ''}`
                || 'N/A'
              }<br/>
            </div>
            <div style={{marginBottom: 12}}>
              <strong>Contact Information</strong><br/>
              <strong>Email:</strong> {carrier.email || 'N/A'}<br/>
              <strong>Phone:</strong> {carrier.phoneNumber || carrier.phone || 'N/A'}<br/>
            </div>
            <div style={{marginBottom: 12}}>
              <strong>Rating:</strong> {carrier.rating ? `${carrier.rating.toFixed(1)} / 5` : 'N/A'}<br/>
              <strong>Total Loads:</strong> {carrier.totalLoads ?? 'N/A'}<br/>
              <strong>Completed Loads:</strong> {carrier.completedLoads ?? 'N/A'}<br/>
              <strong>On-Time Deliveries:</strong> {carrier.onTimeDeliveries ?? 'N/A'}<br/>
            </div>
            <div style={{marginBottom: 12}}>
              <strong>Compliance & Insurance</strong><br/>
              {carrier.insurance && carrier.insurance.length > 0 ? (
                <ul>
                  {carrier.insurance.map((ins: any, idx: number) => (
                    <li key={idx}>{ins.type?.toUpperCase() || 'INS'}: {ins.provider || 'N/A'} (Policy: {ins.policyNumber || 'N/A'}, Coverage: ${ins.coverage?.toLocaleString() || 'N/A'}, Expires: {ins.expiresAt?.toDate ? ins.expiresAt.toDate().toLocaleDateString() : 'N/A'})</li>
                  ))}
                </ul>
              ) : <p>No insurance info available.</p>}
            </div>
            <div style={{marginBottom: 12}}>
              <strong>Equipment</strong><br/>
              {carrier.equipment && carrier.equipment.length > 0 ? (
                <ul>
                  {carrier.equipment.map((eq: any, idx: number) => (
                    <li key={idx}>{eq.type?.toUpperCase() || 'EQUIP'}: {eq.count || 1} units, Capacity: {eq.capacity ? `${eq.capacity} lbs` : 'N/A'}</li>
                  ))}
                </ul>
              ) : <p>No equipment info available.</p>}
            </div>
            <div style={{marginBottom: 12}}>
              <strong>Service Areas</strong><br/>
              {carrier.serviceAreas && carrier.serviceAreas.length > 0 ? (
                <ul>
                  {carrier.serviceAreas.map((area: any, idx: number) => (
                    <li key={idx}>{area.state}{area.preferred ? ' (Preferred)' : ''}</li>
                  ))}
                </ul>
              ) : <p>No service area info available.</p>}
            </div>
            <button onClick={() => setShowProfileModal(false)}>Close</button>
          </div>
        </div>
      )}
      {/* SAFER Modal */}
      {showSaferModal && (
        <div className={styles.modalOverlay} onClick={() => setShowSaferModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2>FMCSA SAFER Check</h2>
            <p><strong>Company:</strong> {carrier.companyName}</p>
            {carrier.mcNumber && (
              <p>
                <strong>MC Number:</strong> {carrier.mcNumber} <br />
                <a
                  href="https://safer.fmcsa.dot.gov/CompanySnapshot.aspx"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Click to open the SAFER Company Snapshot search page. MC Number will be copied to your clipboard. On the SAFER page, select 'MC/MX Number', paste the number, and search."
                  onClick={e => {
                    e.preventDefault();
                    navigator.clipboard.writeText(carrier.mcNumber);
                    window.open('https://safer.fmcsa.dot.gov/CompanySnapshot.aspx', '_blank');
                  }}
                  style={{ textDecoration: 'underline', cursor: 'pointer' }}
                >
                  Check MC on SAFER
                </a>
                <span style={{ marginLeft: 8, fontSize: '0.9em', color: '#888' }} title="MC Number copied to clipboard when you click the link!">🛈</span>
              </p>
            )}
            {carrier.dotNumber && (
              <p>
                <strong>DOT Number:</strong> {carrier.dotNumber} <br />
                <a
                  href="https://safer.fmcsa.dot.gov/CompanySnapshot.aspx"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Click to open the SAFER Company Snapshot search page. DOT Number will be copied to your clipboard. On the SAFER page, select 'USDOT Number', paste the number, and search."
                  onClick={e => {
                    e.preventDefault();
                    navigator.clipboard.writeText(carrier.dotNumber);
                    window.open('https://safer.fmcsa.dot.gov/CompanySnapshot.aspx', '_blank');
                  }}
                  style={{ textDecoration: 'underline', cursor: 'pointer' }}
                >
                  Check DOT on SAFER
                </a>
                <span style={{ marginLeft: 8, fontSize: '0.9em', color: '#888' }} title="DOT Number copied to clipboard when you click the link!">🛈</span>
              </p>
            )}
            {!(carrier.mcNumber || carrier.dotNumber) && (
              <p>No MC or DOT number available for this carrier.</p>
            )}
            <div style={{ marginTop: 16, fontSize: '0.95em', color: '#555', background: '#f8f9fa', padding: 8, borderRadius: 4 }}>
              <strong>Instructions:</strong> Click the MC or DOT link above. The number will be copied to your clipboard. On the SAFER page, select the correct search type, paste the number, and click Search.
            </div>
            <button className={styles.closeButton} onClick={() => setShowSaferModal(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CarrierProfileCard; 