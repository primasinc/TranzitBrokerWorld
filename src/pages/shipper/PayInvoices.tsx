import React, { useState } from 'react';
import styles from './PayInvoices.module.css';

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

  const invoices: Invoice[] = [
    {
      id: "INV001",
      invoiceNumber: "INV-2024-001",
      carrier: "ABC Trucking",
      amount: 2500.00,
      dueDate: "2024-03-15",
      status: "Pending",
      poNumber: "PO-12345",
      issueDate: "2024-02-15",
      deliveryDate: "2024-02-20"
    },
    {
      id: "INV002",
      invoiceNumber: "INV-2024-002",
      carrier: "XYZ Logistics",
      amount: 3750.00,
      dueDate: "2024-03-01",
      status: "Paid",
      poNumber: "PO-12346",
      issueDate: "2024-02-01",
      deliveryDate: "2024-02-05"
    },
    // Add more invoices as needed
  ];

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
    </div>
  );
};

export default PayInvoices; 