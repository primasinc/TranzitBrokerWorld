import React from 'react';
import { Control, Controller, FieldErrors, useFieldArray } from 'react-hook-form';
import { CarrierProfile } from '../../../types/carrier';
import styles from '../CarrierProfileForm.module.css';

interface ServiceAreasSectionProps {
  control: Control<CarrierProfile>;
  errors: FieldErrors<CarrierProfile>;
}

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

export const ServiceAreasSection: React.FC<ServiceAreasSectionProps> = ({ control, errors }) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'serviceAreas'
  });

  return (
    <div className={styles.section}>
      <h2>Service Areas</h2>
      <div className={styles.serviceAreasList}>
        {fields.map((field, index) => (
          <div key={field.id} className={styles.serviceAreaItem}>
            <Controller
              name={`serviceAreas.${index}.state`}
              control={control}
              rules={{ required: 'State is required' }}
              render={({ field: { value, onChange, ...fieldProps } }) => (
                <div className={styles.formField}>
                  <label>State</label>
                  <select 
                    value={value || ''}
                    onChange={onChange}
                    {...fieldProps}
                    className={styles.select}
                  >
                    <option value="">Select State</option>
                    {US_STATES.map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                  {errors.serviceAreas?.[index]?.state && (
                    <span className={styles.error}>
                      State is required
                    </span>
                  )}
                </div>
              )}
            />

            <Controller
              name={`serviceAreas.${index}.preferred`}
              control={control}
              defaultValue={false}
              render={({ field: { value, onChange, ...fieldProps } }) => (
                <div className={styles.formField}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={value || false}
                      onChange={(e) => onChange(e.target.checked)}
                      {...fieldProps}
                      className={styles.checkbox}
                    />
                    Preferred Area
                  </label>
                </div>
              )}
            />

            <Controller
              name={`serviceAreas.${index}.restrictions`}
              control={control}
              defaultValue={[]}
              render={({ field: { value = [], onChange, ...fieldProps } }) => (
                <div className={styles.formField}>
                  <label>Restrictions (comma-separated)</label>
                  <input
                    type="text"
                    value={value.join(', ')}
                    onChange={(e) => onChange(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                    {...fieldProps}
                    className={styles.input}
                    placeholder="e.g., no hazmat, weight limit, etc."
                  />
                </div>
              )}
            />

            <button
              type="button"
              onClick={() => remove(index)}
              className={styles.removeButton}
            >
              Remove Service Area
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => append({
          state: '',
          preferred: false,
          restrictions: []
        })}
        className={styles.addButton}
      >
        Add Service Area
      </button>
    </div>
  );
}; 