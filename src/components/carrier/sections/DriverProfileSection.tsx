import React from 'react';
import { Control, Controller, FieldErrors } from 'react-hook-form';
import { CarrierProfile } from '../../../types/carrier';
import styles from '../CarrierProfileForm.module.css';

interface DriverProfileSectionProps {
  control: Control<CarrierProfile>;
  errors: FieldErrors<CarrierProfile>;
}

export const DriverProfileSection: React.FC<DriverProfileSectionProps> = ({
  control,
  errors
}) => {
  return (
    <div className={styles.driverProfileSection}>
      <h3>Driver Profile Information</h3>
      <p className={styles.sectionDescription}>
        Provide driver-specific information that will be displayed to shippers during route tracking.
      </p>
      
      <div className={styles.formGrid}>
        <div className={styles.formGroup}>
          <label htmlFor="driverName">Driver Name</label>
          <Controller
            name="driverName"
            control={control}
            render={({ field }) => (
              <input
                {...field}
                type="text"
                id="driverName"
                placeholder="Enter driver name"
                className={errors.driverName ? styles.error : ''}
              />
            )}
          />
          {errors.driverName && <span className={styles.errorMessage}>{errors.driverName.message}</span>}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="driverPhone">Driver Phone</label>
          <Controller
            name="driverPhone"
            control={control}
            render={({ field }) => (
              <input
                {...field}
                type="tel"
                id="driverPhone"
                placeholder="(555) 123-4567"
                className={errors.driverPhone ? styles.error : ''}
              />
            )}
          />
          {errors.driverPhone && <span className={styles.errorMessage}>{errors.driverPhone.message}</span>}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="vehicleVin">Vehicle VIN</label>
          <Controller
            name="vehicleVin"
            control={control}
            render={({ field }) => (
              <input
                {...field}
                type="text"
                id="vehicleVin"
                placeholder="Enter vehicle VIN"
                className={errors.vehicleVin ? styles.error : ''}
              />
            )}
          />
          {errors.vehicleVin && <span className={styles.errorMessage}>{errors.vehicleVin.message}</span>}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="driverDotNumber">Driver DOT Number</label>
          <Controller
            name="driverDotNumber"
            control={control}
            render={({ field }) => (
              <input
                {...field}
                type="text"
                id="driverDotNumber"
                placeholder="Enter driver DOT number"
                className={errors.driverDotNumber ? styles.error : ''}
              />
            )}
          />
          {errors.driverDotNumber && <span className={styles.errorMessage}>{errors.driverDotNumber.message}</span>}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="eldCompany">ELD Company</label>
          <Controller
            name="eldCompany"
            control={control}
            render={({ field }) => (
              <input
                {...field}
                type="text"
                id="eldCompany"
                placeholder="Enter ELD company name"
                className={errors.eldCompany ? styles.error : ''}
              />
            )}
          />
          {errors.eldCompany && <span className={styles.errorMessage}>{errors.eldCompany.message}</span>}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="eldApiId">ELD API ID</label>
          <Controller
            name="eldApiId"
            control={control}
            render={({ field }) => (
              <input
                {...field}
                type="text"
                id="eldApiId"
                placeholder="Enter ELD API ID"
                className={errors.eldApiId ? styles.error : ''}
              />
            )}
          />
          {errors.eldApiId && <span className={styles.errorMessage}>{errors.eldApiId.message}</span>}
        </div>
      </div>

      <div className={styles.formNotes}>
        <p><strong>Note:</strong> This information will be displayed to shippers in the driver route details modal.</p>
      </div>
    </div>
  );
}; 