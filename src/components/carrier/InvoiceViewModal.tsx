import React from 'react';

interface InvoiceViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: any;
}

const InvoiceViewModal: React.FC<InvoiceViewModalProps> = ({ isOpen, onClose, invoice }) => {
  if (!isOpen || !invoice) return null;

  // Helper function to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Helper function to format date
  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      width: '100vw', 
      height: '100vh', 
      background: 'rgba(0,0,0,0.5)', 
      zIndex: 1000, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{ 
        background: 'white', 
        borderRadius: 8, 
        width: '100%', 
        maxWidth: '800px', 
        maxHeight: '90vh', 
        overflowY: 'auto', 
        boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
        position: 'relative'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
          color: 'white',
          padding: '24px 32px',
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
          position: 'relative'
        }}>
          <button 
            onClick={onClose}
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: 'white',
              borderRadius: '50%',
              width: 32,
              height: 32,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18
            }}
          >
            ×
          </button>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 32, fontWeight: 700, letterSpacing: -1 }}>INVOICE</h1>
              <p style={{ margin: '8px 0 0 0', opacity: 0.9, fontSize: 16 }}>
                Invoice #{invoice.invoiceNumber || invoice.id}
              </p>
            </div>
            <div style={{ textAlign: 'right', marginRight: '48px' }}>
              <div style={{ 
                background: 'rgba(255,255,255,0.2)', 
                padding: '8px 16px', 
                borderRadius: 20,
                fontSize: 14,
                fontWeight: 600,
                textTransform: 'uppercase'
              }}>
                {invoice.status || 'Pending'}
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Content */}
        <div style={{ padding: '32px' }}>
          {/* From/To Section */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginBottom: '40px' }}>
            {/* From (Carrier) */}
            <div>
              <h3 style={{ 
                margin: '0 0 16px 0', 
                fontSize: 18, 
                fontWeight: 600, 
                color: '#1e3c72',
                borderBottom: '2px solid #1e3c72',
                paddingBottom: '8px'
              }}>
                FROM
              </h3>
              <div style={{ fontSize: 14, lineHeight: 1.6 }}>
                <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                  {invoice.carrierName || invoice.carrier || '-'}
                </div>
                <div style={{ color: '#666' }}>
                  {invoice.carrierAddress || '-'}
                </div>
                <div style={{ color: '#666', marginTop: '8px' }}>
                  Contact: {invoice.carrierContact || '-'}
                </div>
              </div>
            </div>

            {/* To (Shipper) */}
            <div>
              <h3 style={{ 
                margin: '0 0 16px 0', 
                fontSize: 18, 
                fontWeight: 600, 
                color: '#1e3c72',
                borderBottom: '2px solid #1e3c72',
                paddingBottom: '8px'
              }}>
                TO
              </h3>
              <div style={{ fontSize: 14, lineHeight: 1.6 }}>
                <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                  {invoice.customer || '-'}
                </div>
                <div style={{ color: '#666' }}>
                  {invoice.shipperAddress || '-'}
                </div>
                <div style={{ color: '#666' }}>
                  {invoice.shipperCityState || '-'}
                </div>
                <div style={{ color: '#666', marginTop: '8px' }}>
                  Contact: {invoice.shipperContact || '-'}
                </div>
              </div>
            </div>
          </div>

          {/* Invoice Details */}
          <div style={{ 
            background: '#f8f9fa', 
            padding: '24px', 
            borderRadius: 8, 
            marginBottom: '32px',
            border: '1px solid #e9ecef'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px' }}>
              <div>
                <div style={{ fontSize: 12, color: '#666', textTransform: 'uppercase', fontWeight: 600, marginBottom: '4px' }}>
                  Invoice Date
                </div>
                <div style={{ fontSize: 16, fontWeight: 500 }}>
                  {formatDate(invoice.issueDate)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#666', textTransform: 'uppercase', fontWeight: 600, marginBottom: '4px' }}>
                  Due Date
                </div>
                <div style={{ fontSize: 16, fontWeight: 500 }}>
                  {formatDate(invoice.dueDate)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#666', textTransform: 'uppercase', fontWeight: 600, marginBottom: '4px' }}>
                  PO Number
                </div>
                <div style={{ fontSize: 16, fontWeight: 500 }}>
                  {invoice.poNumber || '-'}
                </div>
              </div>
            </div>
          </div>

          {/* Job Details */}
          {invoice.jobDetails && (
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ 
                margin: '0 0 16px 0', 
                fontSize: 18, 
                fontWeight: 600, 
                color: '#1e3c72',
                borderBottom: '2px solid #1e3c72',
                paddingBottom: '8px'
              }}>
                Job Details
              </h3>
              <div style={{ 
                background: '#f8f9fa', 
                padding: '16px', 
                borderRadius: 6,
                fontSize: 14,
                lineHeight: 1.6,
                border: '1px solid #e9ecef'
              }}>
                {invoice.jobDetails}
              </div>
            </div>
          )}

          {/* Amount Section */}
          <div style={{ 
            background: '#1e3c72', 
            color: 'white', 
            padding: '24px', 
            borderRadius: 8,
            textAlign: 'center',
            marginBottom: '32px'
          }}>
            <div style={{ fontSize: 14, opacity: 0.9, marginBottom: '8px' }}>
              Total Amount Due
            </div>
            <div style={{ fontSize: 36, fontWeight: 700 }}>
              {typeof invoice.amount === 'number' ? formatCurrency(invoice.amount) : '-'}
            </div>
          </div>

          {/* Additional Information */}
          {(invoice.additionalInfo || invoice.terms) && (
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ 
                margin: '0 0 16px 0', 
                fontSize: 18, 
                fontWeight: 600, 
                color: '#1e3c72',
                borderBottom: '2px solid #1e3c72',
                paddingBottom: '8px'
              }}>
                Additional Information
              </h3>
              {invoice.additionalInfo && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: 12, color: '#666', textTransform: 'uppercase', fontWeight: 600, marginBottom: '4px' }}>
                    Notes
                  </div>
                  <div style={{ 
                    background: '#f8f9fa', 
                    padding: '16px', 
                    borderRadius: 6,
                    fontSize: 14,
                    lineHeight: 1.6,
                    border: '1px solid #e9ecef'
                  }}>
                    {invoice.additionalInfo}
                  </div>
                </div>
              )}
              {invoice.terms && (
                <div>
                  <div style={{ fontSize: 12, color: '#666', textTransform: 'uppercase', fontWeight: 600, marginBottom: '4px' }}>
                    Terms & Conditions
                  </div>
                  <div style={{ 
                    background: '#f8f9fa', 
                    padding: '16px', 
                    borderRadius: 6,
                    fontSize: 14,
                    lineHeight: 1.6,
                    border: '1px solid #e9ecef'
                  }}>
                    {invoice.terms}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Attachments */}
          {Array.isArray(invoice.attachments) && invoice.attachments.length > 0 && (
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ 
                margin: '0 0 16px 0', 
                fontSize: 18, 
                fontWeight: 600, 
                color: '#1e3c72',
                borderBottom: '2px solid #1e3c72',
                paddingBottom: '8px'
              }}>
                Attachments
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                {invoice.attachments.map((att: any, index: number) => (
                  <a 
                    key={att.url || index}
                    href={att.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    style={{ 
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '8px 16px',
                      background: '#f8f9fa',
                      border: '1px solid #e9ecef',
                      borderRadius: 6,
                      color: '#1e3c72',
                      textDecoration: 'none',
                      fontSize: 14,
                      fontWeight: 500,
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = '#e9ecef';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = '#f8f9fa';
                    }}
                  >
                    📎 {att.name}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={{ 
            borderTop: '2px solid #e9ecef', 
            paddingTop: '24px', 
            textAlign: 'center',
            color: '#666',
            fontSize: 12
          }}>
            <p style={{ margin: 0 }}>
              Thank you for your business
            </p>
            {invoice.dateDelivered && (
              <p style={{ margin: '8px 0 0 0' }}>
                Delivered: {formatDate(invoice.dateDelivered)}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceViewModal; 