import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import MapboxMap from '../../components/common/MapboxMap';
import { loadService } from '../../services/loadService';
import { LoadDetailsSkeleton } from '../../components/LoadingSkeleton';
import mapboxgl from 'mapbox-gl';
import styles from './LoadDetails.module.css';
import { collection, getDocs, doc, getDoc, query, where, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { carrierNotesService, CarrierNote } from '../../services/carrierNotesService';

interface LoadStatus {
  timestamp: string;
  status: string;
  location: string;
  notes?: string;
}

interface LoadLocation {
  location: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  time: string;
  status: string;
}

interface Load {
  id: string;
  title: string;
  shipper: string;
  pickup: LoadLocation;
  delivery: LoadLocation;
  status: string;
  payment: number;
  weight: string;
  dimensions: string;
  items: Array<{
    id: string;
    name: string;
    status: string;
  }>;
}

interface LoadDetails {
  id: string;
  pickupLocation: {
    address: string;
    position: [number, number];
  };
  deliveryLocation: {
    address: string;
    position: [number, number];
  };
  // ... other existing properties ...
}

const LoadDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [statusHistory, setStatusHistory] = useState<LoadStatus[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [carrierNotes, setCarrierNotes] = useState<CarrierNote[]>([]);
  const [loadData, setLoadData] = useState<Load>({
    id: '',
    title: '',
    shipper: '',
    pickup: {
      location: '',
      coordinates: { lat: 41.8781, lng: -87.6298 },
      time: '',
      status: ''
    },
    delivery: {
      location: '',
      coordinates: { lat: 40.7128, lng: -74.0060 },
      time: '',
      status: ''
    },
    status: '',
    payment: 0,
    weight: '',
    dimensions: '',
    items: []
  });
  const [load, setLoad] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [poData, setPoData] = useState<any>(null);
  const [pickupCoords, setPickupCoords] = useState<[number, number] | null>(null);
  const [deliveryCoords, setDeliveryCoords] = useState<[number, number] | null>(null);

  useEffect(() => {
    const fetchLoadDetails = async () => {
      if (!id) return;
      
      setIsLoading(true);
      try {
        const loadItems = await loadService.getLoadItems(id);
        // Simulate fetching load details
        const mockLoadData: Load = {
          id,
          title: 'Electronics Shipment',
          shipper: 'ABC Electronics',
          pickup: {
            location: 'Chicago, IL',
            coordinates: { lat: 41.8781, lng: -87.6298 },
            time: '2024-02-25 09:00',
            status: 'completed'
          },
          delivery: {
            location: 'New York, NY',
            coordinates: { lat: 40.7128, lng: -74.0060 },
            time: '2024-02-26 15:00',
            status: 'in_progress'
          },
          status: 'in_progress',
          payment: 2500,
          weight: '15,000 lbs',
          dimensions: '53\' Trailer',
          items: loadItems
        };
        
        setLoadData(mockLoadData);
      } catch (error) {
        console.error('Error fetching load details:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLoadDetails();
  }, [id]);

  useEffect(() => {
    const fetchLoadAndPO = async () => {
      if (!id) return;
      setLoading(true);
      try {
        // Fetch load details
        const loadRef = doc(db, 'loads', id);
        const loadSnap = await getDoc(loadRef);
        
        if (loadSnap.exists()) {
          const loadData = loadSnap.data();
          setLoad(loadData);
          
          // Fetch carrier notes for this load
          try {
            const notes = await carrierNotesService.getCarrierNotesByLoadId(id);
            setCarrierNotes(notes);
          } catch (error) {
            console.error('Error fetching carrier notes:', error);
          }
          
          // Fetch PO data if available
          if (loadData.poNumber) {
            const poQuery = query(collection(db, 'purchaseOrders'), where('poNumber', '==', loadData.poNumber));
            const poSnap = await getDocs(poQuery);
            if (!poSnap.empty) {
              setPoData(poSnap.docs[0].data());
            }
          }
        } else {
          setError('Load not found');
        }
      } catch (error) {
        console.error('Error fetching load details:', error);
        setError('Failed to load details');
      } finally {
        setLoading(false);
      }
    };
    fetchLoadAndPO();
  }, [id]);

  // Handle hash navigation to status updates section
  useEffect(() => {
    if (window.location.hash === '#status-updates') {
      // Wait for the component to render, then scroll to the status updates section
      const timer = setTimeout(() => {
        const statusUpdatesSection = document.querySelector('[data-section="status-updates"]');
        if (statusUpdatesSection) {
          statusUpdatesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          // Open the status update form
          setIsUpdating(true);
        }
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!load) return <div>Load not found</div>;

  const handleCarrierNoteUpdate = async () => {
    console.log('handleCarrierNoteUpdate called with:', { id, newStatus, user });
    
    if (!id || !newStatus || !user) {
      console.log('Missing required data:', { id, newStatus, user });
      alert('Please select a status and ensure you are logged in.');
      return;
    }

    if (!user.uid) {
      console.log('User UID is missing:', user);
      alert('User authentication error. Please log in again.');
      return;
    }

    console.log('User is authenticated:', { uid: user.uid, email: user.email, displayName: user.displayName });

    setIsLoading(true);
    try {
      // Get the poNumber from the load data
      const loadRef = doc(db, 'loads', id);
      const loadSnap = await getDoc(loadRef);
      if (!loadSnap.exists()) {
        alert('Load not found.');
        return;
      }
      
      const loadData = loadSnap.data();
      const poNumber = loadData.poNumber;
      
      if (!poNumber) {
        alert('Purchase order number not found for this load.');
        return;
      }

      const carrierNoteData = {
        poNumber: poNumber,
        loadId: id,
        userId: user.uid,
        carrierName: user.displayName || user.email || 'Unknown Carrier',
        status: newStatus,
        notes: newNotes.substring(0, 250)
      };

      console.log('Creating carrier note with data:', carrierNoteData);

      // Add carrier note using the new service
      const carrierNote = await carrierNotesService.addCarrierNote(carrierNoteData);

      console.log('Carrier note created successfully:', carrierNote);

      // Add new note to the list
      setCarrierNotes(prev => [carrierNote, ...prev]);

      // Reset form
      setIsUpdating(false);
      setNewStatus('');
      setNewNotes('');
      
      // Show success message
      alert('Status update added successfully!');
    } catch (error) {
      console.error('Error adding carrier note:', error);
      // More detailed error message
      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
        if (error.message.includes('permission')) {
          errorMessage = 'Permission denied. Please check if you are properly logged in and have the necessary permissions.';
        } else if (error.message.includes('index')) {
          errorMessage = 'Database index not ready. Please try again in a few moments.';
        }
      }
      alert(`Failed to add status update: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleItemStatusUpdate = async (itemId: string, newStatus: string) => {
    if (!id) return;

    try {
      await loadService.updateItemStatus(id, itemId, newStatus);
      
      // Update items list with new status
      setItems(prevItems => 
        prevItems.map(item => 
          item.id === itemId ? { ...item, status: newStatus } : item
        )
      );
    } catch (error) {
      console.error('Error updating item status:', error);
    }
  };

  const handleMarkDelayed = async () => {
    if (!id) return;
    setIsUpdating(true);
    try {
      // Update the load status to 'Delayed'
      const loadRef = doc(db, 'loads', id);
      await updateDoc(loadRef, { status: 'Delayed', updatedAt: new Date() });
      setNewStatus('Delayed');
      setIsUpdating(false);
      alert('Status set to Delayed.');
    } catch (err) {
      setIsUpdating(false);
      alert('Failed to set status to Delayed.');
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>{poData?.title || load?.['title'] || 'Shipment Details'}</h1>
        <span className={styles[load?.['status'] || '']}>{load?.['status']}</span>
      </header>

      <div className={styles.content}>
        <section className={styles.mainInfo}>
          <div className={styles.infoCard}>
            <h2>Load Information</h2>
            <div className={styles.details}>
              <div className={styles.detail}>
                <label>Shipper:</label>
                <span>{poData?.companyInfo?.name || load?.['shipper']}</span>
              </div>
              <div className={styles.detail}>
                <label>Payment:</label>
                <span>${poData?.rate || load?.['payment']}</span>
              </div>
              <div className={styles.detail}>
                <label>Weight:</label>
                <span>{poData?.items?.reduce((sum: number, item: any) => sum + (item.weight || 0), 0) || load?.['weight']}</span>
              </div>
              <div className={styles.detail}>
                <label>Dimensions:</label>
                <span>{load?.['dimensions']}</span>
              </div>
            </div>
          </div>

          <div className={styles.locationCard}>
            <div className={styles.location}>
              <h3>Pickup</h3>
              <p>{poData?.vendorInfo?.streetAddress}, {poData?.vendorInfo?.cityStateZip}</p>
              <span className={styles[load?.['pickup']?.status || '']}>
                {load?.['pickup']?.status}
              </span>
            </div>
            <div className={styles.location}>
              <h3>Delivery</h3>
              <p>{poData?.shipTo?.streetAddress}, {poData?.shipTo?.cityStateZip}</p>
              <span className={styles[load?.['delivery']?.status || '']}>
                {load?.['delivery']?.status}
              </span>
            </div>
          </div>
        </section>

        <section className={styles.mapSection}>
          <h2>Route Map</h2>
          <div className={styles.mapContainer}>
            <MapboxMap
              pickupLocation={pickupCoords || undefined}
              deliveryLocation={deliveryCoords || undefined}
            />
          </div>
        </section>

        <section className={styles.itemTracking}>
          <h2>Item Tracking</h2>
          <div className={styles.itemsList}>
            {items.map(item => (
              <div key={item.id} className={styles.item}>
                <span>{item.name}</span>
                <div className={styles.itemStatus}>
                  <span className={styles[item.status]}>{item.status}</span>
                  <select
                    value={item.status}
                    onChange={(e) => handleItemStatusUpdate(item.id, e.target.value)}
                  >
                    <option value="pending">Pending</option>
                    <option value="loaded">Loaded</option>
                    <option value="in_transit">In Transit</option>
                    <option value="delivered">Delivered</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.statusUpdates} data-section="status-updates">
          <h2>Status Updates</h2>
          <div className={styles.statusHeader}>
            <button 
              className={styles.updateButton}
              onClick={() => setIsUpdating(true)}
              disabled={isLoading}
            >
              {isLoading ? 'Updating...' : 'Add Update'}
            </button>
            <button 
              className={styles.statusButton}
              onClick={() => setIsUpdating(true)}
              disabled={isLoading}
              style={{ marginLeft: 8 }}
            >
              Status
            </button>
            <button 
              className={styles.updateButton}
              onClick={handleMarkDelayed}
              disabled={isUpdating}
              style={{ marginLeft: 8 }}
            >
              Mark as Delayed
            </button>
          </div>

          {isUpdating && (
            <div className={styles.updateForm}>
              <select 
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                disabled={isLoading}
              >
                <option value="">Select Status</option>
                <option value="at_pickup">At Pickup</option>
                <option value="loading">Loading</option>
                <option value="in_transit">In Transit</option>
                <option value="at_delivery">At Delivery</option>
                <option value="unloading">Unloading</option>
                <option value="completed">Completed</option>
              </select>
              <textarea
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Add notes (max 250 characters)..."
                maxLength={250}
                disabled={isLoading}
              />
              <div className={styles.updateActions}>
                <button 
                  className={styles.cancelButton}
                  onClick={() => setIsUpdating(false)}
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button 
                  className={styles.submitButton}
                  onClick={handleCarrierNoteUpdate}
                  disabled={isLoading || !newStatus}
                >
                  {isLoading ? 'Submitting...' : 'Submit Update'}
                </button>
              </div>
            </div>
          )}

          {/* Carrier Notes Section */}
          <div className={styles.carrierNotes}>
            <h3>Carrier Notes</h3>
            {carrierNotes.length === 0 ? (
              <p className={styles.noNotes}>No carrier notes yet.</p>
            ) : (
              <div className={styles.notesList}>
                {carrierNotes.map((note, index) => (
                  <div key={note.id || index} className={styles.noteItem}>
                    <div className={styles.noteHeader}>
                      <span className={styles.noteTimestamp}>
                        {note.timestamp instanceof Date 
                          ? note.timestamp.toLocaleString()
                          : note.timestamp?.toDate?.()?.toLocaleString() || 'N/A'
                        }
                      </span>
                      <span className={styles.noteStatus}>{note.status}</span>
                    </div>
                    {note.notes && (
                      <p className={styles.noteText}>{note.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={styles.timeline}>
            {statusHistory.map((status, index) => (
              <div key={index} className={styles.timelineItem}>
                <div className={styles.timelinePoint} />
                <div className={styles.timelineContent}>
                  <div className={styles.timelineHeader}>
                    <span className={styles.timestamp}>{status.timestamp}</span>
                    <span className={styles.statusText}>{status.status}</span>
                  </div>
                  <p className={styles.location}>{status.location}</p>
                  {status.notes && <p className={styles.notes}>{status.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default LoadDetails; 