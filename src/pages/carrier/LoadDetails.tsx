import React from 'react';
import { useParams } from 'react-router-dom';

const LoadDetails: React.FC = () => {
  const { id } = useParams();
  
  return (
    <div>
      <h1>Load Details</h1>
      {/* TODO: Implement load details view */}
    </div>
  );
};

export default LoadDetails; 