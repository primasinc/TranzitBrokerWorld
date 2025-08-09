import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import styles from './MapboxMap.module.css';
import { konexialService } from '../../services/konexialService';
import type { KonexialVehicle } from '../../services/konexialService';

interface MapMarker {
  id: string;
  position: [number, number];
  type: 'carrier' | 'shipper' | 'load';
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
  circles?: { center: [number, number]; radius: number }[];
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
  eldApiKey,
  circles = []
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<{ [key: string]: mapboxgl.Marker }>({});
  const [konexialMarkers, setKonexialMarkers] = useState<MapMarker[]>([]);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const updateInterval = useRef<NodeJS.Timeout>();
  const [routeGeoJson, setRouteGeoJson] = useState<any>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    setMapError(null);

    const initializeMap = async () => {
      try {
        console.log('[Mapbox] 1. Starting initialization...');
        
        const token = eldApiKey || process.env.REACT_APP_MAPBOX_TOKEN || '';
        console.log(`[Mapbox] 3. Using token: ${token ? `pk...${token.slice(-5)}` : 'Not Found'}`);
        
        if (!token) {
          setMapError('Mapbox access token is missing. Please add REACT_APP_MAPBOX_TOKEN to your .env file.');
          console.error('[Mapbox] Failed: Token is missing.');
          return;
        }

        mapboxgl.accessToken = token;

        // Initialize map with center from props or default to US center
        const initialCenter = center || pickupLocation || [-98.5795, 39.8283];

        console.log('Initializing map with center:', initialCenter, 'zoom:', zoom);

        // Initialize map
        map.current = new mapboxgl.Map({
          container: mapContainer.current!,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: initialCenter,
          zoom: zoom,
          // Mobile-specific optimizations
          attributionControl: false, // Reduce clutter on mobile
          preserveDrawingBuffer: false, // Better performance
          antialias: false, // Better performance on mobile
        });

        console.log('[Mapbox] 6. Map object created. Adding controls...');
        // Add navigation controls with mobile-friendly positioning
        map.current.addControl(new mapboxgl.NavigationControl({
          showCompass: true,
          showZoom: true,
          visualizePitch: false // Disable on mobile for better performance
        }), 'top-right');

        // Call onMapLoad callback if provided
        if (onMapLoad && map.current) {
          map.current.on('load', () => {
            console.log('[Mapbox] 7. Map fully loaded.');
            setIsMapLoaded(true);
            if (map.current && onMapLoad) {
              onMapLoad(map.current);
            }
          });
        }

        // Add error handling
        map.current.on('error', (e) => {
          console.error('[Mapbox] Failed: A Mapbox error occurred.', e);
          setMapError('Map failed to load due to a Mapbox error.');
        });

        console.log('[Mapbox] 8. Initialization process complete.');

      } catch (error) {
        console.error('[Mapbox] Failed: An unexpected error occurred during initialization.', error);
        setMapError('Failed to initialize map');
      }
    };

    // Add a small delay to ensure DOM is ready (especially important on mobile)
    const initTimeout = setTimeout(initializeMap, 100);

    return () => {
      clearTimeout(initTimeout);
      // Clean up markers
      Object.values(markersRef.current).forEach(marker => {
        try {
          if (marker && typeof marker.remove === 'function') {
            marker.remove();
          }
        } catch (error) {
          console.warn('Failed to remove marker:', error);
        }
      });
      markersRef.current = {};

      // Safely remove map
      if (map.current) {
        try {
          if (map.current.getCanvas && map.current.getCanvas() && map.current.getCanvas().parentNode) {
            map.current.remove();
          }
        } catch (error) {
          console.warn('Failed to remove map:', error);
        }
        map.current = null;
      }
    };
  }, [onMapLoad, eldApiKey]);

  // Handle dynamic updates to center and zoom props
  useEffect(() => {
    if (map.current && isMapLoaded) {
      map.current.flyTo({
        center: center,
        zoom: zoom,
        speed: 1.2,
        essential: true,
      });
    }
  }, [center, zoom, isMapLoaded]);

  // NEW: Add a ResizeObserver to handle container resizing reliably
  useEffect(() => {
    if (!map.current || !mapContainer.current) return;

    const resizeObserver = new ResizeObserver(() => {
      if (map.current && typeof map.current.resize === 'function') {
        try {
          map.current.resize();
        } catch (error) {
          console.warn('Failed to resize map:', error);
        }
      }
    });

    resizeObserver.observe(mapContainer.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [map.current]); // Rerun this effect if the map instance changes

  // Create marker element with status dot
  const createMarkerElement = (marker: MapMarker) => {
    const el = document.createElement('div');
    el.className = styles.marker;
    el.style.cursor = 'pointer'; // Add pointer cursor for better UX

    // Set color based on marker type
    if (marker.type === 'carrier') {
      el.style.width = '22px';
      el.style.height = '22px';
      el.style.background = '#4285F4'; // Blue for carrier
      el.style.borderRadius = '50%';
      el.style.border = '2px solid #fff';
      el.style.boxShadow = '0 2px 8px rgba(66,133,244,0.18)';
      el.style.display = 'block';
    } else if (marker.type === 'shipper' || marker.type === 'load') {
      el.style.width = '22px';
      el.style.height = '22px';
      el.style.background = '#4CAF50'; // Green for load
      el.style.borderRadius = '50%';
      el.style.border = '2px solid #fff';
      el.style.boxShadow = '0 2px 8px rgba(76,175,80,0.18)';
      el.style.display = 'block';
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
    if (!map.current || !isMapLoaded) return;

    // Combine prop markers and Konexial markers
    const allMarkers = [...markers, ...konexialMarkers];

    // Remove markers that are no longer in either array
    Object.keys(markersRef.current).forEach(id => {
      if (!allMarkers.find(m => m.id === id)) {
        try {
          if (markersRef.current[id] && typeof markersRef.current[id].remove === 'function') {
            markersRef.current[id].remove();
          }
        } catch (error) {
          console.warn(`Failed to remove marker ${id}:`, error);
        }
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
        try {
          if (markersRef.current[marker.id] && typeof markersRef.current[marker.id].remove === 'function') {
            markersRef.current[marker.id].remove();
          }
        } catch (error) {
          console.warn(`Failed to remove existing marker ${marker.id}:`, error);
        }
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
  }, [markers, konexialMarkers, pickupLocation, deliveryLocation, isMapLoaded]);

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

  // Fetch and display route line when pickup and delivery are present
  useEffect(() => {
    const fetchRoute = async () => {
      if (!pickupLocation || !deliveryLocation) return;
      const accessToken = process.env.REACT_APP_MAPBOX_TOKEN;
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${pickupLocation[0]},${pickupLocation[1]};${deliveryLocation[0]},${deliveryLocation[1]}?geometries=geojson&access_token=${accessToken}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.routes && data.routes.length > 0) {
        setRouteGeoJson(data.routes[0].geometry);
      }
    };
    fetchRoute();
  }, [pickupLocation, deliveryLocation]);

  // Add route line to map when available
  useEffect(() => {
    if (!map.current || !routeGeoJson) return;
    
    // Helper function to safely remove route layer and source
    const safeRemoveRoute = () => {
      if (!map.current) return;
      
      try {
        if (map.current.getLayer && map.current.getLayer('route')) {
          map.current.removeLayer('route');
        }
        if (map.current.getSource && map.current.getSource('route')) {
          map.current.removeSource('route');
        }
      } catch (error) {
        console.warn('Failed to remove route layer/source:', error);
      }
    };

    // Remove existing route
    safeRemoveRoute();

    try {
      map.current.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: routeGeoJson
        }
      });
      map.current.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#007bff',
          'line-width': 4
        }
      });
      // Fit bounds to route
      const coords = routeGeoJson.coordinates;
      const bounds = coords.reduce((b: any, coord: any) => b.extend(coord), new mapboxgl.LngLatBounds(coords[0], coords[0]));
      map.current.fitBounds(bounds, { padding: 50, maxZoom: 10 });
    } catch (error) {
      console.warn('Failed to add route:', error);
    }

    return () => {
      safeRemoveRoute();
    };
  }, [routeGeoJson]);

  // Add circle rendering effect
  useEffect(() => {
    if (!map.current || !isMapLoaded || !Array.isArray(circles)) return;
    
    // Helper function to safely remove layer and source
    const safeRemoveLayerAndSource = (id: string) => {
      if (!map.current) return;
      
      try {
        // Check if layer exists before removing
        if (map.current.getLayer && map.current.getLayer(id)) {
          map.current.removeLayer(id);
        }
        // Check if source exists before removing
        if (map.current.getSource && map.current.getSource(id)) {
          map.current.removeSource(id);
        }
      } catch (error) {
        console.warn(`Failed to remove layer/source ${id}:`, error);
      }
    };

    // Helper function to generate circle GeoJSON
    const generateCircleGeoJSON = (center: [number, number], radius: number) => {
      const points = 64;
      const coords = [];
      const [lng, lat] = center;
      for (let j = 0; j <= points; j++) {
        const angle = (j / points) * 2 * Math.PI;
        // Radius is in meters, convert to degrees
        const radiusInKm = radius / 1000;
        const dx = radiusInKm / 111.32 * Math.cos(angle);
        const dy = radiusInKm / 111.32 * Math.sin(angle);
        coords.push([lng + dx, lat + dy]);
      }
      return {
        type: 'Feature' as const,
        properties: {},
        geometry: {
          type: 'Polygon' as const,
          coordinates: [coords],
        },
      };
    };

    // Process each circle
    circles.forEach((circle, i) => {
      if (!map.current) return;
      
      const circleId = `radius-${i}`;
      const geojson = generateCircleGeoJSON(circle.center, circle.radius);
      
      try {
        // Check if source already exists
        if (map.current.getSource && map.current.getSource(circleId)) {
          // Update existing source data
          const source = map.current.getSource(circleId) as mapboxgl.GeoJSONSource;
          if (source && source.setData) {
            source.setData(geojson);
          }
        } else {
          // Add new source
          map.current.addSource(circleId, {
            type: 'geojson',
            data: geojson,
          });
          
          // Add new layer
          if (!map.current.getLayer(circleId)) {
            map.current.addLayer({
              id: circleId,
              type: 'fill',
              source: circleId,
              paint: {
                'fill-color': '#4285F4',
                'fill-opacity': 0.12,
              },
            });
          }
        }
      } catch (error) {
        console.warn(`Failed to add/update circle ${i}:`, error);
      }
    });

    // Cleanup - only remove circles that are no longer in the array
    return () => {
      if (!map.current) return;
      
      // Remove all existing circles that are no longer needed
      let i = 0;
      while (map.current.getSource && map.current.getSource(`radius-${i}`)) {
        if (i >= circles.length) {
          safeRemoveLayerAndSource(`radius-${i}`);
        }
        i++;
      }
    };
  }, [circles, isMapLoaded]);

  // Show error state
  if (mapError) {
    return (
      <div className={styles.errorContainer}>
        <div style={{ textAlign: 'center' }}>
          <p className={styles.errorText}>
            ⚠️ {mapError}
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className={styles.retryButton}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return <div ref={mapContainer} className={styles.mapContainer} />;
};

export default MapboxMap; 