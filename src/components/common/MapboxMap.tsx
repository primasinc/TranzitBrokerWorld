import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Set the Mapbox token
mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN || '';

interface MapMarker {
  id: string;
  position: [number, number];
  type: 'carrier' | 'shipper';
  onClick?: () => void;
}

interface MapboxMapProps {
  center?: [number, number];
  zoom?: number;
  markers?: MapMarker[];
  onMapLoad?: (map: mapboxgl.Map) => void;
  pickupLocation?: [number, number];
  deliveryLocation?: [number, number];
}

const MapboxMap: React.FC<MapboxMapProps> = ({
  center,
  zoom = 4,
  markers = [],
  onMapLoad,
  pickupLocation,
  deliveryLocation
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

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

    // Add markers
    markers.forEach(marker => {
      const el = document.createElement('div');
      el.className = 'marker';
      el.style.width = '30px';
      el.style.height = '30px';
      el.style.backgroundImage = `url(${marker.type === 'carrier' ? '/truck-icon.svg' : '/warehouse-icon.svg'})`;
      el.style.backgroundSize = 'cover';
      el.style.cursor = 'pointer';

      const mapboxMarker = new mapboxgl.Marker(el)
        .setLngLat(marker.position)
        .addTo(map.current!);

      if (marker.onClick) {
        el.addEventListener('click', marker.onClick);
      }
    });

    // If pickup and delivery locations are provided, add them
    if (pickupLocation && deliveryLocation) {
      new mapboxgl.Marker({ color: '#4CAF50' })
        .setLngLat(pickupLocation)
        .setPopup(new mapboxgl.Popup().setHTML('<h3>Pickup Location</h3>'))
        .addTo(map.current);

      new mapboxgl.Marker({ color: '#F44336' })
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
    }

    // Call onMapLoad callback if provided
    if (onMapLoad && map.current) {
      map.current.on('load', () => {
        if (map.current && onMapLoad) {
          onMapLoad(map.current);
        }
      });
    }

    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, [center, zoom, markers, onMapLoad, pickupLocation, deliveryLocation]);

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

export default MapboxMap; 