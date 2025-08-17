import React, { useState, useRef, ChangeEvent, useEffect } from 'react';
import styles from './RateConfirmationForm.module.css';

interface CompanyInfo {
  name: string;
  streetAddress: string;
  cityStateZip: string;
  contact: string;
}

interface CarrierInfo {
  companyName: string;
  driver: string;
  contactEmail: string;
  contactNumber: string;
  mcNumber: string;
  dotNumber: string;
}

interface VendorInfo {
  name: string;
  streetAddress: string;
  cityStateZip: string;
  contact: string;
}

interface ShipTo {
  name: string;
  streetAddress: string;
  cityStateZip: string;
  contact: string;
  instructions: string;
}

interface RateConfirmationItem {
  itemNumber: string;
  description: string;
  quantity: number;
  dimensions?: string;
  weight?: number;
}

interface RateConfirmationFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
  initialData?: any;
  readOnly?: boolean;
}

export const RateConfirmationForm: React.FC<RateConfirmationFormProps> = ({
  onSubmit,
  onCancel,
  initialData,
  readOnly = false
}) => {
  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      const isMobileScreen = window.innerWidth <= 768;
      setIsMobile(isMobileDevice || isMobileScreen);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const [carrierRate, setCarrierRate] = useState<string>(initialData?.rate ? String(initialData.rate) : '');
  const [date, setDate] = useState<string>(initialData?.date || new Date().toISOString().split('T')[0]);
  const [poNumber, setPoNumber] = useState<string>(initialData?.poNumber || '');
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(initialData?.companyInfo || {
    name: '',
    streetAddress: '',
    cityStateZip: '',
    contact: ''
  });
  const [carrierInfo, setCarrierInfo] = useState<CarrierInfo>(initialData?.carrierInfo || {
    companyName: '',
    driver: '',
    contactEmail: '',
    contactNumber: '',
    mcNumber: '',
    dotNumber: ''
  });
  const [vendorInfo, setVendorInfo] = useState<VendorInfo>(initialData?.vendorInfo || {
    name: '',
    streetAddress: '',
    cityStateZip: '',
    contact: ''
  });
  const [shipTo, setShipTo] = useState<ShipTo>(initialData?.shipTo || {
    name: '',
    streetAddress: '',
    cityStateZip: '',
    contact: '',
    instructions: ''
  });
  const [items, setItems] = useState<RateConfirmationItem[]>(
    Array.isArray(initialData?.items) ? initialData.items.map((item: any) => ({
      itemNumber: item.itemNumber || '',
      description: item.description || '',
      quantity: item.quantity || 0,
      dimensions: item.dimensions || '',
      weight: item.weight || 0
    })) : [{
      itemNumber: '',
      description: '',
      quantity: 0,
      dimensions: '',
      weight: 0
    }]
  );
  const [comments, setComments] = useState<string>(initialData?.comments || '');

  const addItem = () => {
    setItems([...items, {
      itemNumber: '',
      description: '',
      quantity: 0,
      dimensions: '',
      weight: 0
    }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof RateConfirmationItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const formData = {
      poNumber,
      date,
      companyInfo,
      carrierInfo,
      vendorInfo,
      shipTo,
      items: items.filter(item => item.description.trim() !== ''),
      comments,
      rate: parseFloat(carrierRate) || 0
    };
    
    onSubmit(formData);
  };

  const generatePONumber = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    setPoNumber(`RC-${timestamp}-${random}`);
  };

  if (readOnly) {
    return (
      <div className={styles.formContainer}>
        <h2>Rate Confirmation Details</h2>
        <div className={styles.readOnlyInfo}>
          <p><strong>RC Number:</strong> {poNumber}</p>
          <p><strong>Date:</strong> {date}</p>
          <p><strong>Company:</strong> {companyInfo.name}</p>
          <p><strong>Carrier:</strong> {carrierInfo.companyName}</p>
          <p><strong>Vendor:</strong> {vendorInfo.name}</p>
          <p><strong>Ship To:</strong> {shipTo.name}</p>
          <p><strong>Rate:</strong> ${carrierRate}</p>
        </div>
        <button type="button" onClick={onCancel} className={styles.cancelButton}>
          Close
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.formSection}>
        <h3>Basic Information</h3>
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label htmlFor="poNumber">RC Number *</label>
            <div className={styles.poNumberInput}>
              <input
                type="text"
                id="poNumber"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                required
                placeholder="Enter RC number"
              />
              <button type="button" onClick={generatePONumber} className={styles.generateButton}>
                Generate
              </button>
            </div>
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="date">Date *</label>
            <input
              type="date"
              id="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
        </div>
      </div>

      <div className={styles.formSection}>
        <h3>Company Information</h3>
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label htmlFor="companyName">Company Name *</label>
            <input
              type="text"
              id="companyName"
              value={companyInfo.name}
              onChange={(e) => setCompanyInfo({...companyInfo, name: e.target.value})}
              required
              placeholder="Your company name"
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="companyContact">Contact Person</label>
            <input
              type="text"
              id="companyContact"
              value={companyInfo.contact}
              onChange={(e) => setCompanyInfo({...companyInfo, contact: e.target.value})}
              placeholder="Contact person name"
            />
          </div>
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="companyAddress">Company Address *</label>
          <input
            type="text"
            id="companyAddress"
            value={companyInfo.streetAddress}
            onChange={(e) => setCompanyInfo({...companyInfo, streetAddress: e.target.value})}
            required
            placeholder="Street address"
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="companyCityStateZip">City, State, ZIP *</label>
          <input
            type="text"
            id="companyCityStateZip"
            value={companyInfo.cityStateZip}
            onChange={(e) => setCompanyInfo({...companyInfo, cityStateZip: e.target.value})}
            required
            placeholder="City, State, ZIP"
          />
        </div>
      </div>

      <div className={styles.formSection}>
        <h3>Carrier Information</h3>
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label htmlFor="carrierCompanyName">Company Name *</label>
            <input
              type="text"
              id="carrierCompanyName"
              value={carrierInfo.companyName}
              onChange={(e) => setCarrierInfo({...carrierInfo, companyName: e.target.value})}
              required
              placeholder="Carrier company name"
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="carrierDriver">Driver *</label>
            <input
              type="text"
              id="carrierDriver"
              value={carrierInfo.driver}
              onChange={(e) => setCarrierInfo({...carrierInfo, driver: e.target.value})}
              required
              placeholder="Driver name"
            />
          </div>
        </div>
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label htmlFor="carrierContactEmail">Contact Email *</label>
            <input
              type="email"
              id="carrierContactEmail"
              value={carrierInfo.contactEmail}
              onChange={(e) => setCarrierInfo({...carrierInfo, contactEmail: e.target.value})}
              required
              placeholder="Contact email"
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="carrierContactNumber">Contact Number *</label>
            <input
              type="tel"
              id="carrierContactNumber"
              value={carrierInfo.contactNumber}
              onChange={(e) => setCarrierInfo({...carrierInfo, contactNumber: e.target.value})}
              required
              placeholder="Contact phone number"
            />
          </div>
        </div>
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label htmlFor="carrierMcNumber">MC Number *</label>
            <input
              type="text"
              id="carrierMcNumber"
              value={carrierInfo.mcNumber}
              onChange={(e) => setCarrierInfo({...carrierInfo, mcNumber: e.target.value})}
              required
              placeholder="MC Number"
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="carrierDotNumber">DOT Number *</label>
            <input
              type="text"
              id="carrierDotNumber"
              value={carrierInfo.dotNumber}
              onChange={(e) => setCarrierInfo({...carrierInfo, dotNumber: e.target.value})}
              required
              placeholder="DOT Number"
            />
          </div>
        </div>
      </div>

      <div className={styles.formSection}>
        <h3>Vendor Information</h3>
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label htmlFor="vendorName">Vendor Name *</label>
            <input
              type="text"
              id="vendorName"
              value={vendorInfo.name}
              onChange={(e) => setVendorInfo({...vendorInfo, name: e.target.value})}
              required
              placeholder="Vendor company name"
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="vendorContact">Contact Person</label>
            <input
              type="text"
              id="vendorContact"
              value={vendorInfo.contact}
              onChange={(e) => setVendorInfo({...vendorInfo, contact: e.target.value})}
              placeholder="Vendor contact person"
            />
          </div>
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="vendorAddress">Vendor Address *</label>
          <input
            type="text"
            id="vendorAddress"
            value={vendorInfo.streetAddress}
            onChange={(e) => setVendorInfo({...vendorInfo, streetAddress: e.target.value})}
            required
            placeholder="Vendor street address"
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="vendorCityStateZip">City, State, ZIP *</label>
          <input
            type="text"
            id="vendorCityStateZip"
            value={vendorInfo.cityStateZip}
            onChange={(e) => setVendorInfo({...vendorInfo, cityStateZip: e.target.value})}
            required
            placeholder="City, State, ZIP"
          />
        </div>
      </div>

      <div className={styles.formSection}>
        <h3>Ship To Information</h3>
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label htmlFor="shipToName">Ship To Name *</label>
            <input
              type="text"
              id="shipToName"
              value={shipTo.name}
              onChange={(e) => setShipTo({...shipTo, name: e.target.value})}
              required
              placeholder="Recipient name"
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="shipToContact">Contact Person</label>
            <input
              type="text"
              id="shipToContact"
              value={shipTo.contact}
              onChange={(e) => setShipTo({...shipTo, contact: e.target.value})}
              placeholder="Recipient contact person"
            />
          </div>
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="shipToAddress">Ship To Address *</label>
          <input
            type="text"
            id="shipToAddress"
            value={shipTo.streetAddress}
            onChange={(e) => setShipTo({...shipTo, streetAddress: e.target.value})}
            required
            placeholder="Delivery street address"
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="shipToCityStateZip">City, State, ZIP *</label>
          <input
            type="text"
            id="shipToCityStateZip"
            value={shipTo.cityStateZip}
            onChange={(e) => setShipTo({...shipTo, cityStateZip: e.target.value})}
            required
            placeholder="City, State, ZIP"
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="shipToInstructions">Special Instructions</label>
          <textarea
            id="shipToInstructions"
            value={shipTo.instructions}
            onChange={(e) => setShipTo({...shipTo, instructions: e.target.value})}
            placeholder="Any special delivery instructions"
            rows={3}
          />
        </div>
      </div>

      <div className={styles.formSection}>
        <h3>Items</h3>
        {items.map((item, index) => (
          <div key={index} className={styles.itemRow}>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Item Number</label>
                <input
                  type="text"
                  value={item.itemNumber}
                  onChange={(e) => updateItem(index, 'itemNumber', e.target.value)}
                  placeholder="Item #"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Description *</label>
                <input
                  type="text"
                  value={item.description}
                  onChange={(e) => updateItem(index, 'description', e.target.value)}
                  required
                  placeholder="Item description"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Quantity *</label>
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                  required
                  min="1"
                />
              </div>
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Dimensions</label>
                <input
                  type="text"
                  value={item.dimensions}
                  onChange={(e) => updateItem(index, 'dimensions', e.target.value)}
                  placeholder="L x W x H"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Weight (lbs)</label>
                <input
                  type="number"
                  value={item.weight}
                  onChange={(e) => updateItem(index, 'weight', parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.1"
                />
              </div>
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className={styles.removeButton}
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        ))}
        <button type="button" onClick={addItem} className={styles.addButton}>
          + Add Item
        </button>
      </div>

      <div className={styles.formSection}>
        <h3>Additional Information</h3>
        <div className={styles.formGroup}>
          <label htmlFor="comments">Comments</label>
          <textarea
            id="comments"
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Any additional comments or notes"
            rows={4}
          />
        </div>
      </div>

      <div className={styles.formSection}>
        <h3>Summary</h3>
        <div className={styles.summaryRow}>
          <span>Carrier Rate:</span>
          <span>${(parseFloat(carrierRate) || 0).toFixed(2)}</span>
        </div>
      </div>

      <div className={styles.formActions}>
        <button type="button" onClick={onCancel} className={styles.cancelButton}>
          Cancel
        </button>
        <button type="submit" className={styles.submitButton}>
          {initialData ? 'Update Rate Confirmation' : 'Create Rate Confirmation'}
        </button>
      </div>
    </form>
  );
};
