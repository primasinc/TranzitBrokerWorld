import React, { useState } from 'react';
import styles from './CarrierProfileCard.module.css';
import { fetchCarrierByMC } from '../../services/saferApi';
import { FmcsaCarrierSummary } from '../../types/carrier';

interface CarrierProfileCardProps {
  carrier: any;
  onPartnerRequest?: (carrier: any) => void;
}

const CarrierProfileCard: React.FC<CarrierProfileCardProps> = ({ carrier, onPartnerRequest }) => {
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSaferModal, setShowSaferModal] = useState(false);
  const [saferData, setSaferData] = useState<FmcsaCarrierSummary | null>(null);
  const [saferLoading, setSaferLoading] = useState(false);
  const [saferError, setSaferError] = useState<string | null>(null);

  const handleSaferCheck = async () => {
    console.log('MC Number used for FMCSA API:', carrier.mcNumber);
    if (!carrier.mcNumber) {
      setSaferError('No MC number available for this carrier.');
      setSaferData(null);
      setSaferLoading(false);
      return;
    }
    setSaferLoading(true);
    setSaferError(null);
    setSaferData(null);
    try {
      const apiResponse = await fetchCarrierByMC(carrier.mcNumber);
      const carrierData = apiResponse?.content?.[0]?.carrier;
      if (!carrierData) {
        setSaferError('No FMCSA data found for this MC number.');
        setSaferData(null);
        setSaferLoading(false);
        return;
      }
      setSaferData({
        legalName: carrierData.legalName,
        dbaName: carrierData.dbaName,
        usdotNumber: carrierData.dotNumber,
        docketNumber: carrier.mcNumber || carrierData.docketNumber,
        status: carrierData.statusCode,
        outOfServiceDate: carrierData.oosDate,
        address: {
          street: carrierData.phyStreet,
          city: carrierData.phyCity,
          state: carrierData.phyState,
          zip: carrierData.phyZipcode,
        },
        phone: '', // Not available in this response
        mailingAddress: undefined, // Not available in this response
        powerUnits: carrierData.totalPowerUnits,
        drivers: carrierData.totalDrivers,
        entityType: '', // Not available in this response
        operatingStatus: carrierData.allowedToOperate === 'Y' ? 'Authorized' : 'Not Authorized',
        authorityStatus: carrierData.commonAuthorityStatus,
        mcMxNumbers: '', // Not available in this response
        mileage: '', // Not available in this response
      });
    } catch (err) {
      setSaferError('Could not fetch FMCSA data.');
    } finally {
      setSaferLoading(false);
    }
  };

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
        <button className={styles.saferButton} onClick={() => { setShowSaferModal(true); handleSaferCheck(); }}>
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
            {saferLoading && <p>Loading FMCSA data...</p>}
            {saferError && <p style={{ color: 'red' }}>{saferError}</p>}
            {saferData && (
              <div>
                <p><strong>Legal Name:</strong> {saferData.legalName}</p>
                <p><strong>DBA Name:</strong> {saferData.dbaName || 'N/A'}</p>
                <p><strong>USDOT Number:</strong> {saferData.usdotNumber}</p>
                <p><strong>MC Number:</strong> {saferData.docketNumber}</p>
                <p><strong>Status:</strong> {saferData.status}</p>
                <p><strong>Entity Type:</strong> {saferData.entityType || 'N/A'}</p>
                <p><strong>Operating Status:</strong> {saferData.operatingStatus || 'N/A'}</p>
                <p><strong>Authority Status:</strong> {saferData.authorityStatus || 'N/A'}</p>
                <p><strong>Out of Service Date:</strong> {saferData.outOfServiceDate || 'None'}</p>
                <p><strong>Address:</strong> {saferData.address ? `${saferData.address.street || ''}, ${saferData.address.city || ''}, ${saferData.address.state || ''} ${saferData.address.zip || ''}` : 'N/A'}</p>
                <p><strong>Phone:</strong> {saferData.phone || 'N/A'}</p>
                <p><strong>Mailing Address:</strong> {saferData.mailingAddress ? `${saferData.mailingAddress.street || ''}, ${saferData.mailingAddress.city || ''}, ${saferData.mailingAddress.state || ''} ${saferData.mailingAddress.zip || ''}` : 'N/A'}</p>
                <p><strong>Power Units:</strong> {saferData.powerUnits ?? 'N/A'}</p>
                <p><strong>Drivers:</strong> {saferData.drivers ?? 'N/A'}</p>
                <p><strong>Mileage:</strong> {saferData.mileage || 'N/A'}</p>
                <p><a href={`https://safer.fmcsa.dot.gov/query.asp?searchtype=ANY&query_type=queryCarrierSnapshot&query_param=MC_MX&query_string=${saferData.docketNumber}`} target="_blank" rel="noopener noreferrer">View Full SAFER Report</a></p>
              </div>
            )}
            {!saferLoading && !saferData && !saferError && <p>No FMCSA data available.</p>}
            <button className={styles.closeButton} onClick={() => setShowSaferModal(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CarrierProfileCard; 