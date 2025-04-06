import React, { useState } from 'react';
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

interface PurchaseOrderFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

const emptyCompanyInfo: CompanyInfo = {
  name: '',
  streetAddress: '',
  cityStateZip: '',
  contact: ''
};

const emptyItem: PurchaseOrderItem = {
  itemNumber: '',
  description: '',
  quantity: 0,
  price: 0,
  total: 0
};

export const PurchaseOrderForm: React.FC<PurchaseOrderFormProps> = ({
  onSubmit,
  onCancel
}) => {
  const [formData, setFormData] = useState({
    poNumber: '',
    date: new Date().toISOString().split('T')[0],
    companyInfo: { ...emptyCompanyInfo },
    vendorInfo: { ...emptyCompanyInfo },
    shipTo: { ...emptyCompanyInfo },
    items: [{ ...emptyItem }],
    comments: '',
    subtotal: 0,
    discount: 0,
    tax: 0,
    grandTotal: 0
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');

  const handleCompanyInfoChange = (
    section: 'companyInfo' | 'vendorInfo' | 'shipTo',
    field: keyof CompanyInfo,
    value: string
  ) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleItemChange = (index: number, field: keyof PurchaseOrderItem, value: any) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      newItems[index] = {
        ...newItems[index],
        [field]: value,
        total: field === 'quantity' || field === 'price' 
          ? Number(value) * (field === 'quantity' ? newItems[index].price : newItems[index].quantity)
          : newItems[index].total
      };
      
      const subtotal = newItems.reduce((sum, item) => sum + item.total, 0);
      const discountAmount = (subtotal * prev.discount) / 100;
      const taxAmount = ((subtotal - discountAmount) * prev.tax) / 100;
      const grandTotal = subtotal - discountAmount + taxAmount;

      return { 
        ...prev, 
        items: newItems,
        subtotal,
        grandTotal
      };
    });
  };

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

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { ...emptyItem }]
    }));
  };

  const removeItem = (index: number) => {
    setFormData(prev => {
      const newItems = prev.items.filter((_, i) => i !== index);
      const subtotal = newItems.reduce((sum, item) => sum + item.total, 0);
      const discountAmount = (subtotal * prev.discount) / 100;
      const taxAmount = ((subtotal - discountAmount) * prev.tax) / 100;
      const grandTotal = subtotal - discountAmount + taxAmount;

      return {
        ...prev,
        items: newItems,
        subtotal,
        grandTotal
      };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      logo: logoFile
    });
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.header}>
        <div className={styles.logoSection}>
          {logoPreview ? (
            <img src={logoPreview} alt="Company Logo" className={styles.logo} />
          ) : (
            <div className={styles.logoPlaceholder}>
              <span>YOUR LOGO HERE</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className={styles.logoInput}
              />
            </div>
          )}
        </div>
        <div className={styles.title}>PURCHASE ORDER</div>
        <div className={styles.poInfo}>
          <div>
            <label>DATE: </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
            />
          </div>
          <div>
            <label>PO#: </label>
            <input
              type="text"
              value={formData.poNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, poNumber: e.target.value }))}
            />
          </div>
        </div>
      </div>

      <div className={styles.companyInfo}>
        <div className={styles.infoSection}>
          <input
            type="text"
            placeholder="Company Name"
            value={formData.companyInfo.name}
            onChange={(e) => handleCompanyInfoChange('companyInfo', 'name', e.target.value)}
          />
          <input
            type="text"
            placeholder="Street Address"
            value={formData.companyInfo.streetAddress}
            onChange={(e) => handleCompanyInfoChange('companyInfo', 'streetAddress', e.target.value)}
          />
          <input
            type="text"
            placeholder="City, State, Zip Code"
            value={formData.companyInfo.cityStateZip}
            onChange={(e) => handleCompanyInfoChange('companyInfo', 'cityStateZip', e.target.value)}
          />
          <input
            type="text"
            placeholder="Contact"
            value={formData.companyInfo.contact}
            onChange={(e) => handleCompanyInfoChange('companyInfo', 'contact', e.target.value)}
          />
        </div>
      </div>

      <div className={styles.vendorShipTo}>
        <div className={styles.section}>
          <h3>VENDOR INFORMATION</h3>
          <div className={styles.infoSection}>
            <input
              type="text"
              placeholder="Vendor Name"
              value={formData.vendorInfo.name}
              onChange={(e) => handleCompanyInfoChange('vendorInfo', 'name', e.target.value)}
            />
            <input
              type="text"
              placeholder="Street Address"
              value={formData.vendorInfo.streetAddress}
              onChange={(e) => handleCompanyInfoChange('vendorInfo', 'streetAddress', e.target.value)}
            />
            <input
              type="text"
              placeholder="City, State, Zip Code"
              value={formData.vendorInfo.cityStateZip}
              onChange={(e) => handleCompanyInfoChange('vendorInfo', 'cityStateZip', e.target.value)}
            />
            <input
              type="text"
              placeholder="Contact"
              value={formData.vendorInfo.contact}
              onChange={(e) => handleCompanyInfoChange('vendorInfo', 'contact', e.target.value)}
            />
          </div>
        </div>

        <div className={styles.section}>
          <h3>SHIP TO</h3>
          <div className={styles.infoSection}>
            <input
              type="text"
              placeholder="Company Name"
              value={formData.shipTo.name}
              onChange={(e) => handleCompanyInfoChange('shipTo', 'name', e.target.value)}
            />
            <input
              type="text"
              placeholder="Street Address"
              value={formData.shipTo.streetAddress}
              onChange={(e) => handleCompanyInfoChange('shipTo', 'streetAddress', e.target.value)}
            />
            <input
              type="text"
              placeholder="City, State, Zip Code"
              value={formData.shipTo.cityStateZip}
              onChange={(e) => handleCompanyInfoChange('shipTo', 'cityStateZip', e.target.value)}
            />
            <input
              type="text"
              placeholder="Contact"
              value={formData.shipTo.contact}
              onChange={(e) => handleCompanyInfoChange('shipTo', 'contact', e.target.value)}
            />
          </div>
        </div>
      </div>

      <table className={styles.itemsTable}>
        <thead>
          <tr>
            <th>ITEM #</th>
            <th>DESCRIPTION</th>
            <th>QTY</th>
            <th>PRICE</th>
            <th>TOTAL</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {formData.items.map((item, index) => (
            <tr key={index}>
              <td>
                <input
                  type="text"
                  value={item.itemNumber}
                  onChange={(e) => handleItemChange(index, 'itemNumber', e.target.value)}
                />
              </td>
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
              <td>${item.total.toFixed(2)}</td>
              <td>
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className={styles.removeButton}
                >
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button
        type="button"
        onClick={addItem}
        className={styles.addButton}
      >
        Add Item
      </button>

      <div className={styles.footer}>
        <div className={styles.comments}>
          <h3>Comments or Special Instructions</h3>
          <textarea
            value={formData.comments}
            onChange={(e) => setFormData(prev => ({ ...prev, comments: e.target.value }))}
          />
        </div>

        <div className={styles.totals}>
          <div className={styles.totalRow}>
            <label>SUB TOTAL</label>
            <span>${formData.subtotal.toFixed(2)}</span>
          </div>
          <div className={styles.totalRow}>
            <label>DISCOUNT</label>
            <input
              type="number"
              value={formData.discount}
              onChange={(e) => setFormData(prev => ({ ...prev, discount: Number(e.target.value) }))}
            />
          </div>
          <div className={styles.totalRow}>
            <label>TAX</label>
            <input
              type="number"
              value={formData.tax}
              onChange={(e) => setFormData(prev => ({ ...prev, tax: Number(e.target.value) }))}
            />
          </div>
          <div className={styles.totalRow}>
            <label>GRAND TOTAL</label>
            <span>${formData.grandTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className={styles.actions}>
        <button type="button" onClick={onCancel} className={styles.cancelButton}>
          Cancel
        </button>
        <button type="submit" className={styles.submitButton}>
          Create Purchase Order
        </button>
      </div>
    </form>
  );
}; 