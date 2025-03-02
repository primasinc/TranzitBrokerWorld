import React, { useState } from 'react';
import styles from './Payments.module.css';
import DocumentModal from '../../components/DocumentModal';
import PaymentRequestModal from '../../components/PaymentRequestModal';
import FactorRequestModal from '../../components/FactorRequestModal';
import CancelPaymentRequestModal from '../../components/CancelPaymentRequestModal';

interface Payment {
  id: string;
  loadId: string;
  amount: number;
  status: 'Paid' | 'Pending' | 'Processing' | 'Requested' | 'Canceled';
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

type PaymentStatus = 'Pending' | 'Requested' | 'Paid' | 'Canceled' | 'Processing';

const Payments: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'payments' | 'invoices'>('payments');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [selectedLoadId, setSelectedLoadId] = useState<string>('');
  const [isPaymentRequestModalOpen, setIsPaymentRequestModalOpen] = useState(false);
  const [isFactorRequestModalOpen, setIsFactorRequestModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [isCancelPaymentModalOpen, setIsCancelPaymentModalOpen] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([
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
  ]);

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
    setSelectedPayment(payment);
    setIsPaymentRequestModalOpen(true);
  };

  const handleFactorRequest = (payment: Payment) => {
    setSelectedPayment(payment);
    setIsFactorRequestModalOpen(true);
  };

  const handleCancelPaymentRequest = (payment: Payment) => {
    setSelectedPayment(payment);
    setIsCancelPaymentModalOpen(true);
  };

  const confirmCancelPaymentRequest = async () => {
    if (!selectedPayment) return;
    
    try {
      console.log('Canceling payment request for load:', selectedPayment.loadId);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setPayments(payments.map(p => 
        p.id === selectedPayment.id 
          ? { ...p, status: 'Canceled' as PaymentStatus } 
          : p
      ));
      
      alert('Payment request canceled successfully');
    } catch (error) {
      console.error('Error canceling payment request:', error);
      throw error;
    }
  };

  const handlePaymentRequestSubmitted = () => {
    if (!selectedPayment) return;
    
    setPayments(payments.map(p => 
      p.id === selectedPayment.id 
        ? { ...p, status: 'Requested' as PaymentStatus } 
        : p
    ));
  };

  const renderActionButtons = (payment: Payment) => {
    if (payment.status === 'Requested') {
      return (
        <div className={styles.actionButtons}>
          <button 
            className={`${styles.actionButton} ${styles.cancelButton}`}
            onClick={() => handleCancelPaymentRequest(payment)}
          >
            Cancel Request
          </button>
        </div>
      );
    }
    
    return (
      <div className={styles.actionButtons}>
        <button 
          className={`${styles.actionButton} ${styles.documentButton}`}
          onClick={() => handleDocuments(payment)}
        >
          Documents
        </button>
        <button 
          className={`${styles.actionButton} ${styles.paymentButton}`}
          onClick={() => handlePaymentRequest(payment)}
          disabled={payment.status === 'Canceled'}
        >
          Payment Request
        </button>
        <button 
          className={`${styles.actionButton} ${styles.factorButton}`}
          onClick={() => handleFactorRequest(payment)}
          disabled={payment.status === 'Canceled'}
        >
          Factor Request
        </button>
      </div>
    );
  };

  const renderPaymentStatus = (status: PaymentStatus) => {
    switch (status) {
      case 'Pending':
        return <span className={styles.statusPending}>Pending</span>;
      case 'Requested':
        return <span className={styles.statusRequested}>Requested</span>;
      case 'Paid':
        return <span className={styles.statusPaid}>Paid</span>;
      case 'Canceled':
        return <span className={styles.statusCanceled}>Canceled</span>;
      case 'Processing':
        return <span className={styles.statusProcessing}>Processing</span>;
      default:
        return null;
    }
  };

  const renderPaymentRow = (payment: Payment) => (
    <tr key={payment.id} className={payment.status === 'Canceled' ? styles.canceledRow : ''}>
      <td>{payment.loadId}</td>
      <td>{payment.date}</td>
      <td>{payment.customer}</td>
      <td>${payment.amount.toFixed(2)}</td>
      <td>{renderPaymentStatus(payment.status)}</td>
      <td>{renderActionButtons(payment)}</td>
    </tr>
  );

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
              {payments.map((payment) => renderPaymentRow(payment))}
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
      
      {selectedPayment && (
        <>
          <PaymentRequestModal
            isOpen={isPaymentRequestModalOpen}
            onClose={() => setIsPaymentRequestModalOpen(false)}
            loadId={selectedPayment.loadId}
            amount={selectedPayment.amount}
            customer={selectedPayment.customer}
          />
          
          <FactorRequestModal
            isOpen={isFactorRequestModalOpen}
            onClose={() => setIsFactorRequestModalOpen(false)}
            loadId={selectedPayment.loadId}
            amount={selectedPayment.amount}
            customer={selectedPayment.customer}
          />
        </>
      )}
    </div>
  );
};

export default Payments; 