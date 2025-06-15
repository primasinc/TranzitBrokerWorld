import React, { useState, useRef, ChangeEvent } from 'react';
import styles from './PurchaseOrderForm.module.css';
import { useNavigate } from 'react-router-dom';
import { db } from '../../../firebase'; // Adjust path if needed
import { collection, addDoc } from 'firebase/firestore';

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
      total: 0
    }]
  );
  const [comments, setComments] = useState<string>(initialData?.comments || '');
  const [subtotal, setSubtotal] = useState<number>(initialData?.subtotal || 0);
  const [discount, setDiscount] = useState<number>(initialData?.discount || 0);
  const [tax, setTax] = useState<number>(initialData?.tax || 0);
  const [total, setTotal] = useState<number>(initialData?.total || 0);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      shippingScheduleStatus: selectedOption ? 'Active' : 'Open',
      createdAt: new Date().toISOString(),
      date,
      poNumber: poNumber || ''
    };

    // Save to Firestore
    try {
      await addDoc(collection(db, 'purchaseOrders'), formData);
    } catch (error) {
      console.error('Error saving PO:', error);
      alert('Failed to save purchase order.');
      return;
    }

    // Handle form submission based on selected option
    if (selectedOption === 'carrier') {
      // Navigate to carrier partners with PO data
      navigate('/shipper/partners', { 
        state: { 
          poData: formData,
          rate: carrierRate 
        } 
      });
    } else {
      // Submit to marketplace and create shipping schedule, then go to dashboard
      onSubmit({
        ...formData,
        shippingScheduleStatus: 'Open'
      });
      navigate('/shipper/orders');
    }
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
    setItems([...items, { itemNumber: '', description: '', quantity: 0, price: 0, total: 0 }]);
  };

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

      <table className={styles.itemsTable}>
        <thead>
          <tr>
            <th>Item Description</th>
            <th>Quantity</th>
            <th>Unit Price</th>
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
          <div className={styles.rateInput}>
            <label htmlFor="carrierRate">
              {selectedOption === 'carrier' ? 'Proposed Rate ($)' : 'Job Rate ($)'}
            </label>
            <input
              type="number"
              id="carrierRate"
              value={carrierRate}
              onChange={(e) => setCarrierRate(e.target.value)}
              placeholder={selectedOption === 'carrier' ? "Enter proposed rate" : "Enter fixed rate for this job"}
              required
              min="0"
              step="0.01"
              disabled={readOnly}
            />
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
          disabled={!selectedOption || !carrierRate || readOnly}
        >
          {selectedOption === 'carrier' ? 'Continue to Carrier Selection' : 'Post Job to Marketplace'}
        </button>
      </div>
    </form>
  );
}; 