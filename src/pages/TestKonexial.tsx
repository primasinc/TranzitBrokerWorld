import React from 'react';
import MapboxMap from '../components/common/MapboxMap';

const TestKonexial: React.FC = () => {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Konexial ELD Test</h1>
      <div style={{ height: '600px', width: '100%' }}>
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