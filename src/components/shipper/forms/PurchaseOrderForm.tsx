import React, { useState, useRef, ChangeEvent } from 'react';
import styles from './PurchaseOrderForm.module.css';

interface CompanyInfo {
  name: string;
  streetAddress: string;
  cityStateZip: string;
  contact: string;
}

interface PurchaseOrderItem {
  itemNumber: string;
  description: string;
  quantity: number;
  price: number;
  total: number;
}

interface ShipTo {
  name: string;
  streetAddress: string;
  cityStateZip: string;
  contact: string;
  instructions: string;
}

interface PurchaseOrderFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export const PurchaseOrderForm: React.FC<PurchaseOrderFormProps> = ({
  onSubmit,
  onCancel
}) => {
  const [formData, setFormData] = useState({
    poNumber: '',
    date: new Date().toISOString().split('T')[0],
    companyInfo: {
      name: '',
      streetAddress: '',
      cityStateZip: '',
      contact: ''
    },
    vendorInfo: {
      name: '',
      streetAddress: '',
      cityStateZip: '',
      contact: ''
    },
    shipTo: {
      name: '',
      streetAddress: '',
      cityStateZip: '',
      contact: '',
      instructions: ''
    },
    items: [{
      itemNumber: '',
      description: '',
      quantity: 0,
      price: 0,
      total: 0
    }],
    comments: '',
    subtotal: 0,
    discount: 0,
    tax: 0,
    grandTotal: 0
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const calculateTotal = (quantity: number, price: number) => {
    return quantity * price;
  };

  const handleItemChange = (index: number, field: keyof PurchaseOrderItem, value: any) => {
    const newItems = [...formData.items];
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

    const subtotal = newItems.reduce((sum, item) => sum + item.total, 0);
    const discountAmount = (subtotal * formData.discount) / 100;
    const taxAmount = ((subtotal - discountAmount) * formData.tax) / 100;
    const grandTotal = subtotal - discountAmount + taxAmount;

    setFormData(prev => ({
      ...prev,
      items: newItems,
      subtotal,
      grandTotal
    }));
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { itemNumber: '', description: '', quantity: 0, price: 0, total: 0 }]
    }));
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.header}>
        <div className={styles.logoSection}>
          {logoPreview ? (
            <img src={logoPreview} alt="Company Logo" className={styles.logo} />
          ) : (
            <div className={styles.logoPlaceholder}>
              Click to Upload Logo
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className={styles.logoInput}
              />
            </div>
          )}
        </div>
        <h1 className={styles.title}>PURCHASE ORDER</h1>
      </div>

      <div className={styles.companySection}>
        <div className={styles.companyInfo}>
          <input
            type="text"
            value={formData.companyInfo.name}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              companyInfo: { ...prev.companyInfo, name: e.target.value }
            }))}
            placeholder="Company Name"
          />
          <input
            type="text"
            value={formData.companyInfo.streetAddress}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              companyInfo: { ...prev.companyInfo, streetAddress: e.target.value }
            }))}
            placeholder="Address"
          />
          <input
            type="text"
            value={formData.companyInfo.cityStateZip}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              companyInfo: { ...prev.companyInfo, cityStateZip: e.target.value }
            }))}
            placeholder="City, State, Zip Code"
          />
          <input
            type="text"
            value={formData.companyInfo.contact}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              companyInfo: { ...prev.companyInfo, contact: e.target.value }
            }))}
            placeholder="Contact"
          />
        </div>
        <div className={styles.poDetails}>
          <div className={styles.poDate}>
            <span>Date:</span>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
            />
          </div>
          <div className={styles.poNumber}>
            <span>PO Number:</span>
            <input
              type="text"
              value={formData.poNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, poNumber: e.target.value }))}
            />
          </div>
        </div>
      </div>

      <div className={styles.infoGrid}>
        <div className={styles.vendorInfo}>
          <div className={styles.sectionHeader}>VENDOR</div>
          <input
            type="text"
            value={formData.vendorInfo.name}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              vendorInfo: { ...prev.vendorInfo, name: e.target.value }
            }))}
            placeholder="Vendor Name"
          />
          <input
            type="text"
            value={formData.vendorInfo.streetAddress}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              vendorInfo: { ...prev.vendorInfo, streetAddress: e.target.value }
            }))}
            placeholder="Address"
          />
          <input
            type="text"
            value={formData.vendorInfo.cityStateZip}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              vendorInfo: { ...prev.vendorInfo, cityStateZip: e.target.value }
            }))}
            placeholder="City, State, Zip Code"
          />
          <input
            type="text"
            value={formData.vendorInfo.contact}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              vendorInfo: { ...prev.vendorInfo, contact: e.target.value }
            }))}
            placeholder="Contact"
          />
        </div>

        <div className={styles.shipTo}>
          <div className={styles.sectionHeader}>SHIP TO</div>
          <input
            type="text"
            value={formData.shipTo.name}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              shipTo: { ...prev.shipTo, name: e.target.value }
            }))}
            placeholder="Recipient Name"
          />
          <input
            type="text"
            value={formData.shipTo.streetAddress}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              shipTo: { ...prev.shipTo, streetAddress: e.target.value }
            }))}
            placeholder="Shipping Address"
          />
          <input
            type="text"
            value={formData.shipTo.cityStateZip}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              shipTo: { ...prev.shipTo, cityStateZip: e.target.value }
            }))}
            placeholder="City, State, Zip Code"
          />
          <input
            type="text"
            value={formData.shipTo.contact}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              shipTo: { ...prev.shipTo, contact: e.target.value }
            }))}
            placeholder="Phone"
          />
          <input
            type="text"
            value={formData.shipTo.instructions}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              shipTo: { ...prev.shipTo, instructions: e.target.value }
            }))}
            placeholder="Special Instructions"
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
          {formData.items.map((item, index) => (
            <tr key={index}>
              <td>
                <input
                  type="text"
                  value={item.description}
                  onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                />
              </td>
              <td>
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                />
              </td>
              <td>
                <input
                  type="number"
                  value={item.price}
                  onChange={(e) => handleItemChange(index, 'price', Number(e.target.value))}
                />
              </td>
              <td>${(item.quantity * item.price).toFixed(2)}</td>
              <td>
                <button type="button" onClick={() => handleItemChange(index, 'quantity', 0)}>×</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button type="button" className={styles.addItemButton} onClick={addItem}>
        Add Item
      </button>

      <div className={styles.footer}>
        <div className={styles.comments}>
          <div className={styles.sectionHeader}>COMMENTS</div>
          <textarea
            value={formData.comments}
            onChange={(e) => setFormData(prev => ({ ...prev, comments: e.target.value }))}
            placeholder="Enter any additional comments or special instructions..."
          />
        </div>
        <div className={styles.totals}>
          <div className={styles.totalRow}>
            <span>Subtotal:</span>
            <span>${formData.subtotal.toFixed(2)}</span>
          </div>
          <div className={styles.totalRow}>
            <span>Discount:</span>
            <input
              type="number"
              value={formData.discount}
              onChange={(e) => setFormData(prev => ({ ...prev, discount: Number(e.target.value) }))}
            />
          </div>
          <div className={styles.totalRow}>
            <span>Tax Rate (%):</span>
            <input
              type="number"
              value={formData.tax}
              onChange={(e) => setFormData(prev => ({ ...prev, tax: Number(e.target.value) }))}
            />
          </div>
          <div className={styles.totalRow}>
            <span>Tax Amount:</span>
            <span>${((formData.subtotal * formData.tax) / 100).toFixed(2)}</span>
          </div>
          <div className={styles.totalRow}>
            <span>Total:</span>
            <span>${formData.grandTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className={styles.formActions}>
        <button type="submit" className={styles.submitButton}>
          Submit Order
        </button>
        <button type="button" className={styles.cancelButton} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}; 