import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { collection, addDoc, doc, updateDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import styles from './BrokerShippingSchedule.module.css';

interface LocationState {
  poData?: any;
  selectedCarrier?: any;
  rate?: number;
}

interface ShippingScheduleData {
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
  status: 'Carrier Pending' | 'Active' | 'Completed';
  carrier?: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
}

interface FormErrors {
  pickupLocation?: {
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    date?: string;
    time?: string;
  };
  deliveryLocation?: {
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    date?: string;
    time?: string;
  };
  cargoDetails?: {
    weight?: string;
    dimensions?: {
      length?: string;
      width?: string;
      height?: string;
    };
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

const BrokerShippingSchedule: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const locationState = location.state as LocationState;

  const [formData, setFormData] = useState<ShippingScheduleData>({
    pickupLocation: { address: '', city: '', state: '', zipCode: '', date: '', time: '' },
    deliveryLocation: { address: '', city: '', state: '', zipCode: '', date: '', time: '' },
    cargoDetails: { type: 'General Freight', weight: 0, dimensions: { length: 0, width: 0, height: 0 }, specialRequirements: '' },
    equipmentRequirements: [{ type: 'Dry Van', quantity: 1, specialRequirements: '' }],
    additionalRequirements: '',
    status: 'Carrier Pending',
    carrier: undefined
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [success, setSuccess] = useState<string | null>(null);

  // Prefill form with PO and carrier data
  useEffect(() => {
    if (locationState?.poData) {
      const po = locationState.poData;
      const defaultValues: ShippingScheduleData = {
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
          type: 'General Freight',
          weight: po.cargoDetails?.weight || 0,
          dimensions: {
            length: po.cargoDetails?.dimensions?.length || 0,
            width: po.cargoDetails?.dimensions?.width || 0,
            height: po.cargoDetails?.dimensions?.height || 0
          },
          specialRequirements: po.cargoDetails?.specialRequirements || ''
        },
        equipmentRequirements: [{
          type: 'Dry Van',
          quantity: 1,
          specialRequirements: ''
        }],
        additionalRequirements: po.additionalRequirements || '',
        status: 'Carrier Pending',
        carrier: locationState.selectedCarrier ? {
          id: locationState.selectedCarrier.carrierId,
          name: locationState.selectedCarrier.companyName,
          email: locationState.selectedCarrier.email || '',
          phone: locationState.selectedCarrier.phoneNumber || ''
        } : undefined
      };
      setFormData(defaultValues);
    }
  }, [locationState]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Validate pickup location
    if (!formData.pickupLocation.address.trim()) {
      newErrors.pickupLocation = { ...newErrors.pickupLocation, address: 'Pickup address is required' };
    }
    if (!formData.pickupLocation.city.trim()) {
      newErrors.pickupLocation = { ...newErrors.pickupLocation, city: 'Pickup city is required' };
    }
    if (!formData.pickupLocation.state.trim()) {
      newErrors.pickupLocation = { ...newErrors.pickupLocation, state: 'Pickup state is required' };
    }
    if (!formData.pickupLocation.zipCode.trim()) {
      newErrors.pickupLocation = { ...newErrors.pickupLocation, zipCode: 'Pickup ZIP code is required' };
    }
    if (!formData.pickupLocation.date) {
      newErrors.pickupLocation = { ...newErrors.pickupLocation, date: 'Pickup date is required' };
    }
    if (!formData.pickupLocation.time) {
      newErrors.pickupLocation = { ...newErrors.pickupLocation, time: 'Pickup time is required' };
    }

    // Validate delivery location
    if (!formData.deliveryLocation.address.trim()) {
      newErrors.deliveryLocation = { ...newErrors.deliveryLocation, address: 'Delivery address is required' };
    }
    if (!formData.deliveryLocation.city.trim()) {
      newErrors.deliveryLocation = { ...newErrors.deliveryLocation, city: 'Delivery city is required' };
    }
    if (!formData.deliveryLocation.state.trim()) {
      newErrors.deliveryLocation = { ...newErrors.deliveryLocation, state: 'Delivery state is required' };
    }
    if (!formData.deliveryLocation.zipCode.trim()) {
      newErrors.deliveryLocation = { ...newErrors.deliveryLocation, zipCode: 'Delivery ZIP code is required' };
    }
    if (!formData.deliveryLocation.date) {
      newErrors.deliveryLocation = { ...newErrors.deliveryLocation, date: 'Delivery date is required' };
    }
    if (!formData.deliveryLocation.time) {
      newErrors.deliveryLocation = { ...newErrors.deliveryLocation, time: 'Delivery time is required' };
    }

    // Validate cargo details
    if (formData.cargoDetails.weight <= 0) {
      newErrors.cargoDetails = { ...newErrors.cargoDetails, weight: 'Weight must be greater than 0' };
    }
    if (formData.cargoDetails.dimensions.length <= 0) {
      newErrors.cargoDetails = { ...newErrors.cargoDetails, dimensions: { ...newErrors.cargoDetails?.dimensions, length: 'Length must be greater than 0' } };
    }
    if (formData.cargoDetails.dimensions.width <= 0) {
      newErrors.cargoDetails = { ...newErrors.cargoDetails, dimensions: { ...newErrors.cargoDetails?.dimensions, width: 'Width must be greater than 0' } };
    }
    if (formData.cargoDetails.dimensions.height <= 0) {
      newErrors.cargoDetails = { ...newErrors.cargoDetails, dimensions: { ...newErrors.cargoDetails?.dimensions, height: 'Height must be greater than 0' } };
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleNestedInputChange = (parentField: string, childField: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [parentField]: {
        ...(prev[parentField as keyof ShippingScheduleData] as any),
        [childField]: value
      }
    }));
    // Clear nested error when user starts typing
    if (errors[parentField as keyof FormErrors] && typeof errors[parentField as keyof FormErrors] === 'object') {
      const parentErrors = errors[parentField as keyof FormErrors] as any;
      if (parentErrors && parentErrors[childField]) {
        setErrors(prev => ({
          ...prev,
          [parentField]: {
            ...parentErrors,
            [childField]: undefined
          }
        }));
      }
    }
  };

  const handleEquipmentChange = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      equipmentRequirements: prev.equipmentRequirements.map((eq, i) =>
        i === index ? { ...eq, [field]: value } : eq
      )
    }));
  };

  const addEquipment = () => {
    setFormData(prev => ({
      ...prev,
      equipmentRequirements: [...prev.equipmentRequirements, {
        type: 'Dry Van',
        quantity: 1,
        specialRequirements: ''
      }]
    }));
  };

  const removeEquipment = (index: number) => {
    setFormData(prev => ({
      ...prev,
      equipmentRequirements: prev.equipmentRequirements.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    if (!user?.uid || !locationState?.poData) {
      setErrors({ pickupLocation: { address: 'Missing user or PO data. Please go back and try again.' } });
      return;
    }

    setLoading(true);
    setErrors({});
    setSuccess(null);

    try {
      // Geocode pickup address
      const pickupAddress = `${formData.pickupLocation.address}, ${formData.pickupLocation.city}, ${formData.pickupLocation.state} ${formData.pickupLocation.zipCode}`;
      let pickupPosition: [number, number] = [0, 0];
      try {
        const accessToken = process.env.REACT_APP_MAPBOX_TOKEN;
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(pickupAddress)}.json?access_token=${accessToken}`
        );
        const geoData = await response.json();
        if (geoData.features && geoData.features.length > 0) {
          pickupPosition = geoData.features[0].center;
        }
      } catch (err) {
        console.warn('Geocoding failed for pickup address:', pickupAddress, err);
      }

      // Geocode delivery address
      const deliveryAddress = `${formData.deliveryLocation.address}, ${formData.deliveryLocation.city}, ${formData.deliveryLocation.state} ${formData.deliveryLocation.zipCode}`;
      let deliveryPosition: [number, number] = [0, 0];
      try {
        const accessToken = process.env.REACT_APP_MAPBOX_TOKEN;
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(deliveryAddress)}.json?access_token=${accessToken}`
        );
        const geoData = await response.json();
        if (geoData.features && geoData.features.length > 0) {
          deliveryPosition = geoData.features[0].center;
        }
      } catch (err) {
        console.warn('Geocoding failed for delivery address:', deliveryAddress, err);
      }

      // Create shipping schedule
      const shippingScheduleData = {
        ...formData,
        brokerId: user.uid,
        poNumber: locationState.poData.poNumber,
        poData: locationState.poData,
        pickupLocation: {
          ...formData.pickupLocation,
          position: pickupPosition
        },
        deliveryLocation: {
          ...formData.deliveryLocation,
          position: deliveryPosition
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Save shipping schedule
      const scheduleRef = await addDoc(collection(db, 'brokerShippingSchedules'), shippingScheduleData);

      // Create load in brokerLoads collection
      const loadData = {
        title: `${locationState.poData.vendorInfo?.name || 'Pickup'} to ${locationState.poData.shipTo?.name || 'Delivery'}`,
        pickupLocation: {
          ...formData.pickupLocation,
          position: pickupPosition
        },
        deliveryLocation: {
          ...formData.deliveryLocation,
          position: deliveryPosition
        },
        rate: locationState.rate || 0,
        poNumber: locationState.poData.poNumber,
        weight: formData.cargoDetails.weight,
        dimensions: `${formData.cargoDetails.dimensions.length}x${formData.cargoDetails.dimensions.width}x${formData.cargoDetails.dimensions.height}`,
        status: 'pending',
        brokerId: user.uid,
        carrierId: locationState.selectedCarrier.carrierId,
        isMarketplace: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'brokerLoads'), loadData);

      // Update PO status
      const poQuery = query(
        collection(db, 'brokerPurchaseOrders'),
        where('poNumber', '==', locationState.poData.poNumber)
      );
      const poSnapshot = await getDocs(poQuery);
      if (!poSnapshot.empty) {
        const poDoc = poSnapshot.docs[0];
        await updateDoc(doc(db, 'brokerPurchaseOrders', poDoc.id), {
          status: 'Active',
          shippingScheduleStatus: 'Carrier Pending',
          updatedAt: serverTimestamp()
        });
      }

      setSuccess('Shipping schedule created successfully! Redirecting to orders...');
      
      // Navigate after a brief delay to show success message
      setTimeout(() => {
        navigate('/broker/orders');
      }, 2000);
    } catch (error) {
      console.error('Error creating shipping schedule:', error);
      setErrors({ pickupLocation: { address: 'Failed to create shipping schedule. Please try again.' } });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/broker/carrier-partners', { state: locationState });
  };

  if (!locationState?.poData || !locationState?.selectedCarrier) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h2>Missing Required Data</h2>
          <p>Please go back and select a carrier partner first.</p>
          <button onClick={() => navigate('/broker/carrier-partners')} className={styles.backButton}>
            Back to Carrier Selection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Create Shipping Schedule</h1>
        <div className={styles.poInfo}>
          <p><strong>PO:</strong> {locationState.poData.poNumber}</p>
          <p><strong>Carrier:</strong> {locationState.selectedCarrier.companyName}</p>
          <p><strong>Rate:</strong> ${locationState.rate || 0}</p>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className={styles.successMessage}>
          <span>✅ {success}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.section}>
          <h2>Pickup Information</h2>
          <div className={styles.formGrid}>
            <div className={styles.formField}>
              <label>Address *</label>
              <input
                type="text"
                value={formData.pickupLocation.address}
                onChange={(e) => handleNestedInputChange('pickupLocation', 'address', e.target.value)}
                className={`${styles.input} ${errors.pickupLocation?.address ? styles.inputError : ''}`}
                placeholder="Pickup Address"
                required
              />
              {errors.pickupLocation?.address && (
                <span className={styles.errorText}>{errors.pickupLocation.address}</span>
              )}
            </div>
            <div className={styles.formField}>
              <label>City *</label>
              <input
                type="text"
                value={formData.pickupLocation.city}
                onChange={(e) => handleNestedInputChange('pickupLocation', 'city', e.target.value)}
                className={`${styles.input} ${errors.pickupLocation?.city ? styles.inputError : ''}`}
                placeholder="City"
                required
              />
              {errors.pickupLocation?.city && (
                <span className={styles.errorText}>{errors.pickupLocation.city}</span>
              )}
            </div>
            <div className={styles.formField}>
              <label>State *</label>
              <input
                type="text"
                value={formData.pickupLocation.state}
                onChange={(e) => handleNestedInputChange('pickupLocation', 'state', e.target.value)}
                className={`${styles.input} ${errors.pickupLocation?.state ? styles.inputError : ''}`}
                placeholder="State"
                required
              />
              {errors.pickupLocation?.state && (
                <span className={styles.errorText}>{errors.pickupLocation.state}</span>
              )}
            </div>
            <div className={styles.formField}>
              <label>ZIP Code *</label>
              <input
                type="text"
                value={formData.pickupLocation.zipCode}
                onChange={(e) => handleNestedInputChange('pickupLocation', 'zipCode', e.target.value)}
                className={`${styles.input} ${errors.pickupLocation?.zipCode ? styles.inputError : ''}`}
                placeholder="ZIP Code"
                required
              />
              {errors.pickupLocation?.zipCode && (
                <span className={styles.errorText}>{errors.pickupLocation.zipCode}</span>
              )}
            </div>
            <div className={styles.formField}>
              <label>Pickup Date *</label>
              <input
                type="date"
                value={formData.pickupLocation.date}
                onChange={(e) => handleNestedInputChange('pickupLocation', 'date', e.target.value)}
                className={`${styles.input} ${errors.pickupLocation?.date ? styles.inputError : ''}`}
                required
              />
              {errors.pickupLocation?.date && (
                <span className={styles.errorText}>{errors.pickupLocation.date}</span>
              )}
            </div>
            <div className={styles.formField}>
              <label>Pickup Time *</label>
              <input
                type="time"
                value={formData.pickupLocation.time}
                onChange={(e) => handleNestedInputChange('pickupLocation', 'time', e.target.value)}
                className={`${styles.input} ${errors.pickupLocation?.time ? styles.inputError : ''}`}
                required
              />
              {errors.pickupLocation?.time && (
                <span className={styles.errorText}>{errors.pickupLocation.time}</span>
              )}
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h2>Delivery Information</h2>
          <div className={styles.formGrid}>
            <div className={styles.formField}>
              <label>Address *</label>
              <input
                type="text"
                value={formData.deliveryLocation.address}
                onChange={(e) => handleNestedInputChange('deliveryLocation', 'address', e.target.value)}
                className={`${styles.input} ${errors.deliveryLocation?.address ? styles.inputError : ''}`}
                placeholder="Delivery Address"
                required
              />
              {errors.deliveryLocation?.address && (
                <span className={styles.errorText}>{errors.deliveryLocation.address}</span>
              )}
            </div>
            <div className={styles.formField}>
              <label>City *</label>
              <input
                type="text"
                value={formData.deliveryLocation.city}
                onChange={(e) => handleNestedInputChange('deliveryLocation', 'city', e.target.value)}
                className={`${styles.input} ${errors.deliveryLocation?.city ? styles.inputError : ''}`}
                placeholder="City"
                required
              />
              {errors.deliveryLocation?.city && (
                <span className={styles.errorText}>{errors.deliveryLocation.city}</span>
              )}
            </div>
            <div className={styles.formField}>
              <label>State *</label>
              <input
                type="text"
                value={formData.deliveryLocation.state}
                onChange={(e) => handleNestedInputChange('deliveryLocation', 'state', e.target.value)}
                className={`${styles.input} ${errors.deliveryLocation?.state ? styles.inputError : ''}`}
                placeholder="State"
                required
              />
              {errors.deliveryLocation?.state && (
                <span className={styles.errorText}>{errors.deliveryLocation.state}</span>
              )}
            </div>
            <div className={styles.formField}>
              <label>ZIP Code *</label>
              <input
                type="text"
                value={formData.deliveryLocation.zipCode}
                onChange={(e) => handleNestedInputChange('deliveryLocation', 'zipCode', e.target.value)}
                className={`${styles.input} ${errors.deliveryLocation?.zipCode ? styles.inputError : ''}`}
                placeholder="ZIP Code"
                required
              />
              {errors.deliveryLocation?.zipCode && (
                <span className={styles.errorText}>{errors.deliveryLocation.zipCode}</span>
              )}
            </div>
            <div className={styles.formField}>
              <label>Delivery Date *</label>
              <input
                type="date"
                value={formData.deliveryLocation.date}
                onChange={(e) => handleNestedInputChange('deliveryLocation', 'date', e.target.value)}
                className={`${styles.input} ${errors.deliveryLocation?.date ? styles.inputError : ''}`}
                required
              />
              {errors.deliveryLocation?.date && (
                <span className={styles.errorText}>{errors.deliveryLocation.date}</span>
              )}
            </div>
            <div className={styles.formField}>
              <label>Delivery Time *</label>
              <input
                type="time"
                value={formData.deliveryLocation.time}
                onChange={(e) => handleNestedInputChange('deliveryLocation', 'time', e.target.value)}
                className={`${styles.input} ${errors.deliveryLocation?.time ? styles.inputError : ''}`}
                placeholder="Time"
                required
              />
              {errors.deliveryLocation?.time && (
                <span className={styles.errorText}>{errors.deliveryLocation.time}</span>
              )}
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h2>Cargo Details</h2>
          <div className={styles.formGrid}>
            <div className={styles.formField}>
              <label>Cargo Type</label>
              <select
                value={formData.cargoDetails.type}
                onChange={(e) => handleNestedInputChange('cargoDetails', 'type', e.target.value)}
                className={styles.select}
                required
              >
                {CARGO_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div className={styles.formField}>
              <label>Weight (lbs) *</label>
              <input
                type="number"
                value={formData.cargoDetails.weight}
                onChange={(e) => handleNestedInputChange('cargoDetails', 'weight', parseFloat(e.target.value) || 0)}
                className={`${styles.input} ${errors.cargoDetails?.weight ? styles.inputError : ''}`}
                placeholder="Weight in pounds"
                min="0"
                step="0.1"
                required
              />
              {errors.cargoDetails?.weight && (
                <span className={styles.errorText}>{errors.cargoDetails.weight}</span>
              )}
            </div>
            <div className={styles.formField}>
              <label>Length (ft) *</label>
              <input
                type="number"
                value={formData.cargoDetails.dimensions.length}
                onChange={(e) => handleNestedInputChange('cargoDetails', 'dimensions', {
                  ...formData.cargoDetails.dimensions,
                  length: parseFloat(e.target.value) || 0
                })}
                className={`${styles.input} ${errors.cargoDetails?.dimensions?.length ? styles.inputError : ''}`}
                placeholder="Length in feet"
                min="0"
                step="0.1"
                required
              />
              {errors.cargoDetails?.dimensions?.length && (
                <span className={styles.errorText}>{errors.cargoDetails.dimensions.length}</span>
              )}
            </div>
            <div className={styles.formField}>
              <label>Width (ft) *</label>
              <input
                type="number"
                value={formData.cargoDetails.dimensions.width}
                onChange={(e) => handleNestedInputChange('cargoDetails', 'dimensions', {
                  ...formData.cargoDetails.dimensions,
                  width: parseFloat(e.target.value) || 0
                })}
                className={`${styles.input} ${errors.cargoDetails?.dimensions?.width ? styles.inputError : ''}`}
                placeholder="Width in feet"
                min="0"
                step="0.1"
                required
              />
              {errors.cargoDetails?.dimensions?.width && (
                <span className={styles.errorText}>{errors.cargoDetails.dimensions.width}</span>
              )}
            </div>
            <div className={styles.formField}>
              <label>Height (ft) *</label>
              <input
                type="number"
                value={formData.cargoDetails.dimensions.height}
                onChange={(e) => handleNestedInputChange('cargoDetails', 'dimensions', {
                  ...formData.cargoDetails.dimensions,
                  height: parseFloat(e.target.value) || 0
                })}
                className={`${styles.input} ${errors.cargoDetails?.dimensions?.height ? styles.inputError : ''}`}
                placeholder="Height in feet"
                min="0"
                step="0.1"
                required
              />
              {errors.cargoDetails?.dimensions?.height && (
                <span className={styles.errorText}>{errors.cargoDetails.dimensions.height}</span>
              )}
            </div>
            <div className={styles.formField}>
              <label>Special Requirements</label>
              <textarea
                value={formData.cargoDetails.specialRequirements}
                onChange={(e) => handleNestedInputChange('cargoDetails', 'specialRequirements', e.target.value)}
                className={styles.textarea}
                placeholder="Any special cargo requirements"
                rows={3}
              />
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h2>Equipment Requirements</h2>
          {formData.equipmentRequirements.map((equipment, index) => (
            <div key={index} className={styles.equipmentRow}>
              <div className={styles.formGrid}>
                <div className={styles.formField}>
                  <label>Equipment Type</label>
                  <select
                    value={equipment.type}
                    onChange={(e) => handleEquipmentChange(index, 'type', e.target.value)}
                    className={styles.select}
                    required
                  >
                    {EQUIPMENT_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.formField}>
                  <label>Quantity</label>
                  <input
                    type="number"
                    value={equipment.quantity}
                    onChange={(e) => handleEquipmentChange(index, 'quantity', parseInt(e.target.value) || 1)}
                    className={styles.input}
                    min="1"
                    required
                  />
                </div>
                <div className={styles.formField}>
                  <label>Special Requirements</label>
                  <input
                    type="text"
                    value={equipment.specialRequirements}
                    onChange={(e) => handleEquipmentChange(index, 'specialRequirements', e.target.value)}
                    className={styles.input}
                    placeholder="Special equipment requirements"
                  />
                </div>
                <div className={styles.formField}>
                  <button
                    type="button"
                    onClick={() => removeEquipment(index)}
                    className={styles.removeButton}
                    disabled={formData.equipmentRequirements.length === 1}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
          <button type="button" onClick={addEquipment} className={styles.addButton}>
            + Add Equipment
          </button>
        </div>

        <div className={styles.section}>
          <h2>Additional Requirements</h2>
          <div className={styles.formField}>
            <textarea
              value={formData.additionalRequirements}
              onChange={(e) => handleInputChange('additionalRequirements', e.target.value)}
              className={styles.textarea}
              placeholder="Any additional requirements or special instructions"
              rows={4}
            />
          </div>
        </div>

        <div className={styles.formActions}>
          <button type="button" onClick={handleCancel} className={styles.cancelButton} disabled={loading}>
            Cancel
          </button>
          <button type="submit" className={styles.submitButton} disabled={loading}>
            {loading ? (
              <>
                <span className={styles.spinner}></span>
                Creating...
              </>
            ) : (
              'Create Shipping Schedule'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BrokerShippingSchedule;
