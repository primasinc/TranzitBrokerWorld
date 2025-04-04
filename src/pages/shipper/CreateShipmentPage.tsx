import React from 'react';
import ShippingScheduleForm from '../../components/shipper/forms/ShippingScheduleForm';
import styles from './CreateShipmentPage.module.css';

const CreateShipmentPage: React.FC = () => {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Create New Shipment</h1>
        <p>Fill out the form below to create a new shipping schedule</p>
      </div>
      
      <div className={styles.formContainer}>
        <ShippingScheduleForm />
      </div>
    </div>
  );
};

export default CreateShipmentPage; 