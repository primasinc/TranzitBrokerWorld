import React from 'react';
import { Control, Controller, FieldErrors } from 'react-hook-form';
import { CarrierProfile } from '../../../types/carrier';
import styles from '../CarrierProfileForm.module.css';

interface BasicInfoSectionProps {
  control: Control<CarrierProfile>;
  errors: FieldErrors<CarrierProfile>;
}

export const BasicInfoSection: React.FC<BasicInfoSectionProps> = ({ control, errors }) => {
  return (
    <div className={styles.section}>
      <h2>Basic Information</h2>
      
      <div className={styles.fieldGroup}>
        <label className={styles.label}>Company Name</label>
        <Controller
          name="companyName"
          control={control}
          rules={{ required: 'Company name is required' }}
          render={({ field }) => (
            <input
              {...field}
              type="text"
              className={styles.input}
              placeholder="Enter company name"
            />
          )}
        />
        {errors.companyName && (
          <span className={styles.error}>{errors.companyName.message}</span>
        )}
      </div>

      <div className={styles.fieldGroup}>
        <label className={styles.label}>MC Number</label>
        <Controller
          name="mcNumber"
          control={control}
          rules={{ required: 'MC number is required' }}
          render={({ field }) => (
            <input
              {...field}
              type="text"
              className={styles.input}
              placeholder="Enter MC number"
            />
          )}
        />
        {errors.mcNumber && (
          <span className={styles.error}>{errors.mcNumber.message}</span>
        )}
      </div>

      <div className={styles.fieldGroup}>
        <label className={styles.label}>DOT Number</label>
        <Controller
          name="dotNumber"
          control={control}
          rules={{ required: 'DOT number is required' }}
          render={({ field }) => (
            <input
              {...field}
              type="text"
              className={styles.input}
              placeholder="Enter DOT number"
            />
          )}
        />
        {errors.dotNumber && (
          <span className={styles.error}>{errors.dotNumber.message}</span>
        )}
      </div>

      <div className={styles.fieldGroup}>
        <label className={styles.label}>Email</label>
        <Controller
          name="email"
          control={control}
          rules={{
            required: 'Email is required',
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: 'Invalid email address'
            }
          }}
          render={({ field }) => (
            <input
              {...field}
              type="email"
              className={styles.input}
              placeholder="Enter email address"
            />
          )}
        />
        {errors.email && (
          <span className={styles.error}>{errors.email.message}</span>
        )}
      </div>

      <div className={styles.fieldGroup}>
        <label className={styles.label}>Phone</label>
        <Controller
          name="phone"
          control={control}
          rules={{
            required: 'Phone number is required',
            pattern: {
              value: /^\(\d{3}\) \d{3}-\d{4}$/,
              message: 'Phone number must be in format (XXX) XXX-XXXX'
            }
          }}
          render={({ field }) => (
            <input
              {...field}
              type="tel"
              className={styles.input}
              placeholder="(XXX) XXX-XXXX"
            />
          )}
        />
        {errors.phone && (
          <span className={styles.error}>{errors.phone.message}</span>
        )}
      </div>

      <div className={styles.fieldGroup}>
        <label className={styles.label}>Address</label>
        <Controller
          name="address.street"
          control={control}
          rules={{ required: 'Street address is required' }}
          render={({ field }) => (
            <input
              {...field}
              type="text"
              className={styles.input}
              placeholder="Street address"
            />
          )}
        />
        {errors.address?.street && (
          <span className={styles.error}>{errors.address.street.message}</span>
        )}
      </div>

      <div className={styles.row}>
        <div className={styles.fieldGroup}>
          <Controller
            name="address.city"
            control={control}
            rules={{ required: 'City is required' }}
            render={({ field }) => (
              <input
                {...field}
                type="text"
                className={styles.input}
                placeholder="City"
              />
            )}
          />
          {errors.address?.city && (
            <span className={styles.error}>{errors.address.city.message}</span>
          )}
        </div>

        <div className={styles.fieldGroup}>
          <Controller
            name="address.state"
            control={control}
            rules={{ required: 'State is required' }}
            render={({ field }) => (
              <input
                {...field}
                type="text"
                className={styles.input}
                placeholder="State"
              />
            )}
          />
          {errors.address?.state && (
            <span className={styles.error}>{errors.address.state.message}</span>
          )}
        </div>

        <div className={styles.fieldGroup}>
          <Controller
            name="address.zip"
            control={control}
            rules={{
              required: 'ZIP code is required',
              pattern: {
                value: /^\d{5}(-\d{4})?$/,
                message: 'Invalid ZIP code'
              }
            }}
            render={({ field }) => (
              <input
                {...field}
                type="text"
                className={styles.input}
                placeholder="ZIP code"
              />
            )}
          />
          {errors.address?.zip && (
            <span className={styles.error}>{errors.address.zip.message}</span>
          )}
        </div>
      </div>
    </div>
  );
}; 