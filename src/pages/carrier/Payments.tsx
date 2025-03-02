import React, { useState, useEffect } from 'react';
import styles from './Payments.module.css';
import DocumentModal from '../../components/DocumentModal';
import PaymentRequestModal from '../../components/PaymentRequestModal';
import FactorRequestModal from '../../components/FactorRequestModal';
import CancelPaymentRequestModal from '../../components/CancelPaymentRequestModal';
import PaymentDetailsModal from '../../components/PaymentDetailsModal';

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

type PaymentEventType = 'created' | 'requested' | 'canceled' | 'processing' | 'paid';

type PaymentEvent = {
  id: string;
  date: string;
  type: PaymentEventType;
  description: string;
  user?: string;
};

interface PaymentWithHistory extends Payment {
  origin?: string;
  destination?: string;
  miles?: number;
  rate?: number;
  notes?: string;
  history: PaymentEvent[];
}

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

  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'All'>('All');
  const [dateFilter, setDateFilter] = useState<{ start: string; end: string }>({
    start: '',
    end: ''
  });
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Payment;
    direction: 'ascending' | 'descending';
  }>({
    key: 'date',
    direction: 'descending'
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isPaymentDetailsModalOpen, setIsPaymentDetailsModalOpen] = useState(false);
  const [selectedPaymentDetails, setSelectedPaymentDetails] = useState<PaymentWithHistory | null>(null);

  useEffect(() => {
    let result = [...payments];
    
    if (statusFilter !== 'All') {
      result = result.filter(payment => payment.status === statusFilter);
    }
    
    if (dateFilter.start) {
      const startDate = new Date(dateFilter.start);
      result = result.filter(payment => new Date(payment.date) >= startDate);
    }
    
    if (dateFilter.end) {
      const endDate = new Date(dateFilter.end);
      endDate.setHours(23, 59, 59, 999);
      result = result.filter(payment => new Date(payment.date) <= endDate);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(payment => 
        payment.loadId.toLowerCase().includes(query) ||
        payment.customer.toLowerCase().includes(query)
      );
    }
    
    result.sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'ascending'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'ascending'
          ? aValue - bValue
          : bValue - aValue;
      }
      
      if (sortConfig.key === 'date') {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return sortConfig.direction === 'ascending'
          ? dateA.getTime() - dateB.getTime()
          : dateB.getTime() - dateA.getTime();
      }
      
      return 0;
    });
    
    setFilteredPayments(result);
  }, [payments, statusFilter, dateFilter, sortConfig, searchQuery]);

  const handleSort = (key: keyof Payment) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'ascending' 
        ? 'descending' 
        : 'ascending'
    }));
  };

  const clearFilters = () => {
    setStatusFilter('All');
    setDateFilter({ start: '', end: '' });
    setSearchQuery('');
  };

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

  const handleViewPaymentDetails = (payment: Payment) => {
    const paymentWithHistory: PaymentWithHistory = {
      ...payment,
      origin: 'Chicago, IL',
      destination: 'Denver, CO',
      miles: 1000,
      rate: payment.amount / 1000,
      notes: payment.status === 'Requested' ? 'Please process this payment as soon as possible.' : undefined,
      history: generatePaymentHistory(payment)
    };
    
    setSelectedPaymentDetails(paymentWithHistory);
    setIsPaymentDetailsModalOpen(true);
  };

  const generatePaymentHistory = (payment: Payment): PaymentEvent[] => {
    const history: PaymentEvent[] = [
      {
        id: '1',
        date: payment.date,
        type: 'created',
        description: 'Load completed and ready for payment',
        user: 'System'
      }
    ];
    
    if (['Requested', 'Processing', 'Paid', 'Canceled'].includes(payment.status)) {
      history.push({
        id: '2',
        date: new Date(new Date(payment.date).getTime() + 24 * 60 * 60 * 1000).toISOString(),
        type: 'requested',
        description: 'Payment requested',
        user: 'John Doe'
      });
    }
    
    if (payment.status === 'Canceled') {
      history.push({
        id: '3',
        date: new Date(new Date(payment.date).getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        type: 'canceled',
        description: 'Payment request canceled',
        user: 'John Doe'
      });
    }
    
    if (['Processing', 'Paid'].includes(payment.status)) {
      history.push({
        id: '3',
        date: new Date(new Date(payment.date).getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        type: 'processing',
        description: 'Payment is being processed',
        user: 'Jane Smith'
      });
    }
    
    if (payment.status === 'Paid') {
      history.push({
        id: '4',
        date: new Date(new Date(payment.date).getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        type: 'paid',
        description: 'Payment completed',
        user: 'Jane Smith'
      });
    }
    
    return history;
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
    <tr 
      key={payment.id} 
      className={`${payment.status === 'Canceled' ? styles.canceledRow : ''} ${styles.clickableRow}`}
      onClick={() => handleViewPaymentDetails(payment)}
    >
      <td>{payment.loadId}</td>
      <td>{payment.date}</td>
      <td>{payment.customer}</td>
      <td>${payment.amount.toFixed(2)}</td>
      <td>{renderPaymentStatus(payment.status)}</td>
      <td onClick={(e) => e.stopPropagation()}>{renderActionButtons(payment)}</td>
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
          <div className={styles.filtersContainer}>
            <div className={styles.searchContainer}>
              <input
                type="text"
                placeholder="Search by Load ID or Customer"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
            </div>
            
            <div className={styles.filterGroup}>
              <label>Status:</label>
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value as PaymentStatus | 'All')}
                className={styles.filterSelect}
              >
                <option value="All">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Requested">Requested</option>
                <option value="Paid">Paid</option>
                <option value="Canceled">Canceled</option>
                <option value="Processing">Processing</option>
              </select>
            </div>
            
            <div className={styles.filterGroup}>
              <label>From:</label>
              <input
                type="date"
                value={dateFilter.start}
                onChange={(e) => setDateFilter(prev => ({ ...prev, start: e.target.value }))}
                className={styles.dateInput}
              />
            </div>
            
            <div className={styles.filterGroup}>
              <label>To:</label>
              <input
                type="date"
                value={dateFilter.end}
                onChange={(e) => setDateFilter(prev => ({ ...prev, end: e.target.value }))}
                className={styles.dateInput}
              />
            </div>
            
            <button 
              onClick={clearFilters}
              className={styles.clearFiltersButton}
            >
              Clear Filters
            </button>
          </div>

          <div className={styles.resultsInfo}>
            Showing {filteredPayments.length} of {payments.length} payments
          </div>
        </div>
      </div>

      {activeTab === 'payments' ? (
        <div className={styles.table}>
          <table>
            <thead>
              <tr>
                <th onClick={() => handleSort('loadId')} className={styles.sortableHeader}>
                  Load ID
                  {sortConfig.key === 'loadId' && (
                    <span className={styles.sortIcon}>
                      {sortConfig.direction === 'ascending' ? '↑' : '↓'}
                    </span>
                  )}
                </th>
                <th onClick={() => handleSort('date')} className={styles.sortableHeader}>
                  Date
                  {sortConfig.key === 'date' && (
                    <span className={styles.sortIcon}>
                      {sortConfig.direction === 'ascending' ? '↑' : '↓'}
                    </span>
                  )}
                </th>
                <th onClick={() => handleSort('customer')} className={styles.sortableHeader}>
                  Customer
                  {sortConfig.key === 'customer' && (
                    <span className={styles.sortIcon}>
                      {sortConfig.direction === 'ascending' ? '↑' : '↓'}
                    </span>
                  )}
                </th>
                <th onClick={() => handleSort('amount')} className={styles.sortableHeader}>
                  Amount
                  {sortConfig.key === 'amount' && (
                    <span className={styles.sortIcon}>
                      {sortConfig.direction === 'ascending' ? '↑' : '↓'}
                    </span>
                  )}
                </th>
                <th onClick={() => handleSort('status')} className={styles.sortableHeader}>
                  Status
                  {sortConfig.key === 'status' && (
                    <span className={styles.sortIcon}>
                      {sortConfig.direction === 'ascending' ? '↑' : '↓'}
                    </span>
                  )}
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.length > 0 ? (
                filteredPayments.map((payment) => renderPaymentRow(payment))
              ) : (
                <tr>
                  <td colSpan={6} className={styles.noResults}>
                    No payments match your filters. <button onClick={clearFilters}>Clear filters</button>
                  </td>
                </tr>
              )}
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

      <PaymentDetailsModal
        isOpen={isPaymentDetailsModalOpen}
        onClose={() => setIsPaymentDetailsModalOpen(false)}
        payment={selectedPaymentDetails}
      />
    </div>
  );
};

export default Payments; 