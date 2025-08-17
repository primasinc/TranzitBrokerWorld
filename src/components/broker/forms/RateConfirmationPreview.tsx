import React from 'react';
import styles from './RateConfirmationPreview.module.css';

interface RateConfirmationPreviewProps {
  onClose: () => void;
  formData?: any;
}

export const RateConfirmationPreview: React.FC<RateConfirmationPreviewProps> = ({
  onClose,
  formData
}) => {
  // Sample data for preview - in real use this would come from the PO form
  const previewData = {
    poNumber: formData?.poNumber || 'RC-20241217-001',
    date: formData?.date || new Date().toISOString().split('T')[0],
    companyInfo: formData?.companyInfo || {
      name: 'Sample Broker Company',
      streetAddress: '123 Business Street',
      cityStateZip: 'Chicago, IL 60601',
      contact: 'John Broker'
    },
    vendorInfo: formData?.vendorInfo || {
      name: 'Sample Vendor Company',
      streetAddress: '456 Vendor Avenue',
      cityStateZip: 'Los Angeles, CA 90210',
      contact: 'Jane Vendor'
    },
    shipTo: formData?.shipTo || {
      name: 'Sample Recipient',
      streetAddress: '789 Delivery Road',
      cityStateZip: 'New York, NY 10001',
      contact: 'Bob Recipient'
    },
    items: formData?.items || [
      {
        itemNumber: 'ITEM-001',
        description: 'Sample Product Description',
        quantity: 10,
        dimensions: '12" x 8" x 6"',
        weight: 5.5
      }
    ],
         comments: formData?.comments || 'Sample comments for the shipment',
     termsConditions: formData?.termsConditions || 'Standard terms and conditions apply',
     rate: formData?.rate || 1500.00
  };

  return (
    <div className={styles.previewOverlay}>
      <div className={styles.previewContainer}>
        <div className={styles.previewHeader}>
          <h2>Rate Confirmation Preview</h2>
          <button onClick={onClose} className={styles.closeButton}>×</button>
        </div>
        
        <div className={styles.previewContent}>
          {/* PDF-style form layout */}
          <div className={styles.pdfForm}>
            {/* Header */}
                         <div className={styles.formHeader}>
               <h1>RATE CONFIRMATION</h1>
               <div className={styles.headerInfo}>
                 <div className={styles.headerLeft}>
                   <div className={styles.infoRow}>
                     <label>PO Number:</label>
                     <span>{previewData.poNumber}</span>
                   </div>
                   <div className={styles.infoRow}>
                     <label>RC Number:</label>
                     <span>{`RC-${previewData.poNumber}`}</span>
                   </div>
                   <div className={styles.infoRow}>
                     <label>Date:</label>
                     <span>{previewData.date}</span>
                   </div>
                 </div>
               </div>
             </div>

            {/* Company Information */}
            <div className={styles.formSection}>
              <h3>Company Information</h3>
              <div className={styles.sectionContent}>
                                 <div className={styles.infoRow}>
                   <label>Company Name:</label>
                   <span>{previewData?.companyInfo?.name || 'N/A'}</span>
                 </div>
                 <div className={styles.infoRow}>
                   <label>Address:</label>
                   <span>{previewData?.companyInfo?.streetAddress || 'N/A'}</span>
                 </div>
                 <div className={styles.infoRow}>
                   <label>City, State, ZIP:</label>
                   <span>{previewData?.companyInfo?.cityStateZip || 'N/A'}</span>
                 </div>
                 <div className={styles.infoRow}>
                   <label>Contact:</label>
                   <span>{previewData?.companyInfo?.contact || 'N/A'}</span>
                 </div>
              </div>
            </div>

            {/* Carrier Information - NEW SECTION */}
            <div className={styles.formSection}>
              <h3>Carrier Information</h3>
              <div className={styles.sectionContent}>
                <div className={styles.infoRow}>
                  <label>Company Name:</label>
                  <span>_________________</span>
                </div>
                <div className={styles.infoRow}>
                  <label>Driver:</label>
                  <span>_________________</span>
                </div>
                <div className={styles.infoRow}>
                  <label>Contact Email:</label>
                  <span>_________________</span>
                </div>
                <div className={styles.infoRow}>
                  <label>Contact Number:</label>
                  <span>_________________</span>
                </div>
                <div className={styles.infoRow}>
                  <label>MC Number:</label>
                  <span>_________________</span>
                </div>
                <div className={styles.infoRow}>
                  <label>DOT Number:</label>
                  <span>_________________</span>
                </div>
              </div>
            </div>

            {/* Vendor Information */}
            <div className={styles.formSection}>
              <h3>Vendor Information</h3>
              <div className={styles.sectionContent}>
                                 <div className={styles.infoRow}>
                   <label>Vendor Name:</label>
                   <span>{previewData?.vendorInfo?.name || 'N/A'}</span>
                 </div>
                 <div className={styles.infoRow}>
                   <label>Address:</label>
                   <span>{previewData?.vendorInfo?.streetAddress || 'N/A'}</span>
                 </div>
                 <div className={styles.infoRow}>
                   <label>City, State, ZIP:</label>
                   <span>{previewData?.vendorInfo?.cityStateZip || 'N/A'}</span>
                 </div>
                 <div className={styles.infoRow}>
                   <label>Contact:</label>
                   <span>{previewData?.vendorInfo?.contact || 'N/A'}</span>
                 </div>
              </div>
            </div>

            {/* Ship To Information */}
            <div className={styles.formSection}>
              <h3>Ship To Information</h3>
              <div className={styles.sectionContent}>
                                 <div className={styles.infoRow}>
                   <label>Recipient Name:</label>
                   <span>{previewData?.shipTo?.name || 'N/A'}</span>
                 </div>
                 <div className={styles.infoRow}>
                   <label>Address:</label>
                   <span>{previewData?.shipTo?.streetAddress || 'N/A'}</span>
                 </div>
                 <div className={styles.infoRow}>
                   <label>City, State, ZIP:</label>
                   <span>{previewData?.shipTo?.cityStateZip || 'N/A'}</span>
                 </div>
                 <div className={styles.infoRow}>
                   <label>Contact:</label>
                   <span>{previewData?.shipTo?.contact || 'N/A'}</span>
                 </div>
              </div>
            </div>

            {/* Items - WITHOUT COST TOTALS */}
            <div className={styles.formSection}>
              <h3>Items</h3>
              <div className={styles.itemsTable}>
                <div className={styles.tableHeader}>
                  <div className={styles.headerCell}>Item #</div>
                  <div className={styles.headerCell}>Description</div>
                  <div className={styles.headerCell}>Quantity</div>
                  <div className={styles.headerCell}>Dimensions</div>
                  <div className={styles.headerCell}>Weight (lbs)</div>
                </div>
                                 {(previewData?.items || []).map((item: any, index: number) => (
                   <div key={index} className={styles.tableRow}>
                     <div className={styles.tableCell}>{item?.itemNumber || 'N/A'}</div>
                     <div className={styles.tableCell}>{item?.description || 'N/A'}</div>
                     <div className={styles.tableCell}>{item?.quantity || 'N/A'}</div>
                     <div className={styles.tableCell}>{item?.dimensions || 'N/A'}</div>
                     <div className={styles.tableCell}>{item?.weight || 'N/A'}</div>
                   </div>
                 ))}
              </div>
            </div>

                         {/* Additional Information */}
             <div className={styles.formSection}>
               <h3>Additional Information</h3>
               <div className={styles.sectionContent}>
                 <div className={styles.infoRow}>
                   <label>Additional Notes:</label>
                   <span>{previewData?.comments || 'None'}</span>
                 </div>
                 <div className={styles.infoRow}>
                   <label>Terms and Conditions:</label>
                   <span>{previewData?.termsConditions || 'Standard terms apply'}</span>
                 </div>
               </div>
             </div>

            {/* Summary - ONLY CARRIER RATE, NO ITEM COSTS */}
            <div className={styles.formSection}>
              <h3>Summary</h3>
              <div className={styles.sectionContent}>
                <div className={styles.summaryRow}>
                  <label>Carrier Rate:</label>
                                     <span className={styles.rateAmount}>${(previewData?.rate || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.previewFooter}>
          <p className={styles.previewNote}>
            This preview shows the exact layout of the Rate Confirmation form that will be sent to carriers.
            The form will be pre-filled with carrier information once they commit to the load.
          </p>
          <button onClick={onClose} className={styles.closePreviewButton}>
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
};
