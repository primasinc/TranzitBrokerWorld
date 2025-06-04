import React from 'react';
import { useForm, Controller, useFieldArray, FieldError } from 'react-hook-form';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './ShippingScheduleForm.module.css';
import { sendLoadRequestToCarrier } from '../../services/notificationService';
import { useAuth } from '../../context/AuthContext';

interface ShippingScheduleFormData {
  pickupLocation: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    date: string;
    time: string;
  };
  deliveryLocation: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    date: string;
    time: string;
  };
  cargoDetails: {
    type: string;
    weight: number;
    dimensions: {
      length: number;
      width: number;
      height: number;
    };
    specialRequirements: string;
  };
  equipmentRequirements: {
    type: string;
    quantity: number;
    specialRequirements: string;
  }[];
  additionalRequirements: string;
  status: 'open' | 'pending' | 'Carrier Pending' | 'assigned' | 'active' | 'delayed' | 'completed';
  carrier?: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
}

const EQUIPMENT_TYPES = [
  'Dry Van',
  'Reefer',
  'Flatbed',
  'Step Deck',
  'Double Drop',
  'Lowboy',
  'Power Only',
  'Other'
];

const CARGO_TYPES = [
  'General Freight',
  'Hazardous Materials',
  'Refrigerated Goods',
  'Oversized Load',
  'Heavy Haul',
  'Other'
];

const ShippingScheduleForm: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const locationState = location.state as { poData?: any; selectedCarrier?: any };

  // Prefill form with PO and carrier data if present
  const defaultValues = React.useMemo(() => {
    if (!locationState?.poData) return undefined;
    const po = locationState.poData;
    return {
      pickupLocation: {
        address: po.vendorInfo?.streetAddress || '',
        city: po.vendorInfo?.cityStateZip?.split(',')[0]?.trim() || '',
        state: po.vendorInfo?.cityStateZip?.split(',')[1]?.trim().split(' ')[0] || '',
        zipCode: po.vendorInfo?.cityStateZip?.split(' ').slice(-1)[0] || '',
        date: po.date || '',
        time: ''
      },
      deliveryLocation: {
        address: po.shipTo?.streetAddress || '',
        city: po.shipTo?.cityStateZip?.split(',')[0]?.trim() || '',
        state: po.shipTo?.cityStateZip?.split(',')[1]?.trim().split(' ')[0] || '',
        zipCode: po.shipTo?.cityStateZip?.split(' ').slice(-1)[0] || '',
        date: po.date || '',
        time: ''
      },
      cargoDetails: {
        type: '',
        weight: po.items?.reduce((sum: number, item: any) => sum + (item.weight || 0), 0) || 0,
        dimensions: {
          length: 0,
          width: 0,
          height: 0
        },
        specialRequirements: po.comments || ''
      },
      equipmentRequirements: [],
      additionalRequirements: '',
      status: 'pending' as 'pending'
    };
  }, [locationState]);

  const [selectedOption, setSelectedOption] = React.useState<'carrier' | 'marketplace' | null>(null);
  const { control, handleSubmit, formState: { errors } } = useForm<ShippingScheduleFormData>({
    defaultValues: defaultValues || {
      pickupLocation: {
        address: '',
        city: '',
        state: '',
        zipCode: '',
        date: '',
        time: ''
      },
      deliveryLocation: {
        address: '',
        city: '',
        state: '',
        zipCode: '',
        date: '',
        time: ''
      },
      cargoDetails: {
        type: '',
        weight: 0,
        dimensions: {
          length: 0,
          width: 0,
          height: 0
        },
        specialRequirements: ''
      },
      equipmentRequirements: [],
      additionalRequirements: '',
      status: 'pending'
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'equipmentRequirements'
  });

    const onSubmit = async (data: ShippingScheduleFormData) => {
    try {
      // Set initial status based on the selected option
      if (selectedOption === 'marketplace') {
        data.status = 'open';
      } else if (selectedOption === 'carrier' && locationState?.selectedCarrier) {
        data.status = 'Carrier Pending';
        // Add carrier information to the shipping schedule
        data.carrier = {
          id: locationState.selectedCarrier.id,
          name: locationState.selectedCarrier.companyName,
          email: locationState.selectedCarrier.email,
          phone: locationState.selectedCarrier.phoneNumber
        };
      }
      
      // Save the shipping schedule data
      const response = await fetch('/api/shipping-schedules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          poData: locationState?.poData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create shipping schedule');
      }

      // Get the created shipping schedule ID from the response
      const { id } = await response.json();

      // If a carrier was selected, send them a notification
      if (selectedOption === 'carrier' && locationState?.selectedCarrier && user) {
        await sendLoadRequestToCarrier(
          locationState.selectedCarrier.id,
          user.uid,
          id,
          {
            pickupLocation: data.pickupLocation,
            deliveryLocation: data.deliveryLocation,
            dimensions: data.cargoDetails.dimensions,
            weight: data.cargoDetails.weight,
            rate: locationState.poData?.rate || 0
          }
        );
      }

      // Navigate based on the selected option
      if (selectedOption === 'marketplace') {
        navigate('/shipper/loads');
      } else {
        // After creating shipping schedule, navigate to the schedule view
        navigate('/shipper/schedule', { 
          state: { 
            message: 'Shipping schedule created and sent to carrier for approval'
          }
        });
      }
    } catch (error) {
      console.error('Error creating shipping schedule:', error);
      // TODO: Show error message to user
    }
  };

  const getErrorMessage = (error: any): string => {
    if (typeof error === 'string') return error;
    if (error?.message) return error.message;
    return 'This field is required';
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
      <div className={styles.section}>
        <h2>Pickup Information</h2>
        <div className={styles.formGrid}>
          <div className={styles.formField}>
            <label>Address</label>
            <Controller
              name="pickupLocation.address"
              control={control}
              rules={{ required: 'Address is required' }}
              render={({ field }) => (
                <input
                  type="text"
                  {...field}
                  className={styles.input}
                  placeholder="Street Address"
                />
              )}
            />
            {errors.pickupLocation?.address && (
              <span className={styles.error}>
                {(errors.pickupLocation.address as FieldError).message}
              </span>
            )}
          </div>

          <div className={styles.formField}>
            <label>City</label>
            <Controller
              name="pickupLocation.city"
              control={control}
              rules={{ required: 'City is required' }}
              render={({ field }) => (
                <input
                  type="text"
                  {...field}
                  className={styles.input}
                  placeholder="City"
                />
              )}
            />
            {errors.pickupLocation?.city && (
              <span className={styles.error}>{errors.pickupLocation.city.message}</span>
            )}
          </div>

          <div className={styles.formField}>
            <label>State</label>
            <Controller
              name="pickupLocation.state"
              control={control}
              rules={{ required: 'State is required' }}
              render={({ field }) => (
                <input
                  type="text"
                  {...field}
                  className={styles.input}
                  placeholder="State"
                />
              )}
            />
            {errors.pickupLocation?.state && (
              <span className={styles.error}>{errors.pickupLocation.state.message}</span>
            )}
          </div>

          <div className={styles.formField}>
            <label>ZIP Code</label>
            <Controller
              name="pickupLocation.zipCode"
              control={control}
              rules={{ required: 'ZIP Code is required' }}
              render={({ field }) => (
                <input
                  type="text"
                  {...field}
                  className={styles.input}
                  placeholder="ZIP Code"
                />
              )}
            />
            {errors.pickupLocation?.zipCode && (
              <span className={styles.error}>{errors.pickupLocation.zipCode.message}</span>
            )}
          </div>

          <div className={styles.formField}>
            <label>Pickup Date</label>
            <Controller
              name="pickupLocation.date"
              control={control}
              rules={{ required: 'Pickup date is required' }}
              render={({ field }) => (
                <input
                  type="date"
                  {...field}
                  className={styles.input}
                />
              )}
            />
            {errors.pickupLocation?.date && (
              <span className={styles.error}>{errors.pickupLocation.date.message}</span>
            )}
          </div>

          <div className={styles.formField}>
            <label>Pickup Time</label>
            <Controller
              name="pickupLocation.time"
              control={control}
              rules={{ required: 'Pickup time is required' }}
              render={({ field }) => (
                <input
                  type="time"
                  {...field}
                  className={styles.input}
                />
              )}
            />
            {errors.pickupLocation?.time && (
              <span className={styles.error}>{errors.pickupLocation.time.message}</span>
            )}
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h2>Delivery Information</h2>
        <div className={styles.formGrid}>
          <div className={styles.formField}>
            <label>Address</label>
            <Controller
              name="deliveryLocation.address"
              control={control}
              rules={{ required: 'Address is required' }}
              render={({ field }) => (
                <input
                  type="text"
                  {...field}
                  className={styles.input}
                  placeholder="Street Address"
                />
              )}
            />
            {errors.deliveryLocation?.address && (
              <span className={styles.error}>{errors.deliveryLocation.address.message}</span>
            )}
          </div>

          <div className={styles.formField}>
            <label>City</label>
            <Controller
              name="deliveryLocation.city"
              control={control}
              rules={{ required: 'City is required' }}
              render={({ field }) => (
                <input
                  type="text"
                  {...field}
                  className={styles.input}
                  placeholder="City"
                />
              )}
            />
            {errors.deliveryLocation?.city && (
              <span className={styles.error}>{errors.deliveryLocation.city.message}</span>
            )}
          </div>

          <div className={styles.formField}>
            <label>State</label>
            <Controller
              name="deliveryLocation.state"
              control={control}
              rules={{ required: 'State is required' }}
              render={({ field }) => (
                <input
                  type="text"
                  {...field}
                  className={styles.input}
                  placeholder="State"
                />
              )}
            />
            {errors.deliveryLocation?.state && (
              <span className={styles.error}>{errors.deliveryLocation.state.message}</span>
            )}
          </div>

          <div className={styles.formField}>
            <label>ZIP Code</label>
            <Controller
              name="deliveryLocation.zipCode"
              control={control}
              rules={{ required: 'ZIP Code is required' }}
              render={({ field }) => (
                <input
                  type="text"
                  {...field}
                  className={styles.input}
                  placeholder="ZIP Code"
                />
              )}
            />
            {errors.deliveryLocation?.zipCode && (
              <span className={styles.error}>{errors.deliveryLocation.zipCode.message}</span>
            )}
          </div>

          <div className={styles.formField}>
            <label>Delivery Date</label>
            <Controller
              name="deliveryLocation.date"
              control={control}
              rules={{ required: 'Delivery date is required' }}
              render={({ field }) => (
                <input
                  type="date"
                  {...field}
                  className={styles.input}
                />
              )}
            />
            {errors.deliveryLocation?.date && (
              <span className={styles.error}>{errors.deliveryLocation.date.message}</span>
            )}
          </div>

          <div className={styles.formField}>
            <label>Delivery Time</label>
            <Controller
              name="deliveryLocation.time"
              control={control}
              rules={{ required: 'Delivery time is required' }}
              render={({ field }) => (
                <input
                  type="time"
                  {...field}
                  className={styles.input}
                />
              )}
            />
            {errors.deliveryLocation?.time && (
              <span className={styles.error}>{errors.deliveryLocation.time.message}</span>
            )}
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h2>Cargo Details</h2>
        <div className={styles.formGrid}>
          <div className={styles.formField}>
            <label>Cargo Type</label>
            <Controller
              name="cargoDetails.type"
              control={control}
              rules={{ required: 'Cargo type is required' }}
              render={({ field }) => (
                <select {...field} className={styles.select}>
                  <option value="">Select Cargo Type</option>
                  {CARGO_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              )}
            />
            {errors.cargoDetails?.type && (
              <span className={styles.error}>
                {getErrorMessage(errors.cargoDetails.type)}
              </span>
            )}
          </div>

          <div className={styles.formField}>
            <label>Weight (lbs)</label>
            <Controller
              name="cargoDetails.weight"
              control={control}
              rules={{ 
                required: 'Weight is required',
                min: { value: 0, message: 'Weight must be positive' }
              }}
              render={({ field }) => (
                <input
                  type="number"
                  {...field}
                  className={styles.input}
                  placeholder="Weight in pounds"
                />
              )}
            />
            {errors.cargoDetails?.weight && (
              <span className={styles.error}>{errors.cargoDetails.weight.message}</span>
            )}
          </div>

          <div className={styles.formField}>
            <label>Length (ft)</label>
            <Controller
              name="cargoDetails.dimensions.length"
              control={control}
              rules={{ 
                required: 'Length is required',
                min: { value: 0, message: 'Length must be positive' }
              }}
              render={({ field }) => (
                <input
                  type="number"
                  {...field}
                  className={styles.input}
                  placeholder="Length in feet"
                />
              )}
            />
            {errors.cargoDetails?.dimensions?.length && (
              <span className={styles.error}>{errors.cargoDetails.dimensions.length.message}</span>
            )}
          </div>

          <div className={styles.formField}>
            <label>Width (ft)</label>
            <Controller
              name="cargoDetails.dimensions.width"
              control={control}
              rules={{ 
                required: 'Width is required',
                min: { value: 0, message: 'Width must be positive' }
              }}
              render={({ field }) => (
                <input
                  type="number"
                  {...field}
                  className={styles.input}
                  placeholder="Width in feet"
                />
              )}
            />
            {errors.cargoDetails?.dimensions?.width && (
              <span className={styles.error}>{errors.cargoDetails.dimensions.width.message}</span>
            )}
          </div>

          <div className={styles.formField}>
            <label>Height (ft)</label>
            <Controller
              name="cargoDetails.dimensions.height"
              control={control}
              rules={{ 
                required: 'Height is required',
                min: { value: 0, message: 'Height must be positive' }
              }}
              render={({ field }) => (
                <input
                  type="number"
                  {...field}
                  className={styles.input}
                  placeholder="Height in feet"
                />
              )}
            />
            {errors.cargoDetails?.dimensions?.height && (
              <span className={styles.error}>{errors.cargoDetails.dimensions.height.message}</span>
            )}
          </div>

          <div className={styles.formField}>
            <label>Special Requirements</label>
            <Controller
              name="cargoDetails.specialRequirements"
              control={control}
              render={({ field }) => (
                <textarea
                  {...field}
                  className={styles.textarea}
                  placeholder="Any special requirements for the cargo"
                />
              )}
            />
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h2>Equipment Requirements</h2>
        {fields.map((field, index) => (
          <div key={field.id} className={styles.equipmentItem}>
            <div className={styles.formGrid}>
              <div className={styles.formField}>
                <label>Equipment Type</label>
                <Controller
                  name={`equipmentRequirements.${index}.type`}
                  control={control}
                  rules={{ required: 'Equipment type is required' }}
                  render={({ field }) => (
                    <select {...field} className={styles.select}>
                      <option value="">Select Equipment Type</option>
                      {EQUIPMENT_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  )}
                />
                {errors.equipmentRequirements?.[index]?.type && (
                  <span className={styles.error}>
                    {getErrorMessage(errors.equipmentRequirements[index]?.type)}
                  </span>
                )}
              </div>

              <div className={styles.formField}>
                <label>Quantity</label>
                <Controller
                  name={`equipmentRequirements.${index}.quantity`}
                  control={control}
                  rules={{ 
                    required: 'Quantity is required',
                    min: { value: 1, message: 'Quantity must be at least 1' }
                  }}
                  render={({ field }) => (
                    <input
                      type="number"
                      {...field}
                      className={styles.input}
                      placeholder="Number of units"
                    />
                  )}
                />
                {errors.equipmentRequirements?.[index]?.quantity && (
                  <span className={styles.error}>{errors.equipmentRequirements[index]?.quantity?.message}</span>
                )}
              </div>

              <div className={styles.formField}>
                <label>Special Requirements</label>
                <Controller
                  name={`equipmentRequirements.${index}.specialRequirements`}
                  control={control}
                  render={({ field }) => (
                    <textarea
                      {...field}
                      className={styles.textarea}
                      placeholder="Any special requirements for this equipment"
                    />
                  )}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => remove(index)}
              className={styles.removeButton}
            >
              Remove Equipment
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => append({
            type: '',
            quantity: 1,
            specialRequirements: ''
          })}
          className={styles.addButton}
        >
          Add Equipment Requirement
        </button>
      </div>

      <div className={styles.section}>
        <h2>Additional Requirements</h2>
        <div className={styles.formField}>
          <Controller
            name="additionalRequirements"
            control={control}
            render={({ field }) => (
              <textarea
                {...field}
                className={styles.textarea}
                placeholder="Any additional requirements or special instructions"
              />
            )}
          />
        </div>
      </div>

      <div className={styles.formActions}>
        <div className={styles.carrierSelection}>
          <h3>Select a carrier option:</h3>
          <div className={styles.buttons}>
            <button 
              type="button"
              className={`${styles.actionButton} ${styles.findCarrier} ${selectedOption === 'carrier' ? styles.selected : ''}`}
              onClick={() => setSelectedOption('carrier')}
            >
              <svg 
                className={styles.icon} 
                viewBox="0 0 24 24" 
                fill="currentColor"
              >
                <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
              </svg>
              <span>Find Carrier</span>
            </button>
            <button 
              type="button"
              className={`${styles.actionButton} ${styles.marketplace} ${selectedOption === 'marketplace' ? styles.selected : ''}`}
              onClick={() => setSelectedOption('marketplace')}
            >
              <svg 
                className={styles.icon} 
                viewBox="0 0 24 24" 
                fill="currentColor"
              >
                <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/>
              </svg>
              <span>Marketplace</span>
            </button>
          </div>
          {!selectedOption && <p className={styles.selectionHint}>Please select a carrier option to proceed</p>}
        </div>
        
        <button 
          type="submit"
          className={styles.submitButton}
          disabled={!selectedOption}
        >
          Create Shipping Schedule
        </button>
      </div>
    </form>
  );
};

export default ShippingScheduleForm; 