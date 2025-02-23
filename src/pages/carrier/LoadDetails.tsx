import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { GoogleMap } from '@react-google-maps/api';
import { loadService } from '../../services/loadService';
import { LoadDetailsSkeleton } from '../../components/LoadingSkeleton';
import styles from './LoadDetails.module.css';

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

const LoadDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [isUpdating, setIsUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [statusHistory, setStatusHistory] = useState<LoadStatus[]>([]);
  const [items, setItems] = useState<any[]>([]);
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
  const [map, setMap] = useState<google.maps.Map | null>(null);

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
    if (map && loadData.pickup.coordinates && loadData.delivery.coordinates) {
      // Create markers using AdvancedMarkerElement
      const pickupMarker = new google.maps.marker.AdvancedMarkerElement({
        map,
        position: loadData.pickup.coordinates,
        title: 'Pickup Location'
      });

      const deliveryMarker = new google.maps.marker.AdvancedMarkerElement({
        map,
        position: loadData.delivery.coordinates,
        title: 'Delivery Location'
      });

      // Fit bounds to show both markers
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(loadData.pickup.coordinates);
      bounds.extend(loadData.delivery.coordinates);
      map.fitBounds(bounds);

      // Cleanup markers on unmount
      return () => {
        pickupMarker.map = null;
        deliveryMarker.map = null;
      };
    }
  }, [map, loadData]);

  const onMapLoad = (map: google.maps.Map) => {
    setMap(map);
  };

  if (isLoading) {
    return <LoadDetailsSkeleton />;
  }

  const handleStatusUpdate = async () => {
    if (!id || !newStatus) return;

    setIsLoading(true);
    try {
      const result = await loadService.updateLoadStatus({
        loadId: id,
        status: newStatus,
        notes: newNotes
      });

      // Add new status to history
      setStatusHistory(prev => [{
        timestamp: result.data.timestamp,
        status: result.data.status,
        location: result.data.location || '',
        notes: result.data.notes
      }, ...prev]);

      // Reset form
      setIsUpdating(false);
      setNewStatus('');
      setNewNotes('');
    } catch (error) {
      console.error('Error updating status:', error);
      // You might want to show an error message to the user here
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

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>{loadData.title}</h1>
        <span className={styles[loadData.status]}>{loadData.status}</span>
      </header>

      <div className={styles.content}>
        <section className={styles.mainInfo}>
          <div className={styles.infoCard}>
            <h2>Load Information</h2>
            <div className={styles.details}>
              <div className={styles.detail}>
                <label>Shipper:</label>
                <span>{loadData.shipper}</span>
              </div>
              <div className={styles.detail}>
                <label>Payment:</label>
                <span>${loadData.payment}</span>
              </div>
              <div className={styles.detail}>
                <label>Weight:</label>
                <span>{loadData.weight}</span>
              </div>
              <div className={styles.detail}>
                <label>Dimensions:</label>
                <span>{loadData.dimensions}</span>
              </div>
            </div>
          </div>

          <div className={styles.locationCard}>
            <div className={styles.location}>
              <h3>Pickup</h3>
              <p>{loadData.pickup.location}</p>
              <p>{loadData.pickup.time}</p>
              <span className={styles[loadData.pickup.status]}>
                {loadData.pickup.status}
              </span>
            </div>
            <div className={styles.location}>
              <h3>Delivery</h3>
              <p>{loadData.delivery.location}</p>
              <p>{loadData.delivery.time}</p>
              <span className={styles[loadData.delivery.status]}>
                {loadData.delivery.status}
              </span>
            </div>
          </div>
        </section>

        <section className={styles.mapSection}>
          <h2>Route Map</h2>
          <GoogleMap
            mapContainerStyle={{
              width: '100%',
              height: '400px'
            }}
            center={loadData.pickup.coordinates}
            zoom={7}
            onLoad={onMapLoad}
          >
            {/* Markers are now handled in useEffect */}
          </GoogleMap>
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

        <section className={styles.statusUpdates}>
          <div className={styles.statusHeader}>
            <h2>Status Updates</h2>
            <button 
              className={styles.updateButton}
              onClick={() => setIsUpdating(true)}
              disabled={isLoading}
            >
              {isLoading ? 'Updating...' : 'Add Update'}
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
                placeholder="Add notes..."
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
                  onClick={handleStatusUpdate}
                  disabled={isLoading || !newStatus}
                >
                  {isLoading ? 'Submitting...' : 'Submit Update'}
                </button>
              </div>
            </div>
          )}

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