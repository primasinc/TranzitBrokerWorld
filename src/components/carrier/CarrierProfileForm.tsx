import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { CarrierProfile } from '../../types/carrier';
import { BasicInfoSection } from './sections/BasicInfoSection';
import { EquipmentSection } from './sections/EquipmentSection';
import { ServiceAreasSection } from './sections/ServiceAreasSection';
import { InsuranceSection } from './sections/InsuranceSection';
import { DriverProfileSection } from './sections/DriverProfileSection';
import styles from './CarrierProfileForm.module.css';

interface CarrierProfileFormProps {
  initialData?: Partial<CarrierProfile>;
  onSubmit: (data: CarrierProfile) => Promise<void>;
  isLoading?: boolean;
  disabled?: boolean;
}

export const CarrierProfileForm: React.FC<CarrierProfileFormProps> = ({
  initialData,
  onSubmit,
  isLoading = false,
  disabled = false
}) => {
  const [activeSection, setActiveSection] = useState('basic');
  const { control, handleSubmit, formState: { errors }, watch } = useForm<CarrierProfile>({
    defaultValues: initialData
  });

  const handleFormSubmit = async (data: CarrierProfile) => {
    try {
      await onSubmit(data);
    } catch (error) {
      console.error('Error submitting carrier profile:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className={styles.form}>
      <div className={styles.navigation}>
        <button
          type="button"
          className={`${styles.navButton} ${activeSection === 'basic' ? styles.active : ''}`}
          onClick={() => setActiveSection('basic')}
          disabled={disabled}
        >
          Basic Information
        </button>
        <button
          type="button"
          className={`${styles.navButton} ${activeSection === 'equipment' ? styles.active : ''}`}
          onClick={() => setActiveSection('equipment')}
          disabled={disabled}
        >
          Equipment
        </button>
        <button
          type="button"
          className={`${styles.navButton} ${activeSection === 'areas' ? styles.active : ''}`}
          onClick={() => setActiveSection('areas')}
          disabled={disabled}
        >
          Service Areas
        </button>
        <button
          type="button"
          className={`${styles.navButton} ${activeSection === 'insurance' ? styles.active : ''}`}
          onClick={() => setActiveSection('insurance')}
          disabled={disabled}
        >
          Insurance
        </button>
        <button
          type="button"
          className={`${styles.navButton} ${activeSection === 'driver' ? styles.active : ''}`}
          onClick={() => setActiveSection('driver')}
          disabled={disabled}
        >
          Driver Profile
        </button>
      </div>

      <div className={styles.formContent}>
        {activeSection === 'basic' && (
          <BasicInfoSection control={control} errors={errors} />
        )}
        {activeSection === 'equipment' && (
          <EquipmentSection control={control} errors={errors} />
        )}
        {activeSection === 'areas' && (
          <ServiceAreasSection control={control} errors={errors} />
        )}
        {activeSection === 'insurance' && (
          <InsuranceSection control={control} errors={errors} />
        )}
        {activeSection === 'driver' && (
          <DriverProfileSection control={control} errors={errors} />
        )}
      </div>

      <div className={styles.actions}>
        <button
          type="submit"
          className={styles.submitButton}
          disabled={isLoading || disabled}
        >
          {isLoading ? 'Saving...' : disabled ? 'Read Only' : 'Save Profile'}
        </button>
      </div>
    </form>
  );
};

export default CarrierProfileForm; 