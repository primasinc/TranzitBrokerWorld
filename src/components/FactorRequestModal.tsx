import React, { useState } from 'react';
import styles from './FactorRequestModal.module.css';

interface FactorRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  loadId: string;
  amount: number;
  customer: string;
}

const FactorRequestModal: React.FC<FactorRequestModalProps> = ({ 
  isOpen, 
  onClose, 
  loadId, 
  amount,
  customer
}) => {
  const [factorType, setFactorType] = useState<'external' | 'platform'>('platform');
  const [companyName, setCompanyName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Calculate factoring fee (1-3% based on platform factoring)
  const factoringFee = factorType === 'platform' ? amount * 0.02 : 0; // 2% default
  const amountAfterFee = amount - factoringFee;

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      // TODO: Implement API call to submit factoring request
      console.log('Submitting factoring request:', {
        loadId,
        amount,
        factorType,
        companyName: factorType === 'external' ? companyName : 'Tranzit Factoring',
        contactEmail: factorType === 'external' ? contactEmail : '',
        factoringFee: factorType === 'platform' ? factoringFee : 0
      });
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      onClose();
    } catch (error) {
      console.error('Error submitting factoring request:', error);
      alert('Error submitting factoring request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <h2>Factor This Load</h2>
        
        <div className={styles.content}>
          <div className={styles.loadInfo}>
            <p><strong>Load ID:</strong> {loadId}</p>
            <p><strong>Customer:</strong> {customer}</p>
            <p><strong>Amount:</strong> ${amount.toFixed(2)}</p>
          </div>
          
          <div className={styles.factorOptions}>
            <h3>Factoring Options</h3>
            
            <div className={styles.optionSelector}>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="factorType"
                  checked={factorType === 'platform'}
                  onChange={() => setFactorType('platform')}
                />
                <span>Factor through Tranzit (2% fee)</span>
              </label>
              
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="factorType"
                  checked={factorType === 'external'}
                  onChange={() => setFactorType('external')}
                />
                <span>Use external factoring company</span>
              </label>
            </div>
            
            {factorType === 'platform' && (
              <div className={styles.platformInfo}>
                <p>Factoring Fee: ${factoringFee.toFixed(2)}</p>
                <p>Amount You'll Receive: ${amountAfterFee.toFixed(2)}</p>
                <p>Typical payout time: 24-48 hours</p>
              </div>
            )}
            
            {factorType === 'external' && (
              <div className={styles.externalForm}>
                <div className={styles.formGroup}>
                  <label htmlFor="companyName">Factoring Company Name:</label>
                  <input
                    id="companyName"
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Enter factoring company name"
                  />
                </div>
                
                <div className={styles.formGroup}>
                  <label htmlFor="contactEmail">Contact Email:</label>
                  <input
                    id="contactEmail"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="Enter contact email"
                  />
                </div>
              </div>
            )}
          </div>
          
          <div className={styles.actions}>
            <button 
              onClick={onClose} 
              className={styles.cancelButton}
              disabled={submitting}
            >
              Cancel
            </button>
            <button 
              onClick={handleSubmit} 
              className={styles.submitButton}
              disabled={submitting || (factorType === 'external' && (!companyName || !contactEmail))}
            >
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FactorRequestModal; 