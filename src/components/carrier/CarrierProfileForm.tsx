import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { CarrierProfile } from '../../types/carrier';
import { BasicInfoSection } from './sections/BasicInfoSection';
import { EquipmentSection } from './sections/EquipmentSection';
import { ServiceAreasSection } from './sections/ServiceAreasSection';
import { InsuranceSection } from './sections/InsuranceSection';
import styles from './CarrierProfileForm.module.css';

interface CarrierProfileFormProps {
  initialData?: Partial<CarrierProfile>;
  onSubmit: (data: CarrierProfile) => Promise<void>;
  isLoading?: boolean;
}

export const CarrierProfileForm: React.FC<CarrierProfileFormProps> = ({
  initialData,
  onSubmit,
  isLoading = false
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
        >
          Basic Information
        </button>
        <button
          type="button"
          className={`${styles.navButton} ${activeSection === 'equipment' ? styles.active : ''}`}
          onClick={() => setActiveSection('equipment')}
        >
          Equipment
        </button>
        <button
          type="button"
          className={`${styles.navButton} ${activeSection === 'areas' ? styles.active : ''}`}
          onClick={() => setActiveSection('areas')}
        >
          Service Areas
        </button>
        <button
          type="button"
          className={`${styles.navButton} ${activeSection === 'insurance' ? styles.active : ''}`}
          onClick={() => setActiveSection('insurance')}
        >
          Insurance
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
      </div>

      <div className={styles.actions}>
        <button
          type="submit"
          className={styles.submitButton}
          disabled={isLoading}
        >
          {isLoading ? 'Saving...' : 'Save Profile'}
        </button>
      </div>
    </form>
  );
};

export default CarrierProfileForm; 