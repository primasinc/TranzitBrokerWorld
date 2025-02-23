import React from 'react';
import { useParams } from 'react-router-dom';

const ViewProfile: React.FC = () => {
  const { id } = useParams();
  
  return (
    <div>
      <h1>View Profile</h1>
      {/* TODO: Implement profile view */}
    </div>
  );
};

export default ViewProfile; 