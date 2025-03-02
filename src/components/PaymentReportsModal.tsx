import React, { useState } from 'react';
import styles from './PaymentReportsModal.module.css';

interface PaymentReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  payments: {
    id: string;
    loadId: string;
    date: string;
    customer: string;
    amount: number;
    status: string;
  }[];
}

const PaymentReportsModal: React.FC<PaymentReportsModalProps> = ({ 
  isOpen, 
  onClose, 
  payments 
}) => {
  const [reportType, setReportType] = useState<'all' | 'paid' | 'pending' | 'custom'>('all');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: ''
  });
  const [includeFields, setIncludeFields] = useState({
    loadId: true,
    date: true,
    customer: true,
    amount: true,
    status: true,
    origin: false,
    destination: false,
    miles: false
  });
  const [fileFormat, setFileFormat] = useState<'csv' | 'pdf'>('csv');
  const [generating, setGenerating] = useState(false);

  // Calculate report statistics
  const totalPayments = payments.length;
  const paidPayments = payments.filter(p => p.status === 'Paid').length;
  const pendingPayments = payments.filter(p => ['Pending', 'Requested', 'Processing'].includes(p.status)).length;
  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
  const paidAmount = payments.filter(p => p.status === 'Paid').reduce((sum, p) => sum + p.amount, 0);
  const pendingAmount = payments.filter(p => ['Pending', 'Requested', 'Processing'].includes(p.status)).reduce((sum, p) => sum + p.amount, 0);

  // Handle field toggle
  const toggleField = (field: keyof typeof includeFields) => {
    setIncludeFields(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  // Generate and download report
  const generateReport = async () => {
    try {
      setGenerating(true);
      
      // Filter payments based on report type
      let filteredPayments = [...payments];
      
      if (reportType === 'paid') {
        filteredPayments = filteredPayments.filter(p => p.status === 'Paid');
      } else if (reportType === 'pending') {
        filteredPayments = filteredPayments.filter(p => ['Pending', 'Requested', 'Processing'].includes(p.status));
      }
      
      // Apply date filter for custom reports
      if (reportType === 'custom') {
        if (dateRange.start) {
          const startDate = new Date(dateRange.start);
          filteredPayments = filteredPayments.filter(p => new Date(p.date) >= startDate);
        }
        
        if (dateRange.end) {
          const endDate = new Date(dateRange.end);
          endDate.setHours(23, 59, 59, 999); // End of day
          filteredPayments = filteredPayments.filter(p => new Date(p.date) <= endDate);
        }
      }
      
      // Generate CSV data
      if (fileFormat === 'csv') {
        // Determine headers based on included fields
        const headers = Object.entries(includeFields)
          .filter(([_, include]) => include)
          .map(([field]) => field);
        
        // Create CSV content
        let csvContent = headers.join(',') + '\n';
        
        filteredPayments.forEach(payment => {
          const row = headers.map(header => {
            if (header === 'amount') {
              return (payment[header as keyof typeof payment] as number).toFixed(2);
            }
            return payment[header as keyof typeof payment] || '';
          });
          csvContent += row.join(',') + '\n';
        });
        
        // Create download link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `payment_report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // For PDF, we'd typically use a library like jsPDF
        // This is a placeholder for PDF generation
        console.log('PDF generation would happen here');
        alert('PDF generation is not implemented in this demo');
      }
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setGenerating(false);
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Error generating report. Please try again.');
      setGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2>Generate Payment Report</h2>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>
        
        <div className={styles.content}>
          <div className={styles.reportStats}>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{totalPayments}</div>
              <div className={styles.statLabel}>Total Payments</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>${totalAmount.toFixed(2)}</div>
              <div className={styles.statLabel}>Total Amount</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{paidPayments}</div>
              <div className={styles.statLabel}>Paid Payments</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>${paidAmount.toFixed(2)}</div>
              <div className={styles.statLabel}>Paid Amount</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{pendingPayments}</div>
              <div className={styles.statLabel}>Pending Payments</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>${pendingAmount.toFixed(2)}</div>
              <div className={styles.statLabel}>Pending Amount</div>
            </div>
          </div>
          
          <div className={styles.reportOptions}>
            <div className={styles.optionSection}>
              <h3>Report Type</h3>
              <div className={styles.radioGroup}>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="reportType"
                    checked={reportType === 'all'}
                    onChange={() => setReportType('all')}
                  />
                  <span>All Payments</span>
                </label>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="reportType"
                    checked={reportType === 'paid'}
                    onChange={() => setReportType('paid')}
                  />
                  <span>Paid Payments Only</span>
                </label>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="reportType"
                    checked={reportType === 'pending'}
                    onChange={() => setReportType('pending')}
                  />
                  <span>Pending Payments Only</span>
                </label>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="reportType"
                    checked={reportType === 'custom'}
                    onChange={() => setReportType('custom')}
                  />
                  <span>Custom Date Range</span>
                </label>
              </div>
              
              {reportType === 'custom' && (
                <div className={styles.dateRangeContainer}>
                  <div className={styles.dateField}>
                    <label>Start Date:</label>
                    <input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    />
                  </div>
                  <div className={styles.dateField}>
                    <label>End Date:</label>
                    <input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    />
                  </div>
                </div>
              )}
            </div>
            
            <div className={styles.optionSection}>
              <h3>Include Fields</h3>
              <div className={styles.checkboxGroup}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={includeFields.loadId}
                    onChange={() => toggleField('loadId')}
                  />
                  <span>Load ID</span>
                </label>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={includeFields.date}
                    onChange={() => toggleField('date')}
                  />
                  <span>Date</span>
                </label>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={includeFields.customer}
                    onChange={() => toggleField('customer')}
                  />
                  <span>Customer</span>
                </label>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={includeFields.amount}
                    onChange={() => toggleField('amount')}
                  />
                  <span>Amount</span>
                </label>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={includeFields.status}
                    onChange={() => toggleField('status')}
                  />
                  <span>Status</span>
                </label>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={includeFields.origin}
                    onChange={() => toggleField('origin')}
                  />
                  <span>Origin</span>
                </label>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={includeFields.destination}
                    onChange={() => toggleField('destination')}
                  />
                  <span>Destination</span>
                </label>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={includeFields.miles}
                    onChange={() => toggleField('miles')}
                  />
                  <span>Miles</span>
                </label>
              </div>
            </div>
            
            <div className={styles.optionSection}>
              <h3>File Format</h3>
              <div className={styles.radioGroup}>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="fileFormat"
                    checked={fileFormat === 'csv'}
                    onChange={() => setFileFormat('csv')}
                  />
                  <span>CSV (Excel)</span>
                </label>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="fileFormat"
                    checked={fileFormat === 'pdf'}
                    onChange={() => setFileFormat('pdf')}
                  />
                  <span>PDF</span>
                </label>
              </div>
            </div>
          </div>
          
          <div className={styles.actions}>
            <button 
              onClick={onClose} 
              className={styles.cancelButton}
              disabled={generating}
            >
              Cancel
            </button>
            <button 
              onClick={generateReport} 
              className={styles.generateButton}
              disabled={generating}
            >
              {generating ? 'Generating...' : 'Generate Report'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentReportsModal; 