import React, { useState, useRef, ChangeEvent, useEffect } from 'react';
import styles from './PurchaseOrderForm.module.css';
import { useNavigate } from 'react-router-dom';
import { RateConfirmationPreview } from './RateConfirmationPreview';

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
  const [brokerRate, setBrokerRate] = useState<string>(initialData?.brokerRate ? String(initialData.brokerRate) : '');
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
  const [termsConditions, setTermsConditions] = useState<string>(initialData?.termsConditions || '');
  const [subtotal, setSubtotal] = useState<number>(initialData?.subtotal || 0);
  const [showRateConfirmationPreview, setShowRateConfirmationPreview] = useState(false);
  const [isStateReady, setIsStateReady] = useState(false);

  // Ensure state is ready before rendering
  useEffect(() => {
    setIsStateReady(true);
  }, []);

  // Calculate subtotal whenever items change
  useEffect(() => {
    const total = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    setSubtotal(total);
  }, [items]);

  const addItem = () => {
    setItems([...items, {
      itemNumber: '',
      description: '',
      quantity: 0,
      price: 0,
      total: 0,
      dimensions: '',
      weight: 0
    }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof PurchaseOrderItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Recalculate total for this item
    if (field === 'quantity' || field === 'price') {
      newItems[index].total = newItems[index].quantity * newItems[index].price;
    }
    
    setItems(newItems);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
         const formData = {
       poNumber,
       date,
       companyInfo,
       vendorInfo,
       shipTo,
       items: items.filter(item => item.description.trim() !== ''),
       comments,
       termsConditions,
       subtotal,
       brokerRate: parseFloat(brokerRate) || 0,
       rate: parseFloat(carrierRate) || 0,
       carrierOption: selectedOption
     };
    
    onSubmit(formData);
  };

  const generatePONumber = () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    setPoNumber(`PO-${timestamp}-${random}`);
  };

  // Generate PDF invoice for shipper (hides individual fees)
  const generateShipperPDF = () => {
    // Create a new window for the PDF
    const pdfWindow = window.open('', '_blank');
    if (!pdfWindow) return;

    // Calculate total cost (broker rate + carrier rate)
    const totalCost = (parseFloat(brokerRate) || 0) + (parseFloat(carrierRate) || 0);
    
    // Create HTML content for the invoice
    const invoiceHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Purchase Order Invoice - ${poNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
          .section { margin-bottom: 30px; }
          .section h3 { color: #333; font-size: 1.1rem; margin-bottom: 15px; border-bottom: 1px solid #ddd; padding-bottom: 8px; }
          .info-row { margin-bottom: 8px; }
          .info-row strong { display: inline-block; width: 120px; }
          .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          .items-table th, .items-table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          .items-table th { background-color: #f5f5f5; }
          .total-section { text-align: right; font-size: 18px; font-weight: bold; margin-top: 20px; }
          .footer { margin-top: 40px; text-align: center; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>PURCHASE ORDER INVOICE</h1>
          <h2>${companyInfo.name}</h2>
        </div>
        
        <div class="section">
          <h3>Company Information</h3>
          <div class="info-row"><strong>Company Name:</strong> ${companyInfo.name}</div>
          <div class="info-row"><strong>Address:</strong> ${companyInfo.streetAddress}</div>
          <div class="info-row"><strong>City, State, ZIP:</strong> ${companyInfo.cityStateZip}</div>
          <div class="info-row"><strong>Contact:</strong> ${companyInfo.contact}</div>
        </div>
        
        <div class="section">
          <h3>Vendor Information</h3>
          <div class="info-row"><strong>Vendor Name:</strong> ${vendorInfo.name}</div>
          <div class="info-row"><strong>Address:</strong> ${vendorInfo.streetAddress}</div>
          <div class="info-row"><strong>City, State, ZIP:</strong> ${vendorInfo.cityStateZip}</div>
          <div class="info-row"><strong>Contact:</strong> ${vendorInfo.contact}</div>
        </div>
        
        <div class="section">
          <h3>Ship To Information</h3>
          <div class="info-row"><strong>Ship To:</strong> ${shipTo.name}</div>
          <div class="info-row"><strong>Address:</strong> ${shipTo.streetAddress}</div>
          <div class="info-row"><strong>City, State, ZIP:</strong> ${shipTo.cityStateZip}</div>
          <div class="info-row"><strong>Contact:</strong> ${shipTo.contact}</div>
          ${shipTo.instructions ? `<div class="info-row"><strong>Instructions:</strong> ${shipTo.instructions}</div>` : ''}
        </div>
        
        <div class="section">
          <h3>Purchase Order Details</h3>
          <div class="info-row"><strong>PO Number:</strong> ${poNumber}</div>
          <div class="info-row"><strong>Date:</strong> ${date}</div>
        </div>
        
        <div class="section">
          <h3>Items</h3>
          <table class="items-table">
            <thead>
              <tr>
                <th>Item #</th>
                <th>Description</th>
                <th>Quantity</th>
                <th>Price</th>
                <th>Total</th>
                <th>Dimensions</th>
                <th>Weight (lbs)</th>
              </tr>
            </thead>
            <tbody>
              ${items.filter(item => item.description.trim() !== '').map(item => `
                <tr>
                  <td>${item.itemNumber}</td>
                  <td>${item.description}</td>
                  <td>${item.quantity}</td>
                  <td>$${item.price.toFixed(2)}</td>
                  <td>$${item.total.toFixed(2)}</td>
                  <td>${item.dimensions || '-'}</td>
                  <td>${item.weight || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        
        <div class="total-section">
          <div><strong>Total Cost:</strong> $${totalCost.toFixed(2)}</div>
        </div>
        
        ${comments ? `
        <div class="section">
          <h3>Additional Notes</h3>
          <div>${comments}</div>
        </div>
        ` : ''}
        
        ${termsConditions ? `
        <div class="section">
          <h3>Terms and Conditions</h3>
          <div>${termsConditions}</div>
        </div>
        ` : ''}
        
        <div class="footer">
          <p>Thank you for your business!</p>
          <p>Generated on ${new Date().toLocaleDateString()}</p>
        </div>
      </body>
      </html>
    `;

    // Write the HTML to the new window
    pdfWindow.document.write(invoiceHTML);
    pdfWindow.document.close();
    
    // Wait for content to load, then print
    pdfWindow.onload = () => {
      pdfWindow.print();
    };
  };

  // Safety check to ensure state is ready
  if (!isStateReady) {
    return (
      <div className={styles.formContainer}>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <p>Loading form...</p>
        </div>
      </div>
    );
  }

  if (readOnly) {
    return (
      <div className={styles.formContainer}>
        <h2>Purchase Order Details</h2>
        <div className={styles.readOnlyInfo}>
          <p><strong>PO Number:</strong> {poNumber}</p>
          <p><strong>Date:</strong> {date}</p>
          <p><strong>Company:</strong> {companyInfo.name}</p>
          <p><strong>Vendor:</strong> {vendorInfo.name}</p>
          <p><strong>Ship To:</strong> {shipTo.name}</p>
          <p><strong>Total:</strong> ${subtotal.toFixed(2)}</p>
        </div>
        <button type="button" onClick={onCancel} className={styles.cancelButton}>
          Close
        </button>
      </div>
    );
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.formSection}>
        <h3>Basic Information</h3>
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label htmlFor="poNumber">PO Number *</label>
            <div className={styles.poNumberInput}>
              <input
                type="text"
                id="poNumber"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                required
                placeholder="Enter PO number"
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
              <div className={styles.formGroup}>
                <label>Price *</label>
                <input
                  type="number"
                  value={item.price}
                  onChange={(e) => updateItem(index, 'price', parseFloat(e.target.value) || 0)}
                  required
                  min="0"
                  step="0.01"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Total</label>
                <input
                  type="number"
                  value={item.total}
                  readOnly
                  className={styles.readOnly}
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
            </div>
          </div>
        ))}
        <button type="button" onClick={addItem} className={styles.addButton}>
          + Add Item
        </button>
        
        {/* Cargo Subtotal Display */}
        <div className={styles.cargoSubtotal}>
          <div className={styles.subtotalRow}>
            <span>Cargo Subtotal:</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
        </div>
      </div>

                           <div className={styles.formSection}>
          <h3>Additional Information</h3>
          <div className={styles.formGroup}>
            <label htmlFor="comments">Additional Notes</label>
            <textarea
              id="comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Any additional comments, notes, or special instructions"
              rows={6}
              className={styles.largeTextarea}
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="termsConditions">Terms and Conditions</label>
            <textarea
              id="termsConditions"
              value={termsConditions}
              onChange={(e) => setTermsConditions(e.target.value)}
              placeholder="Enter terms and conditions for this purchase order"
              rows={8}
              className={styles.largeTextarea}
            />
          </div>
        </div>

                               <div className={styles.formSection}>
           <h3>Summary</h3>
           <div className={styles.summaryRow}>
             <span>Broker Rate:</span>
             <span>${(parseFloat(brokerRate) || 0).toFixed(2)}</span>
           </div>
           <div className={styles.summaryRow}>
             <span>Carrier Rate:</span>
             <span>${(parseFloat(carrierRate) || 0).toFixed(2)}</span>
           </div>
           <div className={styles.summaryRow}>
             <span>Total:</span>
             <span>${((parseFloat(brokerRate) || 0) + (parseFloat(carrierRate) || 0)).toFixed(2)}</span>
           </div>
         </div>

       <div className={styles.carrierSelectionSection}>
         <h3>Select Delivery Option</h3>
         <div className={styles.carrierOptions}>
           <button
             type="button"
             className={`${styles.optionButton} ${selectedOption === 'carrier' ? styles.selected : ''}`}
             onClick={() => setSelectedOption('carrier')}
           >
             <div className={styles.optionIcon}>🚛</div>
             <div className={styles.optionLabel}>Send to Partnered Carrier</div>
             <div className={styles.optionDescription}>Choose from your trusted carrier partners</div>
           </button>
           <button
             type="button"
             className={`${styles.optionButton} ${selectedOption === 'marketplace' ? styles.selected : ''}`}
             onClick={() => setSelectedOption('marketplace')}
           >
             <div className={styles.optionIcon}>🌐</div>
             <div className={styles.optionLabel}>Post to Marketplace</div>
             <div className={styles.optionDescription}>Post job for verified carriers to accept</div>
           </button>
         </div>
         
                   {(selectedOption === 'carrier' || selectedOption === 'marketplace') && (
            <>
              <div className={styles.rateInput}>
                <label htmlFor="brokerRate">Broker Rate ($)</label>
                <input
                  type="number"
                  id="brokerRate"
                  value={brokerRate}
                  onChange={(e) => setBrokerRate(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className={styles.rateInput}>
                <label htmlFor="carrierRate">Carrier Rate ($)</label>
                <input
                  type="number"
                  id="carrierRate"
                  value={carrierRate}
                  onChange={(e) => setCarrierRate(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
            </>
          )}
         
         {!selectedOption && (
           <div className={styles.selectionHint}>
             Please select a delivery option to proceed.
           </div>
         )}
       </div>

                           <div className={styles.formActions}>
          <button type="button" onClick={onCancel} className={styles.cancelButton}>
            Cancel
          </button>
          <button type="button" onClick={() => setShowRateConfirmationPreview(true)} className={styles.previewButton}>
            View Rate Confirmation Page
          </button>
          <button type="button" onClick={generateShipperPDF} className={styles.pdfButton}>
            Generate Shipper Invoice
          </button>
          <button type="submit" className={styles.submitButton}>
            {initialData ? 'Update Purchase Order' : 
             selectedOption === 'marketplace' ? 'Post Job to Marketplace' : 
             selectedOption === 'carrier' ? 'Send to Partnered Carrier' : 
             'Create Purchase Order'}
          </button>
               </div>
     </form>

     {/* Rate Confirmation Preview Component */}
     {showRateConfirmationPreview && (
       <RateConfirmationPreview
         onClose={() => setShowRateConfirmationPreview(false)}
                   formData={{
            poNumber: poNumber || '',
            date: date || '',
            companyInfo: companyInfo || {},
            vendorInfo: vendorInfo || {},
            shipTo: shipTo || {},
            items: items || [],
            comments: comments || '',
            termsConditions: termsConditions || '',
            brokerRate: parseFloat(brokerRate) || 0,
            rate: parseFloat(carrierRate) || 0
          }}
       />
     )}
   </div>
 );
 };
