import React, { useState, useEffect } from 'react';
import styles from './PayInvoices.module.css';
import { useMobileOptimization } from '../../hooks/useMobileOptimization';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';

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

  const filteredInvoices = invoices.filter(invoice => {
    const matchesTab = activeTab === 'all' || invoice.status.toLowerCase() === activeTab;
    const matchesSearch = 
      invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.carrier.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.poNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDate = !dateFilter || invoice.issueDate === dateFilter;
    
    return matchesTab && matchesSearch && matchesDate;
  });

  const totalPending = invoices
    .filter(inv => inv.status === 'Pending')
    .reduce((sum, inv) => sum + inv.amount, 0);

  // Mobile card component for invoices
  const renderMobileInvoiceCard = (invoice: Invoice) => (
    <div key={invoice.id} className={styles.mobileInvoiceCard}>
      <div className={styles.cardHeader}>
        <div className={styles.invoiceNumber}>{invoice.invoiceNumber}</div>
        <span className={`${styles.status} ${styles[invoice.status.toLowerCase()]}`}>
          {invoice.status}
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
        {invoice.status === 'Pending' && (
          <button className={styles.payButton}>Pay Now</button>
        )}
        <button className={styles.downloadButton}>Download</button>
      </div>
    </div>
  );

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
                    <span className={`${styles.status} ${styles[invoice.status.toLowerCase()]}`}>
                      {invoice.status}
                    </span>
                  </td>
                  <td>{invoice.poNumber}</td>
                  <td>
                    <div className={styles.actions}>
                      <button className={styles.viewButton}>View</button>
                      {invoice.status === 'Pending' && (
                        <button className={styles.payButton}>Pay Now</button>
                      )}
                      <button className={styles.downloadButton}>Download</button>
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
    </div>
  );
};

export default PayInvoices; 