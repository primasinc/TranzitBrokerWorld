import React from 'react';

interface InvoiceViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: any;
}

const InvoiceViewModal: React.FC<InvoiceViewModalProps> = ({ isOpen, onClose, invoice }) => {
  if (!isOpen || !invoice) return null;

  const labelStyle = { fontWeight: 500, color: '#555', marginBottom: 2, fontSize: 14 };
  const valueStyle = { marginBottom: 10, fontSize: 15 };
  const sectionStyle = { marginBottom: 18, borderBottom: '1px solid #eee', paddingBottom: 10 };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: 12, padding: 36, width: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
        <h2 style={{ marginTop: 0, marginBottom: 24, fontWeight: 700, fontSize: 28, letterSpacing: -1 }}>Invoice Details</h2>
        <div style={sectionStyle}>
          <div style={labelStyle}>Invoice #</div>
          <div style={valueStyle}>{invoice.invoiceNumber || invoice.id}</div>
          <div style={labelStyle}>PO Number</div>
          <div style={valueStyle}>{invoice.poNumber || '-'}</div>
          <div style={labelStyle}>Status</div>
          <div style={valueStyle}>{invoice.status || '-'}</div>
        </div>
        <div style={sectionStyle}>
          <div style={labelStyle}>Carrier Info</div>
          <div style={valueStyle}>{invoice.carrierName || '-'}</div>
          <div style={valueStyle}>{invoice.carrierAddress || '-'}</div>
          <div style={valueStyle}>{invoice.carrierContact || '-'}</div>
        </div>
        <div style={sectionStyle}>
          <div style={labelStyle}>Shipper Info</div>
          <div style={valueStyle}>{invoice.customer || '-'}</div>
          <div style={valueStyle}>{invoice.shipperAddress || '-'}</div>
          <div style={valueStyle}>{invoice.shipperCityState || '-'}</div>
          <div style={valueStyle}>{invoice.shipperContact || '-'}</div>
        </div>
        <div style={sectionStyle}>
          <div style={labelStyle}>Job Details</div>
          <div style={valueStyle}>{invoice.jobDetails || '-'}</div>
          <div style={labelStyle}>Amount</div>
          <div style={valueStyle}>{typeof invoice.amount === 'number' ? `$${invoice.amount.toFixed(2)}` : '-'}</div>
          <div style={labelStyle}>Issue Date</div>
          <div style={valueStyle}>{invoice.issueDate || '-'}</div>
          <div style={labelStyle}>Due Date</div>
          <div style={valueStyle}>{invoice.dueDate || '-'}</div>
          <div style={labelStyle}>Date Delivered</div>
          <div style={valueStyle}>{invoice.dateDelivered || '-'}</div>
        </div>
        <div style={sectionStyle}>
          <div style={labelStyle}>Additional Information</div>
          <div style={valueStyle}>{invoice.additionalInfo || '-'}</div>
          <div style={labelStyle}>Terms and Conditions</div>
          <div style={valueStyle}>{invoice.terms || '-'}</div>
          {Array.isArray(invoice.attachments) && invoice.attachments.length > 0 && (
            <>
              <div style={{ ...labelStyle, marginTop: 10 }}>Attachments</div>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {invoice.attachments.map((att: any) => (
                  <li key={att.url} style={{ marginBottom: 4 }}>
                    <a href={att.url} target="_blank" rel="noopener noreferrer" style={{ color: '#007bff', textDecoration: 'underline' }}>
                      {att.name}
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
          <button onClick={onClose} style={{ padding: '10px 28px', background: '#eee', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 500, fontSize: 16 }}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default InvoiceViewModal; 