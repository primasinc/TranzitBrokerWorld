import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Payments.module.css';
import DocumentModal from '../../components/DocumentModal';
import PaymentRequestModal from '../../components/PaymentRequestModal';
import FactorRequestModal from '../../components/FactorRequestModal';
import CancelPaymentRequestModal from '../../components/CancelPaymentRequestModal';
import PaymentDetailsModal from '../../components/PaymentDetailsModal';
import PaymentReportsModal from '../../components/PaymentReportsModal';
import PaymentAnalyticsModal from '../../components/PaymentAnalyticsModal';
import PaymentSettingsModal, { PaymentSettings } from '../../components/PaymentSettingsModal';
import AdvancedSearchModal, { SearchCriteria, SavedSearch } from '../../components/AdvancedSearchModal';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import InvoiceViewModal from '../../components/carrier/InvoiceViewModal';
import { useMobileOptimization } from '../../hooks/useMobileOptimization';
import NotificationsTray, { useUnreadNotifications } from './NotificationsTray';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

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
  invoiceNumber?: string;
  poNumber?: string;
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
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'payments' | 'invoices'>('payments');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [selectedLoadId, setSelectedLoadId] = useState<string>('');
  const [isPaymentRequestModalOpen, setIsPaymentRequestModalOpen] = useState(false);
  const [isFactorRequestModalOpen, setIsFactorRequestModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [isCancelPaymentModalOpen, setIsCancelPaymentModalOpen] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);

  const [invoices, setInvoices] = useState<Invoice[]>([]);

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
  const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);
  const [selectedPaymentIds, setSelectedPaymentIds] = useState<string[]>([]);
  const [bulkActionMenuOpen, setBulkActionMenuOpen] = useState(false);
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({
    preferredPaymentMethod: 'directDeposit',
    bankInfo: {
      accountName: '',
      accountNumber: '',
      routingNumber: '',
      bankName: ''
    },
    factoring: {
      defaultFactoringOption: 'none',
      externalFactoringCompany: '',
      externalFactoringEmail: '',
      autoFactorLoadsOver: 0
    },
    notifications: {
      emailNotifications: true,
      smsNotifications: false,
      paymentStatusChanges: true,
      paymentReminders: true,
      weeklyReports: false
    },
    reportTemplates: [
      {
        name: 'Monthly Payments',
        type: 'all',
        format: 'csv',
        fields: ['loadId', 'date', 'customer', 'amount', 'status']
      }
    ]
  });
  const [isAdvancedSearchModalOpen, setIsAdvancedSearchModalOpen] = useState(false);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([
    {
      id: '1',
      name: 'Recent Pending Payments',
      criteria: {
        status: ['Pending'],
        dateRange: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          end: new Date().toISOString().split('T')[0]
        }
      }
    }
  ]);
  const [advancedSearchCriteria, setAdvancedSearchCriteria] = useState<SearchCriteria | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showInvoiceView, setShowInvoiceView] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadCount = useUnreadNotifications();

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

  useEffect(() => {
    async function fetchInvoices() {
      const snapshot = await getDocs(collection(db, 'invoices'));
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setInvoices(data as Invoice[]);
    }
    fetchInvoices();
  }, []);

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
        {/* <button 
          className={`${styles.actionButton} ${styles.documentButton}`}
          onClick={() => handleDocuments(payment)}
        >
          Documents
        </button> */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button className={styles.payActionButton}>Shipper Pay</button>
          <button className={styles.payActionButton}>Factor Pay</button>
        </div>
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

  const togglePaymentSelection = (paymentId: string) => {
    setSelectedPaymentIds(prev => 
      prev.includes(paymentId)
        ? prev.filter(id => id !== paymentId)
        : [...prev, paymentId]
    );
  };

  const toggleAllPayments = () => {
    if (selectedPaymentIds.length === filteredPayments.length) {
      setSelectedPaymentIds([]);
    } else {
      setSelectedPaymentIds(filteredPayments.map(p => p.id));
    }
  };

  const handleBulkPaymentRequest = async () => {
    if (selectedPaymentIds.length === 0) return;
    
    if (window.confirm(`Are you sure you want to request payment for ${selectedPaymentIds.length} selected items?`)) {
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setPayments(payments.map(p => 
          selectedPaymentIds.includes(p.id)
            ? { ...p, status: 'Requested' as PaymentStatus }
            : p
        ));
        
        setSelectedPaymentIds([]);
        setBulkActionMenuOpen(false);
        
        alert(`Successfully requested payment for ${selectedPaymentIds.length} items.`);
      } catch (error) {
        console.error('Error processing bulk payment request:', error);
        alert('Error processing bulk payment request. Please try again.');
      }
    }
  };

  const handleBulkCancelRequest = async () => {
    if (selectedPaymentIds.length === 0) return;
    
    if (window.confirm(`Are you sure you want to cancel payment requests for ${selectedPaymentIds.length} selected items?`)) {
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setPayments(payments.map(p => 
          selectedPaymentIds.includes(p.id) && p.status === 'Requested'
            ? { ...p, status: 'Canceled' as PaymentStatus }
            : p
        ));
        
        setSelectedPaymentIds([]);
        setBulkActionMenuOpen(false);
        
        alert(`Successfully canceled payment requests for ${selectedPaymentIds.length} items.`);
      } catch (error) {
        console.error('Error processing bulk cancellation:', error);
        alert('Error processing bulk cancellation. Please try again.');
      }
    }
  };

  const handleBulkFactorRequest = async () => {
    if (selectedPaymentIds.length === 0) return;
    
    if (window.confirm(`Are you sure you want to request factoring for ${selectedPaymentIds.length} selected items?`)) {
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setPayments(payments.map(p => 
          selectedPaymentIds.includes(p.id)
            ? { ...p, status: 'Processing' as PaymentStatus }
            : p
        ));
        
        setSelectedPaymentIds([]);
        setBulkActionMenuOpen(false);
        
        alert(`Successfully requested factoring for ${selectedPaymentIds.length} items.`);
      } catch (error) {
        console.error('Error processing bulk factoring request:', error);
        alert('Error processing bulk factoring request. Please try again.');
      }
    }
  };

  const renderPaymentRow = (payment: Payment) => (
    <tr 
      key={payment.id} 
      className={`
        ${payment.status === 'Canceled' ? styles.canceledRow : ''} 
        ${styles.clickableRow}
        ${selectedPaymentIds.includes(payment.id) ? styles.selectedRow : ''}
      `}
    >
      <td className={styles.checkboxCell} onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={selectedPaymentIds.includes(payment.id)}
          onChange={() => togglePaymentSelection(payment.id)}
          className={styles.checkbox}
        />
      </td>
      <td onClick={() => handleViewPaymentDetails(payment)}>{payment.loadId}</td>
      <td onClick={() => handleViewPaymentDetails(payment)}>{payment.date}</td>
      <td onClick={() => handleViewPaymentDetails(payment)}>{payment.customer}</td>
      <td onClick={() => handleViewPaymentDetails(payment)}>${typeof payment.amount === 'number' ? payment.amount.toFixed(2) : '-'}</td>
      <td onClick={() => handleViewPaymentDetails(payment)}>{renderPaymentStatus(payment.status)}</td>
      <td style={{ textAlign: 'right' }}>
        {renderActionButtons(payment)}
      </td>
    </tr>
  );

  const handleSaveSettings = (settings: PaymentSettings) => {
    setPaymentSettings(settings);
    // In a real app, you would save these to your backend
    console.log('Saving settings:', settings);
  };

  const handleAdvancedSearch = (criteria: SearchCriteria) => {
    setAdvancedSearchCriteria(criteria);
    
    // Apply the search criteria to filter payments
    let result = [...payments];
    
    if (criteria.loadId) {
      result = result.filter(p => p.loadId.toLowerCase().includes(criteria.loadId!.toLowerCase()));
    }
    
    if (criteria.customer) {
      result = result.filter(p => p.customer.toLowerCase().includes(criteria.customer!.toLowerCase()));
    }
    
    if (criteria.dateRange?.start) {
      const startDate = new Date(criteria.dateRange.start);
      result = result.filter(p => new Date(p.date) >= startDate);
    }
    
    if (criteria.dateRange?.end) {
      const endDate = new Date(criteria.dateRange.end);
      endDate.setHours(23, 59, 59, 999); // End of day
      result = result.filter(p => new Date(p.date) <= endDate);
    }
    
    if (criteria.amountRange && criteria.amountRange.min > 0) {
      const minAmount = criteria.amountRange.min;
      result = result.filter(p => p.amount >= minAmount);
    }
    
    if (criteria.amountRange && criteria.amountRange.max > 0) {
      const maxAmount = criteria.amountRange.max;
      result = result.filter(p => p.amount <= maxAmount);
    }
    
    if (criteria.status && criteria.status.length > 0) {
      result = result.filter(p => criteria.status!.includes(p.status));
    }
    
    // For demo purposes, we're just filtering on the client side
    // In a real app, you would send this criteria to your API
    setFilteredPayments(result);
  };

  const handleSaveSearch = (search: SavedSearch) => {
    setSavedSearches(prev => [...prev, search]);
  };

  const handleDeleteSavedSearch = (id: string) => {
    setSavedSearches(prev => prev.filter(search => search.id !== id));
  };

  const clearAdvancedSearch = () => {
    setAdvancedSearchCriteria(null);
  };

  const handleProfile = () => {
    navigate('/carrier/profile');
  };

  const handleSettings = () => {
    navigate('/carrier/settings');
  };

  const handleLogout = () => {
    navigate('/login');
  };

  // Add Shipper Pay logic for table
  const handleShipperPay = async (invoice: any) => {
    if (!invoice.poNumber) {
      alert('PO Number is required to send to shipper.');
      return;
    }
    try {
      // Always query poNumber as a string
      const poNumberStr = String(invoice.poNumber);
      // Look up the PO by poNumber in purchaseOrders
      let poSnap = await getDocs(query(collection(db, 'purchaseOrders'), where('poNumber', '==', poNumberStr)));
      // If not found, check poArchive
      if (poSnap.empty) {
        poSnap = await getDocs(query(collection(db, 'poArchive'), where('poNumber', '==', poNumberStr)));
      }
      if (poSnap.empty) {
        alert('No purchase order found for this PO Number.');
        return;
      }
      const poData = poSnap.docs[0].data();
      const shipperId = poData.userId;
      if (!shipperId) {
        alert('No shipperId found on the purchase order.');
        return;
      }
      // Upload attachments if present
      let attachmentUrls: string[] = [];
      if (invoice.files && invoice.files.length > 0) {
        const storage = getStorage();
        const uploadPromises = invoice.files.map(async (file: File) => {
          const storageRef = ref(storage, `invoices/${invoice.id}/${file.name}`);
          await uploadBytes(storageRef, file);
          return await getDownloadURL(storageRef);
        });
        attachmentUrls = await Promise.all(uploadPromises);
      }
      // Debug logs
      console.log('Current user UID:', (window as any).user?.uid);
      console.log('Invoice userId:', invoice.userId);
      console.log('shipperId to set:', shipperId);
      console.log('attachmentUrls:', attachmentUrls);
      // Prepare update object, only updating intended fields
      const updateObj: any = { attachmentUrls };
      // Only set shipperId if not already present
      if (!invoice.shipperId) {
        updateObj.shipperId = shipperId;
      }
      // Update the invoice with merge semantics to avoid removing fields
      const invDocRef = doc(db, 'invoices', invoice.id);
      await updateDoc(invDocRef, updateObj);
      alert('Invoice and attachments sent to shipper successfully!');
    } catch (err) {
      console.error('Shipper Pay error:', err);
      alert('Failed to send invoice to shipper.');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerCard}>
        <header className={styles.headerRow}>
          <div className={styles.headerLeft}>
            <h1>Payments & Invoices</h1>
          </div>
          <div className={styles.headerRight}>
            <button
              className={styles.bellButton}
              onClick={() => setShowNotifications(v => !v)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, position: 'relative' }}
              tabIndex={0}
              aria-label="Notifications"
            >
              <span role="img" aria-label="Notifications">🔔</span>
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  background: 'red',
                  color: 'white',
                  borderRadius: '50%',
                  width: 18,
                  height: 18,
                  fontSize: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  zIndex: 10
                }}>{unreadCount}</span>
              )}
            </button>
            {showNotifications && <NotificationsTray onClose={() => setShowNotifications(false)} />}
            <div className={styles.menuContainer}>
              <button 
                className={styles.hamburgerButton}
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label="Menu"
              >
                <div className={styles.hamburgerIcon}>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </button>
              {isMenuOpen && (
                <div className={styles.dropdownMenu}>
                  <button onClick={handleProfile}>Account</button>
                  <button onClick={handleSettings}>Settings</button>
                  <button onClick={handleLogout} className={styles.logoutButton}>Logout</button>
                </div>
              )}
            </div>
          </div>
        </header>
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

      <div className={styles.tabs} style={{ marginBottom: 16 }}>
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

      <div className={styles.filtersRowContainer}>
        <div className={styles.filtersRow}>
          <div className={styles.filterGroup}>
            <label htmlFor="searchInput" className={styles.filterLabel}>Search</label>
            <input
              id="searchInput"
              type="text"
              placeholder="Search by Invoice # or Customer"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
              disabled={!!advancedSearchCriteria}
            />
          </div>
          
          <div className={styles.filterGroup}>
            <label htmlFor="statusFilter" className={styles.filterLabel}>Status</label>
            <select 
              id="statusFilter"
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
            <label htmlFor="startDate" className={styles.filterLabel}>Start Date</label>
            <input
              id="startDate"
              type="date"
              value={dateFilter.start}
              onChange={(e) => setDateFilter(prev => ({ ...prev, start: e.target.value }))}
              className={styles.dateInput}
            />
          </div>
          
          <div className={styles.filterGroup}>
            <label htmlFor="endDate" className={styles.filterLabel}>End Date</label>
            <input
              id="endDate"
              type="date"
              value={dateFilter.end}
              onChange={(e) => setDateFilter(prev => ({ ...prev, end: e.target.value }))}
              className={styles.dateInput}
            />
          </div>
          
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>&nbsp;</label>
            <button 
              onClick={clearFilters}
              className={styles.clearFiltersButton}
            >
              Clear Filters
            </button>
          </div>
        </div>
        <div className={styles.advancedSearchButtonContainer}>
          <button 
            className={styles.advancedSearchButton}
            onClick={() => setIsAdvancedSearchModalOpen(true)}
          >
            Advanced Search
          </button>
        </div>
      </div>

      {selectedPaymentIds.length > 0 && (
        <div className={styles.bulkActionsBar}>
          <div className={styles.selectedCount}>
            {selectedPaymentIds.length} {selectedPaymentIds.length === 1 ? 'item' : 'items'} selected
          </div>
          
          <div className={styles.bulkActions}>
            <div className={styles.bulkActionsDropdown}>
              <button 
                className={styles.bulkActionsButton}
                onClick={() => setBulkActionMenuOpen(!bulkActionMenuOpen)}
              >
                Bulk Actions ▼
              </button>
              
              {bulkActionMenuOpen && (
                <div className={styles.bulkActionsMenu}>
                  <button 
                    onClick={handleBulkPaymentRequest}
                    className={styles.bulkActionItem}
                  >
                    Request Payment
                  </button>
                  <button 
                    onClick={handleBulkFactorRequest}
                    className={styles.bulkActionItem}
                  >
                    Request Factoring
                  </button>
                  <button 
                    onClick={handleBulkCancelRequest}
                    className={styles.bulkActionItem}
                  >
                    Cancel Payment Requests
                  </button>
                  <button 
                    onClick={() => setSelectedPaymentIds([])}
                    className={styles.bulkActionItem}
                  >
                    Clear Selection
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'payments' ? (
        <div className={styles.table}>
          <table>
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>PO Number</th>
                <th>Customer</th>
                <th>Issue Date</th>
                <th>Amount</th>
                <th>Status</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length > 0 ? (
                invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>{invoice.invoiceNumber || invoice.id}</td>
                    <td>{invoice.poNumber || '-'}</td>
                    <td>{invoice.customer || '-'}</td>
                    <td>{invoice.issueDate || '-'}</td>
                    <td>{typeof invoice.amount === 'number' ? `$${invoice.amount.toFixed(2)}` : '-'}</td>
                    <td>
                      <span className={`${styles.status} ${invoice.status ? styles[invoice.status.toLowerCase()] : ''}`}>
                        {invoice.status || '-'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className={styles.payActionButtons}>
                        <button className={styles.payActionButton} onClick={() => handleShipperPay(invoice)}>Shipper Pay</button>
                        <button className={styles.payActionButton}>Factor Pay</button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className={styles.noResults}>
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
                <th>PO Number</th>
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
                  <td>{invoice.invoiceNumber || invoice.id}</td>
                  <td>{invoice.poNumber || '-'}</td>
                  <td>{invoice.customer || '-'}</td>
                  <td>{invoice.issueDate || '-'}</td>
                  <td>{invoice.dueDate || '-'}</td>
                  <td>{typeof invoice.amount === 'number' ? `$${invoice.amount.toFixed(2)}` : '-'}</td>
                  <td>
                    <span className={`${styles.status} ${invoice.status ? styles[invoice.status.toLowerCase()] : ''}`}>
                      {invoice.status || '-'}
                    </span>
                  </td>
                  <td>
                    <div className={styles.invoiceActions}>
                      <button className={styles.invoiceViewButton} onClick={() => { setSelectedInvoice(invoice); setShowInvoiceView(true); }}>View</button>
                      <button className={styles.invoiceDownloadButton}>Download</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showInvoiceView && selectedInvoice && (
        <InvoiceViewModal
          isOpen={showInvoiceView}
          onClose={() => setShowInvoiceView(false)}
          invoice={selectedInvoice}
        />
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

export default Payments;