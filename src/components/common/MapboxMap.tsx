import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Types
interface MapboxMapProps {
  center?: [number, number];
  zoom?: number;
  markers?: Array<{
    id: string;
    position: [number, number];
    type: 'shipper' | 'carrier';
    onClick?: () => void;
  }>;
  onMapLoad?: (map: mapboxgl.Map) => void;
}

// Initialize Mapbox
mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN || '';

const MapboxMap: React.FC<MapboxMapProps> = ({
  center = [-98.5795, 39.8283], // USA center
  zoom = 4,
  markers = [],
  onMapLoad
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Initialize map
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: center,
      zoom: zoom
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Handle map load
    map.current.on('load', () => {
      setMapLoaded(true);
      if (onMapLoad) onMapLoad(map.current!);
    });

    // Cleanup
    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, []);

  // Update markers when they change
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Clear existing markers
    const existingMarkers = document.getElementsByClassName('mapboxgl-marker');
    Array.from(existingMarkers).forEach(marker => marker.remove());

    // Add new markers
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
  }, [markers, mapLoaded]);

  return (
    <div 
      ref={mapContainer} 
      style={{ 
        width: '100%', 
        height: '100%',
        minHeight: '400px'
      }} 
    />
  );
};

export default MapboxMap; 