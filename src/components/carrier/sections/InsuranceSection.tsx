import React from 'react';
import { Control, Controller, FieldErrors, useFieldArray } from 'react-hook-form';
import { CarrierProfile, InsuranceType } from '../../../types/carrier';
import { Timestamp } from 'firebase/firestore';
import styles from '../CarrierProfileForm.module.css';

interface InsuranceSectionProps {
  control: Control<CarrierProfile>;
  errors: FieldErrors<CarrierProfile>;
}

const INSURANCE_TYPES: InsuranceType[] = ['liability', 'cargo', 'physical_damage', 'workers_comp'];

export const InsuranceSection: React.FC<InsuranceSectionProps> = ({ control, errors }) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'insurance'
  });

  const formatDateForInput = (timestamp: Timestamp | Date | undefined) => {
    if (!timestamp) return '';
    // If it's a Firestore Timestamp, convert to Date
    const date = 'toDate' in timestamp ? timestamp.toDate() : timestamp;
    return date.toISOString().split('T')[0];
  };

  return (
    <div className={styles.section}>
      <h2>Insurance Information</h2>
      <div className={styles.insuranceList}>
        {fields.map((field, index) => (
          <div key={field.id} className={styles.insuranceItem}>
            <Controller
              name={`insurance.${index}.type`}
              control={control}
              rules={{ required: 'Insurance type is required' }}
              render={({ field: { value, onChange, ...fieldProps } }) => (
                <div className={styles.formField}>
                  <label>Insurance Type</label>
                  <select 
                    value={value || ''}
                    onChange={onChange}
                    {...fieldProps}
                    className={styles.select}
                  >
                    <option value="">Select Type</option>
                    {INSURANCE_TYPES.map(type => (
                      <option key={type} value={type}>
                        {type.replace('_', ' ').toUpperCase()}
                      </option>
                    ))}
                  </select>
                  {errors.insurance?.[index]?.type && (
                    <span className={styles.error}>
                      Insurance type is required
                    </span>
                  )}
                </div>
              )}
            />

            <Controller
              name={`insurance.${index}.provider`}
              control={control}
              rules={{ required: 'Provider is required' }}
              render={({ field: { value, onChange, ...fieldProps } }) => (
                <div className={styles.formField}>
                  <label>Provider</label>
                  <input
                    type="text"
                    value={value || ''}
                    onChange={onChange}
                    {...fieldProps}
                    className={styles.input}
                    placeholder="Insurance Provider"
                  />
                  {errors.insurance?.[index]?.provider && (
                    <span className={styles.error}>
                      Provider is required
                    </span>
                  )}
                </div>
              )}
            />

            <Controller
              name={`insurance.${index}.policyNumber`}
              control={control}
              rules={{ required: 'Policy number is required' }}
              render={({ field: { value, onChange, ...fieldProps } }) => (
                <div className={styles.formField}>
                  <label>Policy Number</label>
                  <input
                    type="text"
                    value={value || ''}
                    onChange={onChange}
                    {...fieldProps}
                    className={styles.input}
                    placeholder="Policy Number"
                  />
                  {errors.insurance?.[index]?.policyNumber && (
                    <span className={styles.error}>
                      Policy number is required
                    </span>
                  )}
                </div>
              )}
            />

            <Controller
              name={`insurance.${index}.coverage`}
              control={control}
              rules={{ 
                required: 'Coverage amount is required',
                min: { value: 0, message: 'Coverage must be positive' }
              }}
              render={({ field: { value, onChange, ...fieldProps } }) => (
                <div className={styles.formField}>
                  <label>Coverage Amount ($)</label>
                  <input
                    type="number"
                    step="1000"
                    value={value || ''}
                    onChange={onChange}
                    {...fieldProps}
                    className={styles.input}
                    placeholder="Coverage Amount"
                  />
                  {errors.insurance?.[index]?.coverage && (
                    <span className={styles.error}>
                      {errors.insurance[index]?.coverage?.type === 'min' 
                        ? 'Coverage must be positive'
                        : 'Coverage amount is required'
                      }
                    </span>
                  )}
                </div>
              )}
            />

            <Controller
              name={`insurance.${index}.expiresAt`}
              control={control}
              rules={{ required: 'Expiration date is required' }}
              render={({ field: { value, onChange, ...fieldProps } }) => (
                <div className={styles.formField}>
                  <label>Expiration Date</label>
                  <input
                    type="date"
                    value={formatDateForInput(value)}
                    onChange={(e) => {
                      // Convert the date string to a Firestore Timestamp
                      const date = new Date(e.target.value);
                      onChange(Timestamp.fromDate(date));
                    }}
                    {...fieldProps}
                    className={styles.input}
                  />
                  {errors.insurance?.[index]?.expiresAt && (
                    <span className={styles.error}>
                      Expiration date is required
                    </span>
                  )}
                </div>
              )}
            />

            <button
              type="button"
              onClick={() => remove(index)}
              className={styles.removeButton}
            >
              Remove Insurance
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => append({
          type: '' as InsuranceType,
          provider: '',
          policyNumber: '',
          coverage: 0,
          expiresAt: Timestamp.fromDate(new Date())
        })}
        className={styles.addButton}
      >
        Add Insurance Policy
      </button>
    </div>
  );
}; 