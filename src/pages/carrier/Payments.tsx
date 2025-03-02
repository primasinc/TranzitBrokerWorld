import React, { useState } from 'react';
import styles from './Payments.module.css';
import DocumentModal from '../../components/DocumentModal';

interface Payment {
  id: string;
  loadId: string;
  amount: number;
  status: 'Paid' | 'Pending' | 'Processing';
  date: string;
  method: string;
  reference: string;
  customer: string;
  documentCount?: number;
  factoring?: {
    status: 'available' | 'requested' | 'approved' | 'processing';
    rate?: number;
  };
  paymentRequest?: {
    status: 'not_requested' | 'pending' | 'approved' | 'rejected';
    requestDate?: string;
  };
}

interface Invoice {
  id: string;
  loadId: string;
  amount: number;
  status: 'Paid' | 'Unpaid' | 'Overdue';
  dueDate: string;
  issueDate: string;
  customer: string;
}

const Payments: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'payments' | 'invoices'>('payments');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [selectedLoadId, setSelectedLoadId] = useState<string>('');

  const payments: Payment[] = [
    {
      id: "PAY001",
      loadId: "L123",
      amount: 2500.00,
      status: "Paid",
      date: "2024-02-20",
      method: "Direct Deposit",
      reference: "REF123456",
      customer: "ABC Manufacturing"
    },
    {
      id: "PAY002",
      loadId: "L124",
      amount: 1800.00,
      status: "Processing",
      date: "2024-02-22",
      method: "ACH Transfer",
      reference: "REF123457",
      customer: "XYZ Corp"
    },
    // Add more payments
  ];

  const invoices: Invoice[] = [
    {
      id: "INV001",
      loadId: "L123",
      amount: 2500.00,
      status: "Paid",
      dueDate: "2024-02-28",
      issueDate: "2024-02-14",
      customer: "ABC Manufacturing"
    },
    {
      id: "INV002",
      loadId: "L124",
      amount: 1800.00,
      status: "Unpaid",
      dueDate: "2024-03-07",
      issueDate: "2024-02-21",
      customer: "XYZ Corp"
    },
    // Add more invoices
  ];

  const totalEarnings = payments
    .filter(p => p.status === 'Paid')
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingPayments = payments
    .filter(p => p.status === 'Pending' || p.status === 'Processing')
    .reduce((sum, p) => sum + p.amount, 0);

  const handleDocuments = (payment: Payment) => {
    setSelectedLoadId(payment.loadId);
    setIsDocumentModalOpen(true);
  };

  const handlePaymentRequest = (payment: Payment) => {
    // TODO: Implement direct payment request to shipper
    console.log('Requesting direct payment for load:', payment.loadId);
  };

  const handleFactorRequest = (payment: Payment) => {
    // TODO: Implement factoring request
    console.log('Requesting factoring for load:', payment.loadId);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Payments & Invoices</h1>
      </div>

      <div className={styles.summaryCards}>
        <div className={styles.summaryCard}>
          <h3>Total Earnings</h3>
          <p className={styles.amount}>${totalEarnings.toFixed(2)}</p>
          <span className={styles.period}>This Month</span>
        </div>
        <div className={styles.summaryCard}>
          <h3>Pending Payments</h3>
          <p className={styles.amount}>${pendingPayments.toFixed(2)}</p>
          <span className={styles.period}>To be processed</span>
        </div>
      </div>

      <div className={styles.controls}>
        <div className={styles.tabs}>
          <button 
            className={`${styles.tab} ${activeTab === 'payments' ? styles.active : ''}`}
            onClick={() => setActiveTab('payments')}
          >
            Payments
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'invoices' ? styles.active : ''}`}
            onClick={() => setActiveTab('invoices')}
          >
            Invoices
          </button>
        </div>

        <div className={styles.filters}>
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
          <div className={styles.dateFilters}>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className={styles.dateInput}
            />
            <span>to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className={styles.dateInput}
            />
          </div>
        </div>
      </div>

      {activeTab === 'payments' ? (
        <div className={styles.table}>
          <table>
            <thead>
              <tr>
                <th>Payment Date</th>
                <th>Load ID</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Reference</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td>{payment.date}</td>
                  <td>{payment.loadId}</td>
                  <td>{payment.customer}</td>
                  <td>${payment.amount.toFixed(2)}</td>
                  <td>{payment.method}</td>
                  <td>{payment.reference}</td>
                  <td>
                    <span className={`${styles.status} ${styles[payment.status.toLowerCase()]}`}>
                      {payment.status}
                    </span>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button 
                        className={`${styles.actionButton} ${styles.documentsButton}`}
                        onClick={() => handleDocuments(payment)}
                      >
                        Documents
                      </button>
                      <button 
                        className={`${styles.actionButton} ${styles.paymentButton}`}
                        onClick={() => handlePaymentRequest(payment)}
                        disabled={payment.status === 'Paid'}
                      >
                        Payment Request
                      </button>
                      <button 
                        className={`${styles.actionButton} ${styles.factorButton}`}
                        onClick={() => handleFactorRequest(payment)}
                        disabled={payment.status === 'Paid' || payment.factoring?.status === 'processing'}
                      >
                        Factor Request
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={styles.table}>
          <table>
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Load ID</th>
                <th>Customer</th>
                <th>Issue Date</th>
                <th>Due Date</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td>{invoice.id}</td>
                  <td>{invoice.loadId}</td>
                  <td>{invoice.customer}</td>
                  <td>{invoice.issueDate}</td>
                  <td>{invoice.dueDate}</td>
                  <td>${invoice.amount.toFixed(2)}</td>
                  <td>
                    <span className={`${styles.status} ${styles[invoice.status.toLowerCase()]}`}>
                      {invoice.status}
                    </span>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button className={styles.viewButton}>View</button>
                      <button className={styles.downloadButton}>Download</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <DocumentModal
        isOpen={isDocumentModalOpen}
        onClose={() => setIsDocumentModalOpen(false)}
        loadId={selectedLoadId}
      />
    </div>
  );
};

export default Payments; 