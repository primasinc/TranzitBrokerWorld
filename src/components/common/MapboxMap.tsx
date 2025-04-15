import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Set the Mapbox token
mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN || '';

interface MapboxMapProps {
  pickupLocation: [number, number];
  deliveryLocation: [number, number];
}

const MapboxMap: React.FC<MapboxMapProps> = ({ pickupLocation, deliveryLocation }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Initialize map
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: pickupLocation,
      zoom: 5
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add markers
    new mapboxgl.Marker({ color: '#4CAF50' })
      .setLngLat(pickupLocation)
      .setPopup(new mapboxgl.Popup().setHTML('<h3>Pickup Location</h3>'))
      .addTo(map.current);

    new mapboxgl.Marker({ color: '#F44336' })
      .setLngLat(deliveryLocation)
      .setPopup(new mapboxgl.Popup().setHTML('<h3>Delivery Location</h3>'))
      .addTo(map.current);

    // Add route line
    map.current.on('load', () => {
      const bounds = new mapboxgl.LngLatBounds()
        .extend(pickupLocation)
        .extend(deliveryLocation);

      map.current?.fitBounds(bounds, {
        padding: 50,
        maxZoom: 10
      });
    });

    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, [pickupLocation, deliveryLocation]);

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