import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import styles from './MapboxMap.module.css';
import { konexialService } from '../../services/konexialService';
import type { KonexialVehicle } from '../../services/konexialService';

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
  showKonexialVehicles?: boolean;
  eldApiKey?: string;
}

const MapboxMap: React.FC<MapboxMapProps> = ({
  center,
  zoom = 4,
  markers = [],
  onMapLoad,
  pickupLocation,
  deliveryLocation,
  enableRealtime = false,
  showKonexialVehicles = false,
  eldApiKey
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<{ [key: string]: mapboxgl.Marker }>({});
  const [konexialMarkers, setKonexialMarkers] = useState<MapMarker[]>([]);
  const updateInterval = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!mapContainer.current) return;

    // Set the Mapbox access token dynamically if eldApiKey is provided
    if (eldApiKey) {
      mapboxgl.accessToken = eldApiKey;
    } else {
      mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN || '';
    }

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
  }, [center, zoom, onMapLoad, eldApiKey]);

  // Create marker element with status dot
  const createMarkerElement = (marker: MapMarker) => {
    const el = document.createElement('div');
    el.className = styles.marker;
    el.style.cursor = 'pointer'; // Add pointer cursor for better UX

    // Add colored circle if specified
    if (marker.icon === 'circle') {
      el.style.width = '22px';
      el.style.height = '22px';
      el.style.background = '#4285F4';
      el.style.borderRadius = '50%';
      el.style.border = '2px solid #fff';
      el.style.boxShadow = '0 2px 8px rgba(66,133,244,0.18)';
      el.style.display = 'block';
    }

    // Add truck icon if specified
    if (marker.icon === 'truck') {
      el.textContent = '🚚'; // Show truck emoji for truck markers
      el.style.fontSize = '28px';
      el.style.lineHeight = '1';
    }

    // Add status dot if status is provided
    if (marker.status) {
      const statusDot = document.createElement('div');
      statusDot.className = `${styles['status-dot']} ${styles[marker.status]}`;
      el.appendChild(statusDot);
    }

    return el;
  };

  // Handle marker updates
  useEffect(() => {
    if (!map.current) return;

    // Combine prop markers and Konexial markers
    const allMarkers = [...markers, ...konexialMarkers];

    // Remove markers that are no longer in either array
    Object.keys(markersRef.current).forEach(id => {
      if (!allMarkers.find(m => m.id === id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });

    // Update or add markers
    allMarkers.forEach(marker => {
      const el = createMarkerElement(marker);
      // Always remove previous click event listeners
      el.onclick = null;
      if (marker.onClick) {
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          console.log('Marker clicked:', marker.id);
          marker.onClick && marker.onClick();
        });
      }

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
  }, [markers, konexialMarkers, pickupLocation, deliveryLocation]);

  // Handle Konexial vehicle updates
  useEffect(() => {
    if (!showKonexialVehicles) return;

    const updateVehiclePositions = async () => {
      try {
        console.log('Fetching Konexial vehicles...');
        const vehicles = await konexialService.getVehicles();
        console.log('Received vehicles:', vehicles);

        const newMarkers: MapMarker[] = vehicles
          .filter((vehicle: KonexialVehicle) => {
            console.log('Vehicle data:', vehicle);
            return vehicle.last_position;
          })
          .map((vehicle: KonexialVehicle) => ({
            id: vehicle.id,
            position: [vehicle.last_position!.longitude, vehicle.last_position!.latitude] as [number, number],
            type: 'carrier',
            status: 'online',
            onClick: () => {
              const popup = new mapboxgl.Popup()
                .setHTML(`
                  <div>
                    <h3>Truck ${vehicle.truck_number}</h3>
                    <p>Last Update: ${new Date(vehicle.last_position!.timestamp).toLocaleString()}</p>
                    ${vehicle.last_position!.speed ? `<p>Speed: ${vehicle.last_position!.speed} mph</p>` : ''}
                    ${vehicle.last_position!.heading ? `<p>Heading: ${vehicle.last_position!.heading}°</p>` : ''}
                  </div>
                `);
              markersRef.current[vehicle.id].setPopup(popup);
            }
          }));

        console.log('Created markers:', newMarkers);
        setKonexialMarkers(newMarkers);
      } catch (error) {
        console.error('Error updating vehicle positions:', error);
      }
    };

    // Initial update
    updateVehiclePositions();

    // Set up interval for updates if realtime is enabled
    if (enableRealtime) {
      updateInterval.current = setInterval(updateVehiclePositions, 30000);
    }

    return () => {
      if (updateInterval.current) {
        clearInterval(updateInterval.current);
      }
    };
  }, [showKonexialVehicles]);

  // Ensure map resizes after mount (fixes blank map on navigation)
  useEffect(() => {
    if (!map.current) return;
    setTimeout(() => {
      map.current?.resize();
    }, 150);
  }, []);

  return <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />;
};

export default MapboxMap; 