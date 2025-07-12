import React, { useState, useRef, ChangeEvent, useEffect } from 'react';
import styles from './PurchaseOrderForm.module.css';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';

interface CompanyInfo {
  name: string;
  streetAddress: string;
  cityStateZip: string;
  contact: string;
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

interface PurchaseOrderItem {
  itemNumber: string;
  description: string;
  quantity: number;
  price: number;
  total: number;
  dimensions?: string;
  weight?: number;
}

interface PurchaseOrderFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
  initialData?: any;
  readOnly?: boolean;
}

export const PurchaseOrderForm: React.FC<PurchaseOrderFormProps> = ({
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

  const [selectedOption, setSelectedOption] = useState<'carrier' | 'marketplace' | null>(initialData?.carrierOption || null);
  const [carrierRate, setCarrierRate] = useState<string>(initialData?.rate ? String(initialData.rate) : '');
  const [date, setDate] = useState<string>(initialData?.date || new Date().toISOString().split('T')[0]);
  const [poNumber, setPoNumber] = useState<string>(initialData?.poNumber || '');
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(initialData?.companyInfo || {
    name: '',
    streetAddress: '',
    cityStateZip: '',
    contact: ''
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
  const [items, setItems] = useState<PurchaseOrderItem[]>(
    Array.isArray(initialData?.items) ? initialData.items : [{
      itemNumber: '',
      description: '',
      quantity: 0,
      price: 0,
      total: 0,
      dimensions: '',
      weight: 0
    }]
  );
  const [comments, setComments] = useState<string>(initialData?.comments || '');
  const [subtotal, setSubtotal] = useState<number>(initialData?.subtotal || 0);
  const [discount, setDiscount] = useState<number>(initialData?.discount || 0);
  const [tax, setTax] = useState<number>(initialData?.tax || 0);
  const [total, setTotal] = useState<number>(initialData?.total || 0);
  const { user } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('DEBUG: PurchaseOrderForm handleSubmit called');
    // Validate that an option is selected
    if (!selectedOption) {
      alert('Please select either a partnered carrier or marketplace option');
      return;
    }
    // Get form data from the state hooks
    const formData = {
      companyInfo,
      vendorInfo,
      shipTo,
      items,
      comments,
      subtotal,
      discount,
      tax,
      total,
      carrierOption: selectedOption,
      rate: parseFloat(carrierRate) || 0,
      status: selectedOption ? 'Active' : 'Processing',
      shippingScheduleStatus: selectedOption === 'carrier' ? 'Carrier Pending' : 'Open',
      createdAt: new Date().toISOString(),
      date,
      poNumber: poNumber || '',
      userId: user?.uid || ''
    };
    console.log('DEBUG: PurchaseOrderForm formData', formData);
    onSubmit(formData);
  };

  const calculateTotal = (quantity: number, price: number) => {
    return quantity * price;
  };

  const handleItemChange = (index: number, field: keyof PurchaseOrderItem, value: any) => {
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      [field]: value,
      total: field === 'quantity' || field === 'price' 
        ? calculateTotal(
            field === 'quantity' ? Number(value) : newItems[index].quantity,
            field === 'price' ? Number(value) : newItems[index].price
          )
        : newItems[index].total
    };

    const newSubtotal = newItems.reduce((sum, item) => sum + item.total, 0);
    const discountAmount = (newSubtotal * discount) / 100;
    const taxAmount = ((newSubtotal - discountAmount) * tax) / 100;
    const newTotal = newSubtotal - discountAmount + taxAmount;

    setItems(newItems);
    setSubtotal(newSubtotal);
    setTotal(newTotal);
  };

  const addItem = () => {
    setItems([...items, { itemNumber: '', description: '', quantity: 0, price: 0, total: 0, dimensions: '', weight: 0 }]);
  };

  // Mobile item renderer
  const renderMobileItems = () => (
    <div className={styles.mobileItemsContainer}>
      <div className={styles.mobileItemsHeader}>
        <h3>Items</h3>
        <button type="button" className={styles.addItemButton} onClick={addItem} disabled={readOnly}>
          Add Item
        </button>
      </div>
      {items.map((item, index) => (
        <div key={index} className={styles.mobileItemCard}>
          <div className={styles.mobileItemHeader}>
            <span className={styles.itemNumber}>Item {index + 1}</span>
            <button 
              type="button" 
              className={styles.removeItemButton}
              onClick={() => handleItemChange(index, 'quantity', 0)} 
              disabled={readOnly}
            >
              ×
            </button>
          </div>
          <div className={styles.mobileItemFields}>
            <div className={styles.mobileField}>
              <label>Description</label>
              <input
                type="text"
                value={item.description}
                onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                placeholder="Item description"
                disabled={readOnly}
              />
            </div>
            <div className={styles.mobileFieldRow}>
              <div className={styles.mobileField}>
                <label>Quantity</label>
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                  placeholder="0"
                  disabled={readOnly}
                />
              </div>
              <div className={styles.mobileField}>
                <label>Unit Price</label>
                <input
                  type="number"
                  value={item.price}
                  onChange={(e) => handleItemChange(index, 'price', Number(e.target.value))}
                  placeholder="0.00"
                  step="0.01"
                  disabled={readOnly}
                />
              </div>
            </div>
            <div className={styles.mobileFieldRow}>
              <div className={styles.mobileField}>
                <label>Dimensions (L×W×H)</label>
                <input
                  type="text"
                  value={item.dimensions || ''}
                  onChange={(e) => handleItemChange(index, 'dimensions', e.target.value)}
                  placeholder="e.g., 12×8×6 inches"
                  disabled={readOnly}
                />
              </div>
              <div className={styles.mobileField}>
                <label>Weight (lbs)</label>
                <input
                  type="number"
                  value={item.weight || ''}
                  onChange={(e) => handleItemChange(index, 'weight', Number(e.target.value))}
                  placeholder="0"
                  step="0.1"
                  disabled={readOnly}
                />
              </div>
            </div>
            <div className={styles.mobileItemTotal}>
              <span>Total: ${(item.quantity * item.price).toFixed(2)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.header}>
        <div className={styles.logoSection}>
          {/* Logo section content remains unchanged */}
        </div>
        <h1 className={styles.title}>PURCHASE ORDER</h1>
      </div>

      <div className={styles.companySection}>
        <div className={styles.companyInfo}>
          <input
            type="text"
            value={companyInfo.name}
            onChange={(e) => setCompanyInfo(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Company Name"
            disabled={readOnly}
          />
          <input
            type="text"
            value={companyInfo.streetAddress}
            onChange={(e) => setCompanyInfo(prev => ({ ...prev, streetAddress: e.target.value }))}
            placeholder="Address"
            disabled={readOnly}
          />
          <input
            type="text"
            value={companyInfo.cityStateZip}
            onChange={(e) => setCompanyInfo(prev => ({ ...prev, cityStateZip: e.target.value }))}
            placeholder="City, State, Zip Code"
            disabled={readOnly}
          />
          <input
            type="text"
            value={companyInfo.contact}
            onChange={(e) => setCompanyInfo(prev => ({ ...prev, contact: e.target.value }))}
            placeholder="Contact"
            disabled={readOnly}
          />
        </div>
        <div className={styles.poDetails}>
          <div className={styles.poDate}>
            <span>Date:</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={readOnly}
            />
          </div>
          <div className={styles.poNumber}>
            <span>PO Number:</span>
            <input
              type="text"
              value={poNumber}
              onChange={(e) => setPoNumber(e.target.value)}
              placeholder="Enter PO Number"
              disabled={readOnly}
            />
          </div>
        </div>
      </div>

      <div className={styles.infoGrid}>
        <div className={styles.vendorInfo}>
          <div className={styles.sectionHeader}>VENDOR</div>
          <input
            type="text"
            value={vendorInfo.name}
            onChange={(e) => setVendorInfo(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Vendor Name"
            disabled={readOnly}
          />
          <input
            type="text"
            value={vendorInfo.streetAddress}
            onChange={(e) => setVendorInfo(prev => ({ ...prev, streetAddress: e.target.value }))}
            placeholder="Address"
            disabled={readOnly}
          />
          <input
            type="text"
            value={vendorInfo.cityStateZip}
            onChange={(e) => setVendorInfo(prev => ({ ...prev, cityStateZip: e.target.value }))}
            placeholder="City, State, Zip Code"
            disabled={readOnly}
          />
          <input
            type="text"
            value={vendorInfo.contact}
            onChange={(e) => setVendorInfo(prev => ({ ...prev, contact: e.target.value }))}
            placeholder="Contact"
            disabled={readOnly}
          />
        </div>

        <div className={styles.shipTo}>
          <div className={styles.sectionHeader}>SHIP TO</div>
          <input
            type="text"
            value={shipTo.name}
            onChange={(e) => setShipTo(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Recipient Name"
            disabled={readOnly}
          />
          <input
            type="text"
            value={shipTo.streetAddress}
            onChange={(e) => setShipTo(prev => ({ ...prev, streetAddress: e.target.value }))}
            placeholder="Shipping Address"
            disabled={readOnly}
          />
          <input
            type="text"
            value={shipTo.cityStateZip}
            onChange={(e) => setShipTo(prev => ({ ...prev, cityStateZip: e.target.value }))}
            placeholder="City, State, Zip Code"
            disabled={readOnly}
          />
          <input
            type="text"
            value={shipTo.contact}
            onChange={(e) => setShipTo(prev => ({ ...prev, contact: e.target.value }))}
            placeholder="Phone"
            disabled={readOnly}
          />
          <input
            type="text"
            value={shipTo.instructions}
            onChange={(e) => setShipTo(prev => ({ ...prev, instructions: e.target.value }))}
            placeholder="Special Instructions"
            disabled={readOnly}
          />
        </div>
      </div>

      {isMobile ? renderMobileItems() : (
        <>
          <table className={styles.itemsTable}>
            <thead>
              <tr>
                <th>Item Description</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Dimensions</th>
                <th>Weight (lbs)</th>
                <th>Total</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index}>
                  <td>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      disabled={readOnly}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                      disabled={readOnly}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={item.price}
                      onChange={(e) => handleItemChange(index, 'price', Number(e.target.value))}
                      disabled={readOnly}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={item.dimensions || ''}
                      onChange={(e) => handleItemChange(index, 'dimensions', e.target.value)}
                      placeholder="L×W×H"
                      disabled={readOnly}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={item.weight || ''}
                      onChange={(e) => handleItemChange(index, 'weight', Number(e.target.value))}
                      placeholder="0"
                      step="0.1"
                      disabled={readOnly}
                    />
                  </td>
                  <td>${(item.quantity * item.price).toFixed(2)}</td>
                  <td>
                    <button type="button" onClick={() => handleItemChange(index, 'quantity', 0)} disabled={readOnly}>×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <button type="button" className={styles.addItemButton} onClick={addItem} disabled={readOnly}>
            Add Item
          </button>
        </>
      )}

      <div className={styles.footer}>
        <div className={styles.comments}>
          <div className={styles.sectionHeader}>COMMENTS</div>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Enter any additional comments or special instructions..."
            disabled={readOnly}
          />
        </div>
        <div className={styles.totals}>
          <div className={styles.totalRow}>
            <span>Subtotal:</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className={styles.totalRow}>
            <span>Discount:</span>
            <input
              type="number"
              value={discount}
              onChange={(e) => setDiscount(Number(e.target.value))}
              disabled={readOnly}
            />
          </div>
          <div className={styles.totalRow}>
            <span>Tax Rate (%):</span>
            <input
              type="number"
              value={tax}
              onChange={(e) => setTax(Number(e.target.value))}
              disabled={readOnly}
            />
          </div>
          <div className={styles.totalRow}>
            <span>Tax Amount:</span>
            <span>${((subtotal * tax) / 100).toFixed(2)}</span>
          </div>
          <div className={styles.totalRow}>
            <span>Total:</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className={styles.carrierSelectionSection}>
        <h3>Select Delivery Option</h3>
        <div className={styles.carrierOptions}>
          <button
            type="button"
            className={`${styles.optionButton} ${selectedOption === 'carrier' ? styles.selected : ''}`}
            onClick={() => setSelectedOption('carrier')}
            disabled={readOnly}
          >
            <span className={styles.optionIcon}>🚛</span>
            <span className={styles.optionLabel}>Send to Partnered Carrier</span>
            <span className={styles.optionDescription}>
              Choose from your trusted carrier partners
            </span>
          </button>

          <button
            type="button"
            className={`${styles.optionButton} ${selectedOption === 'marketplace' ? styles.selected : ''}`}
            onClick={() => setSelectedOption('marketplace')}
            disabled={readOnly}
          >
            <span className={styles.optionIcon}>🌐</span>
            <span className={styles.optionLabel}>Post to Marketplace</span>
            <span className={styles.optionDescription}>
              Post job for verified carriers to accept
            </span>
          </button>
        </div>
        {selectedOption && (
          <div className={styles.carrierRateSection} style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
            <label htmlFor="carrierRate" style={{ fontWeight: 700, fontSize: 17, color: '#222', marginRight: 8, display: 'inline-block', minWidth: 100 }}>Carrier Rate</label>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: '#222', pointerEvents: 'none' }}>$</span>
              <input
                id="carrierRate"
                type="text"
                value={carrierRate}
                onChange={e => {
                  // Only allow numbers and optional decimal
                  const val = e.target.value.replace(/[^0-9.]/g, '');
                  setCarrierRate(val);
                }}
                placeholder="Amount"
                style={{ fontSize: 16, fontWeight: 500, width: 120, paddingLeft: 22 }}
                disabled={readOnly}
                required
                inputMode="decimal"
                pattern="^[0-9]*\.?[0-9]*$"
              />
            </div>
          </div>
        )}

        {!selectedOption && (
          <p className={styles.selectionHint}>
            Please select a delivery option to proceed
          </p>
        )}
      </div>

      <div className={styles.formActions}>
        <button 
          type="button" 
          onClick={onCancel}
          className={styles.cancelButton}
          disabled={readOnly}
        >
          Cancel
        </button>
        <button 
          type="submit"
          className={styles.submitButton}
          disabled={!selectedOption || (selectedOption === 'carrier' && !carrierRate) || readOnly}
          onClick={() => { console.log('DEBUG: Submit button clicked'); }}
        >
          {selectedOption === 'carrier' ? 'Continue to Carrier Selection' : 'Post Job to Marketplace'}
        </button>
      </div>
    </form>
  );
}; 