import React from 'react';
import MapboxMap from '../components/common/MapboxMap';

const TestKonexial: React.FC = () => {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Konexial ELD Test</h1>
      <div style={{ 
        width: '100%', 
        minHeight: '600px',
        height: '70vh',
        maxHeight: '800px',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
      }}>
        <MapboxMap 
          showKonexialVehicles={true}
          enableRealtime={true}
          zoom={5}
          // Center on Texas as a starting point
          center={[-99.9018, 31.9686]}
        />
      </div>
    </div>
  );
};

export default TestKonexial; 