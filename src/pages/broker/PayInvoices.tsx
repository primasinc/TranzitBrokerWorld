import React, { useState, useEffect } from 'react';
import styles from './PayInvoices.module.css';
import { useMobileOptimization } from '../../hooks/useMobileOptimization';
import { collection, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import Modal from 'react-modal';
import InvoiceViewModal from '../../components/carrier/InvoiceViewModal';

interface Invoice {
  id: string;
  invoiceNumber: string;
  carrier: string;
  amount: number;
  dueDate: string;
  status: 'Paid' | 'Pending' | 'Overdue' | 'Unpaid';
  poNumber: string;
  issueDate: string;
  deliveryDate: string;
  // Additional fields for InvoiceViewModal compatibility
  carrierName?: string;
  carrierAddress?: string;
  carrierContact?: string;
  customer?: string;
  shipperAddress?: string;
  shipperCityState?: string;
  shipperContact?: string;
  jobDetails?: string;
  dateDelivered?: string;
  additionalInfo?: string;
  terms?: string;
  attachments?: Array<{ name: string; url: string }>;
}

const PayInvoices: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pending' | 'paid' | 'all'>('all');
  const [dateFilter, setDateFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const { user } = useAuth();

  // Mobile optimization
  const { 
    isLowBandwidth, 
    isLowBattery, 
    getOptimalPageSize, 
    shouldFetchData, 
    measurePerformance 
  } = useMobileOptimization({
    enableOfflineMode: true,
    enableLowBandwidthMode: true,
    enableBatteryOptimization: true
  });

  // Device detection for mobile layout
  const isMobile = window.innerWidth <= 768;

  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'electronic' | 'check' | null>(null);
  const [checkNumber, setCheckNumber] = useState('');
  const [signature, setSignature] = useState('');
  const [showPrintArea, setShowPrintArea] = useState(false);
  const [showInvoiceView, setShowInvoiceView] = useState(false);

  useEffect(() => {
    const fetchInvoices = async () => {
      if (!user) return;
      // Use brokerId for broker-specific invoice fetching
      const q = query(collection(db, 'invoices'), where('brokerId', '==', user.uid));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          invoiceNumber: d.invoiceNumber || '',
          carrier: d.carrierName || d.carrier || '',
          amount: d.amount || 0,
          dueDate: d.dueDate || '',
          status: (d.status || 'Pending').charAt(0).toUpperCase() + (d.status || 'Pending').slice(1),
          poNumber: d.poNumber || '',
          issueDate: d.issueDate || '',
          deliveryDate: d.deliveryDate || '',
          // Additional fields for InvoiceViewModal compatibility
          carrierName: d.carrierName || d.carrier || '',
          carrierAddress: d.carrierAddress || '',
          carrierContact: d.carrierContact || '',
          customer: d.customer || '',
          shipperAddress: d.shipperAddress || '',
          shipperCityState: d.shipperCityState || '',
          shipperContact: d.shipperContact || '',
          jobDetails: d.jobDetails || '',
          dateDelivered: d.dateDelivered || d.deliveryDate || '',
          additionalInfo: d.additionalInfo || '',
          terms: d.terms || '',
          attachments: d.attachments || []
        };
      });
      setInvoices(data);
    };
    fetchInvoices();
  }, [user]);

  const filteredInvoices = invoices.filter(invoice => {
    const matchesTab = activeTab === 'all' || 
      (activeTab === 'pending' && ['Pending', 'Unpaid'].includes(invoice.status)) ||
      (activeTab === 'paid' && invoice.status === 'Paid');
    
    const matchesSearch = invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.carrier.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.poNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDate = !dateFilter || invoice.dueDate === dateFilter;
    
    return matchesTab && matchesSearch && matchesDate;
  });

  const totalPending = invoices
    .filter(invoice => ['Pending', 'Unpaid'].includes(invoice.status))
    .reduce((sum, invoice) => sum + invoice.amount, 0);

  const normalizeStatus = (invoice: Invoice) => {
    if (invoice.status === 'Unpaid') return 'Pending';
    return invoice.status;
  };

  const handlePayNow = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowPayModal(true);
    setPaymentMethod(null);
    setCheckNumber('');
    setSignature('');
  };

  const handlePaymentSubmit = async () => {
    if (!selectedInvoice || !paymentMethod || !signature) return;

    try {
      // Update invoice status to paid
      const invoiceRef = doc(db, 'invoices', selectedInvoice.id);
      await updateDoc(invoiceRef, {
        status: 'Paid',
        paymentMethod: paymentMethod,
        checkNumber: paymentMethod === 'check' ? checkNumber : null,
        paidAt: new Date().toISOString(),
        signature: signature
      });

      // Update local state
      setInvoices(invoices.map(inv => 
        inv.id === selectedInvoice.id 
          ? { ...inv, status: 'Paid' as const }
          : inv
      ));

      setShowPayModal(false);
      alert('Payment processed successfully!');
    } catch (error) {
      console.error('Error processing payment:', error);
      alert('Failed to process payment. Please try again.');
    }
  };

  const handlePrint = () => {
    setShowPrintArea(true);
    setTimeout(() => {
      window.print();
      setShowPrintArea(false);
    }, 100);
  };

  // Download icon component
  const DownloadIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7,10 12,15 17,10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  );

  // Mobile invoice card renderer
  const renderMobileInvoiceCard = (invoice: Invoice) => (
    <div key={invoice.id} className={styles.mobileInvoiceCard}>
      <div className={styles.cardHeader}>
        <h3>Invoice #{invoice.invoiceNumber}</h3>
        <span className={`${styles.status} ${styles[normalizeStatus(invoice).toLowerCase().replace(' ', '')]}`}>
          {normalizeStatus(invoice)}
        </span>
      </div>
      
      <div className={styles.cardContent}>
        <div className={styles.cardRow}>
          <span className={styles.label}>Carrier:</span>
          <span className={styles.value}>{invoice.carrier}</span>
        </div>
        <div className={styles.cardRow}>
          <span className={styles.label}>Amount:</span>
          <span className={styles.value}>${invoice.amount.toFixed(2)}</span>
        </div>
        <div className={styles.cardRow}>
          <span className={styles.label}>PO Number:</span>
          <span className={styles.value}>{invoice.poNumber}</span>
        </div>
        <div className={styles.cardRow}>
          <span className={styles.label}>Issue Date:</span>
          <span className={styles.value}>{invoice.issueDate}</span>
        </div>
        <div className={styles.cardRow}>
          <span className={styles.label}>Due Date:</span>
          <span className={styles.value}>{invoice.dueDate}</span>
        </div>
      </div>
      
      <div className={styles.cardActions}>
        <button className={styles.viewButton} onClick={() => { setSelectedInvoice(invoice); setShowInvoiceView(true); }}>View</button>
        {['Pending', 'Unpaid'].includes(invoice.status) && (
          <button className={styles.payButton} onClick={() => handlePayNow(invoice)}>Pay Now</button>
        )}
        <button
          className={styles.downloadButton}
          style={{
            background: 'transparent',
            border: 'none',
            boxShadow: 'none',
            padding: 0,
            height: '36px',
            width: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Download Invoice"
          onClick={() => downloadInvoiceCSV(invoice)}
        >
          <DownloadIcon />
        </button>
      </div>
    </div>
  );

  // Utility function to download a single invoice as CSV
  function downloadInvoiceCSV(invoice: Invoice) {
    const headers = [
      'Invoice Number', 'Carrier', 'Amount', 'Issue Date', 'Due Date', 'Status', 'PO Number', 'Delivery Date'
    ];
    const values = [
      invoice.invoiceNumber,
      invoice.carrier,
      invoice.amount,
      invoice.issueDate,
      invoice.dueDate,
      invoice.status,
      invoice.poNumber,
      invoice.deliveryDate
    ];
    const csvContent = `${headers.join(',')}
${values.map(v => `"${v ?? ''}"`).join(',')}`;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice_${invoice.invoiceNumber}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Pay/Invoices</h1>
        <div className={styles.summary}>
          <div className={styles.summaryCard}>
            <h3>Pending Payments</h3>
            <p className={styles.amount}>${totalPending.toFixed(2)}</p>
          </div>
        </div>
      </div>

      <div className={styles.filters}>
        <div className={styles.tabs}>
          <button 
            className={`${styles.tab} ${activeTab === 'all' ? styles.active : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All Invoices
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'pending' ? styles.active : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            Pending
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'paid' ? styles.active : ''}`}
            onClick={() => setActiveTab('paid')}
          >
            Paid
          </button>
        </div>

        <div className={styles.searchFilters}>
          <input
            type="text"
            placeholder="Search invoices..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className={styles.dateFilter}
          />
        </div>
      </div>

      {/* Mobile Cards View */}
      {isMobile ? (
        <div className={styles.mobileInvoicesGrid}>
          {filteredInvoices.length > 0 ? (
            filteredInvoices.map(renderMobileInvoiceCard)
          ) : (
            <div className={styles.noInvoices}>
              <p>No invoices match your filters.</p>
            </div>
          )}
        </div>
      ) : (
        /* Desktop Table View */
        <div className={styles.invoicesTable}>
          <table>
            <thead>
              <tr>
                <th>Invoice Number</th>
                <th>Carrier</th>
                <th>Amount</th>
                <th>Issue Date</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>PO Number</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td>{invoice.invoiceNumber}</td>
                  <td>{invoice.carrier}</td>
                  <td>${invoice.amount.toFixed(2)}</td>
                  <td>{invoice.issueDate}</td>
                  <td>{invoice.dueDate}</td>
                  <td>
                    <span className={`${styles.status} ${styles[normalizeStatus(invoice).toLowerCase().replace(' ', '')]}`}>{normalizeStatus(invoice)}</span>
                  </td>
                  <td>{invoice.poNumber}</td>
                  <td>
                    <div className={styles.actions}>
                      <button className={styles.viewButton} onClick={() => { setSelectedInvoice(invoice); setShowInvoiceView(true); }}>View</button>
                      {['Pending', 'Unpaid'].includes(invoice.status) && (
                        <button className={styles.payButton} onClick={() => handlePayNow(invoice)}>Pay Now</button>
                      )}
                      <button
                        className={styles.downloadButton}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          boxShadow: 'none',
                          padding: 0,
                          height: '36px',
                          width: '36px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        title="Download Invoice"
                        onClick={() => downloadInvoiceCSV(invoice)}
                      >
                        <DownloadIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Mobile performance indicator */}
      {(isLowBandwidth || isLowBattery) && (
        <div className={styles.performanceIndicator}>
          {isLowBandwidth && <span>📶 Slow connection - Optimized loading</span>}
          {isLowBattery && <span>🔋 Low battery - Reduced animations</span>}
        </div>
      )}

      {/* Payment Modal */}
      <Modal
        isOpen={showPayModal}
        onRequestClose={() => setShowPayModal(false)}
        contentLabel="Pay Invoice"
        ariaHideApp={false}
        className={styles.payModal}
        overlayClassName={styles.modalOverlay}
      >
        <div className={styles.modalHeader}>
          <h2>Process Payment</h2>
          <button 
            className={styles.closeButton}
            onClick={() => setShowPayModal(false)}
          >
            ×
          </button>
        </div>
        
        <div className={styles.modalContent}>
          {selectedInvoice && (
            <div className={styles.paymentDetails}>
              <h3>Invoice #{selectedInvoice.invoiceNumber}</h3>
              <p><strong>Carrier:</strong> {selectedInvoice.carrierName || selectedInvoice.carrier}</p>
              <p><strong>Amount:</strong> ${selectedInvoice.amount.toLocaleString()}</p>
              <p><strong>Due Date:</strong> {selectedInvoice.dueDate}</p>
            </div>
          )}

          <div className={styles.paymentMethod}>
            <h4>Payment Method</h4>
            <div className={styles.methodOptions}>
              <label>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="electronic"
                  checked={paymentMethod === 'electronic'}
                  onChange={() => setPaymentMethod('electronic')}
                />
                Electronic Transfer
              </label>
              <label>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="check"
                  checked={paymentMethod === 'check'}
                  onChange={() => setPaymentMethod('check')}
                />
                Check
              </label>
            </div>

            {paymentMethod === 'check' && (
              <div className={styles.checkDetails}>
                <input
                  type="text"
                  placeholder="Check Number"
                  value={checkNumber}
                  onChange={(e) => setCheckNumber(e.target.value)}
                  className={styles.checkInput}
                />
              </div>
            )}
          </div>

          <div className={styles.signatureSection}>
            <h4>Digital Signature</h4>
            <input
              type="text"
              placeholder="Type your name to sign"
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              className={styles.signatureInput}
            />
          </div>

          <div className={styles.modalActions}>
            <button 
              className={styles.submitButton}
              onClick={handlePaymentSubmit}
              disabled={!paymentMethod || !signature}
            >
              Process Payment
            </button>
            <button 
              className={styles.printButton}
              onClick={handlePrint}
              disabled={!paymentMethod || !signature}
            >
              Print Authorization
            </button>
            <button 
              className={styles.cancelButton}
              onClick={() => setShowPayModal(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* Print Area for Authorization */}
      {showPrintArea && selectedInvoice && (
        <div className={styles.printArea}>
          {/* Header */}
          <div style={{
            textAlign: 'center',
            marginBottom: '40px',
            borderBottom: '2px solid #1e3c72',
            paddingBottom: '20px'
          }}>
            <h1 style={{
              margin: '0 0 10px 0',
              fontSize: '32px',
              fontWeight: '700',
              color: '#1e3c72'
            }}>
              PAYMENT AUTHORIZATION
            </h1>
            <p style={{
              margin: '0',
              fontSize: '16px',
              color: '#666'
            }}>
              Tranzit.io Freight Platform
            </p>
          </div>

          {/* Invoice Details */}
          <div style={{
            border: '2px solid #1e3c72',
            borderRadius: '8px',
            padding: '30px',
            marginBottom: '40px',
            background: 'white'
          }}>
            <h3 style={{
              margin: '0 0 20px 0',
              fontSize: '20px',
              fontWeight: '600',
              color: '#1e3c72'
            }}>
              INVOICE DETAILS
            </h3>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '20px',
              marginBottom: '20px'
            }}>
              <div>
                <strong>Invoice Number:</strong> {selectedInvoice.invoiceNumber}
              </div>
              <div>
                <strong>PO Number:</strong> {selectedInvoice.poNumber}
              </div>
              <div>
                <strong>Carrier:</strong> {selectedInvoice.carrierName || selectedInvoice.carrier}
              </div>
              <div>
                <strong>Amount:</strong> ${selectedInvoice.amount.toFixed(2)}
              </div>
              <div>
                <strong>Issue Date:</strong> {selectedInvoice.issueDate}
              </div>
              <div>
                <strong>Due Date:</strong> {selectedInvoice.dueDate}
              </div>
            </div>
          </div>

          {/* Authorization Section */}
          <div style={{
            border: '2px solid #1e3c72',
            borderRadius: '8px',
            padding: '30px',
            marginBottom: '40px',
            background: 'white'
          }}>
            <h3 style={{
              margin: '0 0 20px 0',
              fontSize: '20px',
              fontWeight: '600',
              color: '#1e3c72',
              textAlign: 'center'
            }}>
              AUTHORIZATION
            </h3>
            
            <div style={{ marginBottom: '30px' }}>
              <p style={{ margin: '0 0 15px 0', fontSize: '14px', lineHeight: '1.6' }}>
                I hereby authorize the payment of <strong>${selectedInvoice?.amount.toFixed(2)}</strong> to <strong>{selectedInvoice?.carrierName || selectedInvoice?.carrier}</strong> 
                for invoice <strong>{selectedInvoice?.invoiceNumber}</strong> via check number <strong>{checkNumber}</strong>.
              </p>
              <p style={{ margin: '0', fontSize: '14px', lineHeight: '1.6' }}>
                This payment authorization is valid for the above specified amount and invoice only.
              </p>
            </div>

            {/* Signature Section */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '40px',
              marginTop: '40px'
            }}>
              <div>
                <div style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase', fontWeight: '600', marginBottom: '8px' }}>
                  Authorized Signature
                </div>
                <div style={{
                  borderBottom: '2px solid #333',
                  minHeight: '60px',
                  display: 'flex',
                  alignItems: 'flex-end',
                  paddingBottom: '8px'
                }}>
                  <span style={{ fontSize: '16px', fontWeight: '500' }}>{signature}</span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase', fontWeight: '600', marginBottom: '8px' }}>
                  Date
                </div>
                <div style={{
                  borderBottom: '2px solid #333',
                  minHeight: '60px',
                  display: 'flex',
                  alignItems: 'flex-end',
                  paddingBottom: '8px'
                }}>
                  <span style={{ fontSize: '16px', fontWeight: '500' }}>
                    {new Date().toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            borderTop: '2px solid #e9ecef',
            paddingTop: '20px',
            textAlign: 'center',
            color: '#666',
            fontSize: '12px'
          }}>
            <p style={{ margin: '0 0 8px 0' }}>
              This document serves as official authorization for the above payment
            </p>
            <p style={{ margin: '0' }}>
              Generated by Tranzit.io Freight Platform • {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>
      )}

      {showInvoiceView && selectedInvoice && (
        <InvoiceViewModal
          isOpen={showInvoiceView}
          onClose={() => setShowInvoiceView(false)}
          invoice={selectedInvoice}
        />
      )}
    </div>
  );
};

export default PayInvoices;
