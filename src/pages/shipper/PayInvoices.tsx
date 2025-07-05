import React, { useState, useEffect } from 'react';
import styles from './PayInvoices.module.css';
import { useMobileOptimization } from '../../hooks/useMobileOptimization';
import { collection, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import Modal from 'react-modal';

interface Invoice {
  id: string;
  invoiceNumber: string;
  carrier: string;
  amount: number;
  dueDate: string;
  status: 'Paid' | 'Pending' | 'Overdue';
  poNumber: string;
  issueDate: string;
  deliveryDate: string;
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

  useEffect(() => {
    const fetchInvoices = async () => {
      if (!user) return;
      const q = query(collection(db, 'invoices'), where('shipperId', '==', user.uid));
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
          deliveryDate: d.deliveryDate || ''
        };
      });
      setInvoices(data);
    };
    fetchInvoices();
  }, [user]);

  const normalizeStatus = (invoice: Invoice) => {
    if (invoice.status === 'Paid') return 'Paid';
    const issue = new Date(invoice.issueDate);
    const now = new Date();
    const days = (now.getTime() - issue.getTime()) / (1000 * 60 * 60 * 24);
    if (days > 30) return 'Past Due';
    return 'Unpaid';
  };

  const filteredInvoices = invoices.filter(invoice => {
    const status = normalizeStatus(invoice).toLowerCase();
    const matchesTab = activeTab === 'all' || status === activeTab;
    const matchesSearch = 
      invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.carrier.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.poNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDate = !dateFilter || invoice.issueDate === dateFilter;
    
    return matchesTab && matchesSearch && matchesDate;
  });

  // Calculate total pending payments as the sum of all invoices with normalized status 'Unpaid'
  const totalPending = invoices
    .filter(inv => normalizeStatus(inv) === 'Unpaid')
    .reduce((sum, inv) => sum + inv.amount, 0);

  // SVG for download icon
  const DownloadIcon = () => (
    <svg width="70%" height="70%" viewBox="0 0 20 20" fill="none" style={{ display: 'block' }} xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="10" r="9" stroke="black" strokeWidth="2" fill="none"/>
      <path d="M10 5V13" stroke="black" strokeWidth="2" strokeLinecap="round"/>
      <path d="M7 10L10 13L13 10" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const handlePayNow = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowPayModal(true);
    setPaymentMethod(null);
    setCheckNumber('');
    setSignature('');
    setShowPrintArea(false);
  };

  const handlePrint = () => {
    setShowPrintArea(true);
    setTimeout(() => {
      window.print();
      setShowPrintArea(false);
    }, 100);
  };

  // Helper to update invoice status in Firestore and local state
  const markInvoicePaid = async (invoice: Invoice) => {
    // Update Firestore
    await updateDoc(doc(db, 'invoices', invoice.id), { status: 'Paid' });
    // Update local state
    setInvoices(prev => prev.map(inv => inv.id === invoice.id ? { ...inv, status: 'Paid' } : inv));
  };

  // Mobile card component for invoices
  const renderMobileInvoiceCard = (invoice: Invoice) => (
    <div key={invoice.id} className={styles.mobileInvoiceCard}>
      <div className={styles.cardHeader}>
        <div className={styles.invoiceNumber}>{invoice.invoiceNumber}</div>
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
        <button className={styles.viewButton}>View</button>
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
                      <button className={styles.viewButton}>View</button>
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
        {!paymentMethod ? (
          <div>
            <h2>Choose Payment Method</h2>
            <button onClick={() => setPaymentMethod('electronic')} className={styles.methodButton}>Electronic</button>
            <button onClick={() => setPaymentMethod('check')} className={styles.methodButton}>Check</button>
            <button onClick={() => setShowPayModal(false)} className={styles.cancelButton}>Cancel</button>
          </div>
        ) : paymentMethod === 'electronic' ? (
          <div>
            <h2>Pay Electronically</h2>
            <p>This will use your attached payment method (e.g., QuickBooks).</p>
            <p>Invoice: <b>{selectedInvoice?.invoiceNumber}</b></p>
            <p>Amount: <b>${selectedInvoice?.amount.toFixed(2)}</b></p>
            <button className={styles.confirmButton} onClick={async () => {
              if (selectedInvoice) await markInvoicePaid(selectedInvoice);
              setShowPayModal(false);
              alert('Payment processed via QuickBooks (simulated).');
            }}>Confirm Payment</button>
            <button onClick={() => setPaymentMethod(null)} className={styles.cancelButton}>Back</button>
          </div>
        ) : (
          <div>
            <h2>Pay by Check</h2>
            <p>Invoice: <b>{selectedInvoice?.invoiceNumber}</b></p>
            <p>Amount: <b>${selectedInvoice?.amount.toFixed(2)}</b></p>
            <label>
              Check Number:
              <input type="text" value={checkNumber} onChange={e => setCheckNumber(e.target.value)} className={styles.inputField} />
            </label>
            <label>
              Signature:
              <input type="text" value={signature} onChange={e => setSignature(e.target.value)} className={styles.inputField} placeholder="Type your name as signature" />
            </label>
            <button className={styles.printButton} onClick={async () => {
              handlePrint();
              if (selectedInvoice) await markInvoicePaid(selectedInvoice);
              setShowPayModal(false);
            }}>Print Paperwork</button>
            <button onClick={() => setPaymentMethod(null)} className={styles.cancelButton}>Back</button>
          </div>
        )}
      </Modal>

      {/* Print Area for Check Payment */}
      {showPrintArea && (
        <div className={styles.printArea}>
          <h2>Check Payment Authorization</h2>
          <p>Invoice Number: <b>{selectedInvoice?.invoiceNumber}</b></p>
          <p>Carrier: <b>{selectedInvoice?.carrier}</b></p>
          <p>Amount: <b>${selectedInvoice?.amount.toFixed(2)}</b></p>
          <p>Check Number: <b>{checkNumber}</b></p>
          <div style={{ margin: '40px 0 20px 0' }}>
            <span>Signature: </span>
            <span style={{ borderBottom: '1px solid #000', minWidth: 200, display: 'inline-block', padding: '0 40px' }}>{signature}</span>
          </div>
          <p>Date: {new Date().toLocaleDateString()}</p>
        </div>
      )}
    </div>
  );
};

export default PayInvoices; 