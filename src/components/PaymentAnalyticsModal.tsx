import React, { useState, useEffect } from 'react';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend,
  ArcElement,
  PointElement,
  LineElement
} from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';
import styles from './PaymentAnalyticsModal.module.css';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

interface Payment {
  id: string;
  loadId: string;
  date: string;
  customer: string;
  amount: number;
  status: string;
}

interface PaymentAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  payments: Payment[];
}

const PaymentAnalyticsModal: React.FC<PaymentAnalyticsModalProps> = ({ 
  isOpen, 
  onClose, 
  payments 
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'customers'>('overview');
  const [timeRange, setTimeRange] = useState<'30days' | '90days' | '6months' | '1year'>('30days');
  
  // Calculate date ranges
  const getDateRange = () => {
    const endDate = new Date();
    const startDate = new Date();
    
    switch (timeRange) {
      case '30days':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90days':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case '6months':
        startDate.setMonth(endDate.getMonth() - 6);
        break;
      case '1year':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
    }
    
    return { startDate, endDate };
  };
  
  // Filter payments by date range
  const getFilteredPayments = () => {
    const { startDate, endDate } = getDateRange();
    return payments.filter(payment => {
      const paymentDate = new Date(payment.date);
      return paymentDate >= startDate && paymentDate <= endDate;
    });
  };
  
  // Calculate overview metrics
  const calculateOverviewMetrics = () => {
    const filteredPayments = getFilteredPayments();
    
    const totalAmount = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
    const paidAmount = filteredPayments
      .filter(p => p.status === 'Paid')
      .reduce((sum, p) => sum + p.amount, 0);
    const pendingAmount = filteredPayments
      .filter(p => ['Pending', 'Requested', 'Processing'].includes(p.status))
      .reduce((sum, p) => sum + p.amount, 0);
    const canceledAmount = filteredPayments
      .filter(p => p.status === 'Canceled')
      .reduce((sum, p) => sum + p.amount, 0);
    
    return {
      totalPayments: filteredPayments.length,
      totalAmount,
      paidAmount,
      pendingAmount,
      canceledAmount,
      paidPercentage: totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0,
      pendingPercentage: totalAmount > 0 ? (pendingAmount / totalAmount) * 100 : 0,
      canceledPercentage: totalAmount > 0 ? (canceledAmount / totalAmount) * 100 : 0
    };
  };
  
  // Prepare data for status distribution pie chart
  const getStatusDistributionData = () => {
    const metrics = calculateOverviewMetrics();
    
    return {
      labels: ['Paid', 'Pending', 'Canceled'],
      datasets: [
        {
          data: [metrics.paidAmount, metrics.pendingAmount, metrics.canceledAmount],
          backgroundColor: ['#28a745', '#ffc107', '#dc3545'],
          borderColor: ['#28a745', '#ffc107', '#dc3545'],
          borderWidth: 1,
        },
      ],
    };
  };
  
  // Prepare data for monthly trends chart
  const getMonthlyTrendsData = () => {
    const { startDate, endDate } = getDateRange();
    const filteredPayments = getFilteredPayments();
    
    // Generate array of months between start and end date
    const months: Date[] = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      months.push(new Date(currentDate));
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
    
    // Calculate totals for each month
    const monthlyTotals = months.map(month => {
      const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
      const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
      
      const monthPayments = filteredPayments.filter(payment => {
        const paymentDate = new Date(payment.date);
        return paymentDate >= monthStart && paymentDate <= monthEnd;
      });
      
      const totalAmount = monthPayments.reduce((sum, p) => sum + p.amount, 0);
      const paidAmount = monthPayments
        .filter(p => p.status === 'Paid')
        .reduce((sum, p) => sum + p.amount, 0);
      
      return {
        month: month.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        totalAmount,
        paidAmount
      };
    });
    
    return {
      labels: monthlyTotals.map(m => m.month),
      datasets: [
        {
          label: 'Total Amount',
          data: monthlyTotals.map(m => m.totalAmount),
          backgroundColor: 'rgba(54, 162, 235, 0.5)',
          borderColor: 'rgb(54, 162, 235)',
          borderWidth: 1,
        },
        {
          label: 'Paid Amount',
          data: monthlyTotals.map(m => m.paidAmount),
          backgroundColor: 'rgba(75, 192, 192, 0.5)',
          borderColor: 'rgb(75, 192, 192)',
          borderWidth: 1,
        }
      ],
    };
  };
  
  // Prepare data for payment processing time chart
  const getProcessingTimeData = () => {
    const filteredPayments = getFilteredPayments();
    
    // Calculate average days to payment for each month
    const { startDate, endDate } = getDateRange();
    const months: Date[] = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      months.push(new Date(currentDate));
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
    
    // For this demo, we'll generate random processing times
    // In a real app, you would calculate this from actual payment data
    const processingTimes = months.map(month => {
      return {
        month: month.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        avgDays: Math.floor(Math.random() * 10) + 5 // Random number between 5-15
      };
    });
    
    return {
      labels: processingTimes.map(m => m.month),
      datasets: [
        {
          label: 'Avg. Days to Payment',
          data: processingTimes.map(m => m.avgDays),
          borderColor: 'rgb(255, 99, 132)',
          backgroundColor: 'rgba(255, 99, 132, 0.5)',
          tension: 0.1
        }
      ]
    };
  };
  
  // Prepare data for top customers chart
  const getTopCustomersData = () => {
    const filteredPayments = getFilteredPayments();
    
    // Group payments by customer
    const customerTotals: Record<string, number> = {};
    
    filteredPayments.forEach(payment => {
      if (!customerTotals[payment.customer]) {
        customerTotals[payment.customer] = 0;
      }
      customerTotals[payment.customer] += payment.amount;
    });
    
    // Sort customers by total amount
    const sortedCustomers = Object.entries(customerTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5); // Top 5 customers
    
    return {
      labels: sortedCustomers.map(([customer]) => customer),
      datasets: [
        {
          label: 'Total Amount',
          data: sortedCustomers.map(([_, amount]) => amount),
          backgroundColor: [
            'rgba(255, 99, 132, 0.5)',
            'rgba(54, 162, 235, 0.5)',
            'rgba(255, 206, 86, 0.5)',
            'rgba(75, 192, 192, 0.5)',
            'rgba(153, 102, 255, 0.5)'
          ],
          borderColor: [
            'rgba(255, 99, 132, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)'
          ],
          borderWidth: 1,
        }
      ]
    };
  };
  
  if (!isOpen) return null;
  
  const metrics = calculateOverviewMetrics();
  
  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2>Payment Analytics</h2>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>
        
        <div className={styles.timeRangeSelector}>
          <label>Time Range:</label>
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value as any)}
            className={styles.timeRangeSelect}
          >
            <option value="30days">Last 30 Days</option>
            <option value="90days">Last 90 Days</option>
            <option value="6months">Last 6 Months</option>
            <option value="1year">Last Year</option>
          </select>
        </div>
        
        <div className={styles.tabsContainer}>
          <button 
            className={`${styles.tabButton} ${activeTab === 'overview' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button 
            className={`${styles.tabButton} ${activeTab === 'trends' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('trends')}
          >
            Payment Trends
          </button>
          <button 
            className={`${styles.tabButton} ${activeTab === 'customers' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('customers')}
          >
            Customer Analysis
          </button>
        </div>
        
        <div className={styles.content}>
          {activeTab === 'overview' && (
            <div className={styles.overviewTab}>
              <div className={styles.metricsGrid}>
                <div className={styles.metricCard}>
                  <div className={styles.metricValue}>{metrics.totalPayments}</div>
                  <div className={styles.metricLabel}>Total Payments</div>
                </div>
                <div className={styles.metricCard}>
                  <div className={styles.metricValue}>${metrics.totalAmount.toFixed(2)}</div>
                  <div className={styles.metricLabel}>Total Amount</div>
                </div>
                <div className={styles.metricCard}>
                  <div className={styles.metricValue}>${metrics.paidAmount.toFixed(2)}</div>
                  <div className={styles.metricLabel}>Paid Amount</div>
                </div>
                <div className={styles.metricCard}>
                  <div className={styles.metricValue}>${metrics.pendingAmount.toFixed(2)}</div>
                  <div className={styles.metricLabel}>Pending Amount</div>
                </div>
              </div>
              
              <div className={styles.chartContainer}>
                <h3>Payment Status Distribution</h3>
                <div className={styles.pieChartContainer}>
                  <Pie data={getStatusDistributionData()} />
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'trends' && (
            <div className={styles.trendsTab}>
              <div className={styles.chartContainer}>
                <h3>Monthly Payment Trends</h3>
                <Bar 
                  data={getMonthlyTrendsData()} 
                  options={{
                    responsive: true,
                    scales: {
                      y: {
                        beginAtZero: true,
                        title: {
                          display: true,
                          text: 'Amount ($)'
                        }
                      }
                    }
                  }}
                />
              </div>
              
              <div className={styles.chartContainer}>
                <h3>Average Days to Payment</h3>
                <Line 
                  data={getProcessingTimeData()} 
                  options={{
                    responsive: true,
                    scales: {
                      y: {
                        beginAtZero: true,
                        title: {
                          display: true,
                          text: 'Days'
                        }
                      }
                    }
                  }}
                />
              </div>
            </div>
          )}
          
          {activeTab === 'customers' && (
            <div className={styles.customersTab}>
              <div className={styles.chartContainer}>
                <h3>Top 5 Customers by Payment Volume</h3>
                <Bar 
                  data={getTopCustomersData()} 
                  options={{
                    responsive: true,
                    indexAxis: 'y' as const,
                    scales: {
                      x: {
                        beginAtZero: true,
                        title: {
                          display: true,
                          text: 'Amount ($)'
                        }
                      }
                    }
                  }}
                />
              </div>
            </div>
          )}
        </div>
        
        <div className={styles.actions}>
          <button onClick={onClose} className={styles.closeModalButton}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentAnalyticsModal; 