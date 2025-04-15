import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import styles from './MapboxMap.module.css';

// Set the Mapbox token
mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN || '';

interface MapMarker {
  id: string;
  position: [number, number];
  type: 'carrier' | 'shipper';
  onClick?: () => void;
  status?: 'online' | 'offline' | 'inactive';
  icon?: string; // Make icon optional with a default value
}

interface MapboxMapProps {
  center?: [number, number];
  zoom?: number;
  markers?: MapMarker[];
  onMapLoad?: (map: mapboxgl.Map) => void;
  pickupLocation?: [number, number];
  deliveryLocation?: [number, number];
  enableRealtime?: boolean;
}

const MapboxMap: React.FC<MapboxMapProps> = ({
  center,
  zoom = 4,
  markers = [],
  onMapLoad,
  pickupLocation,
  deliveryLocation,
  enableRealtime = false
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<{ [key: string]: mapboxgl.Marker }>({});

  useEffect(() => {
    if (!mapContainer.current) return;

    // Initialize map with center from props or default to US center
    const initialCenter = center || pickupLocation || [-98.5795, 39.8283];

    // Initialize map
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: initialCenter,
      zoom: zoom
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Call onMapLoad callback if provided
    if (onMapLoad && map.current) {
      map.current.on('load', () => {
        if (map.current && onMapLoad) {
          onMapLoad(map.current);
        }
      });
    }

    return () => {
      // Clean up markers
      Object.values(markersRef.current).forEach(marker => marker.remove());
      markersRef.current = {};

      if (map.current) {
        map.current.remove();
      }
    };
  }, [center, zoom, onMapLoad]);

  // Handle marker updates
  useEffect(() => {
    if (!map.current) return;

    // Remove markers that are no longer in the props
    Object.keys(markersRef.current).forEach(id => {
      if (!markers.find(m => m.id === id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });

    // Update or add markers
    markers.forEach(marker => {
      const el = createMarkerElement(marker);

      if (markersRef.current[marker.id]) {
        // Update existing marker
        markersRef.current[marker.id].remove();
        const newMarker = new mapboxgl.Marker(el)
          .setLngLat(marker.position)
          .addTo(map.current!);
        markersRef.current[marker.id] = newMarker;
      } else {
        // Create new marker
        const mapboxMarker = new mapboxgl.Marker(el)
          .setLngLat(marker.position)
          .addTo(map.current!);

        if (marker.onClick) {
          el.addEventListener('click', marker.onClick);
        }

        markersRef.current[marker.id] = mapboxMarker;
      }
    });

    // If pickup and delivery locations are provided, add them
    if (pickupLocation && deliveryLocation) {
      const pickupMarker = new mapboxgl.Marker({ color: '#4CAF50' })
        .setLngLat(pickupLocation)
        .setPopup(new mapboxgl.Popup().setHTML('<h3>Pickup Location</h3>'))
        .addTo(map.current);

      const deliveryMarker = new mapboxgl.Marker({ color: '#F44336' })
        .setLngLat(deliveryLocation)
        .setPopup(new mapboxgl.Popup().setHTML('<h3>Delivery Location</h3>'))
        .addTo(map.current);

      // Fit bounds to show both markers
      const bounds = new mapboxgl.LngLatBounds()
        .extend(pickupLocation)
        .extend(deliveryLocation);

      map.current.fitBounds(bounds, {
        padding: 50,
        maxZoom: 10
      });

      // Clean up these markers on next update
      return () => {
        pickupMarker.remove();
        deliveryMarker.remove();
      };
    }
  }, [markers, pickupLocation, deliveryLocation]);

  return (
    <div 
      ref={mapContainer} 
      style={{ 
        width: '100%', 
        height: '400px',
        borderRadius: '8px',
        overflow: 'hidden'
      }} 
    />
  );
};

const createMarkerElement = (marker: MapMarker) => {
  const el = document.createElement('div');
  el.className = styles.marker;
  
  const markerIcon = document.createElement('img');
  markerIcon.src = marker.icon || (marker.type === 'carrier' ? '/truck-icon.svg' : '/warehouse-icon.svg');
  markerIcon.width = 30;
  markerIcon.height = 30;
  el.appendChild(markerIcon);

  if (marker.status) {
    const statusDot = document.createElement('div');
    statusDot.className = `${styles['status-dot']} ${styles[marker.status]}`;
    el.appendChild(statusDot);
  }

  return el;
};

export default MapboxMap; 