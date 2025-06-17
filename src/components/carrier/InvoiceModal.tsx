import React, { useState } from 'react';
import { db } from '../../../src/config/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  load: any;
  user: any;
}

const InvoiceModal: React.FC<InvoiceModalProps> = ({ isOpen, onClose, load, user }) => {
  const [form, setForm] = useState({
    carrierName: user?.displayName || '',
    carrierAddress: user?.address || '',
    carrierContact: user?.email || '',
    shipperName: load?.shipper || '',
    shipperAddress: '',
    shipperCityState: '',
    shipperContact: '',
    invoiceNumber: '',
    poNumber: load?.poNumber || '',
    jobDetails: '',
    rate: load?.payment || '',
    dateDelivered: '',
    dateDue: '',
    additionalInfo: '',
    terms: '',
    files: [] as File[],
  });
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setForm(prev => ({ ...prev, files: Array.from(e.target.files!) }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const now = new Date();
      await addDoc(collection(db, 'invoices'), {
        invoiceNumber: form.invoiceNumber,
        poNumber: form.poNumber,
        customer: form.shipperName,
        amount: typeof form.rate === 'string' ? parseFloat(form.rate) : form.rate,
        issueDate: now.toISOString().split('T')[0],
        dueDate: form.dateDue,
        status: 'Unpaid',
        carrierName: form.carrierName,
        carrierAddress: form.carrierAddress,
        carrierContact: form.carrierContact,
        shipperAddress: form.shipperAddress,
        shipperCityState: form.shipperCityState,
        shipperContact: form.shipperContact,
        jobDetails: form.jobDetails,
        dateDelivered: form.dateDelivered,
        additionalInfo: form.additionalInfo,
        terms: form.terms,
        files: [], // File upload logic can be added later
        createdAt: Timestamp.now(),
        loadId: load?.id || '',
        userId: user?.uid || '',
      });
      setSubmitting(false);
      onClose();
      navigate('/carrier/payments');
    } catch (err) {
      setSubmitting(false);
      alert('Failed to create invoice. Please try again.');
    }
  };

  if (!isOpen) return null;

  const inputStyle = {
    border: '1px solid #d1d5db',
    borderRadius: 5,
    padding: '10px 12px',
    fontSize: 15,
    background: '#fafbfc',
    marginBottom: 0,
    outline: 'none',
    boxSizing: 'border-box' as const,
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: 12, padding: 36, width: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
        <h2 style={{ marginTop: 0, marginBottom: 24, fontWeight: 700, fontSize: 28, letterSpacing: -1 }}>Create Invoice</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ borderBottom: '1px solid #eee', paddingBottom: 12, marginBottom: 8 }}>
            <h4 style={{ margin: 0, fontWeight: 600, color: '#007bff', fontSize: 18 }}>Carrier Info</h4>
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <input name="carrierName" value={form.carrierName} onChange={handleChange} placeholder="Company Name" style={{ flex: 1, ...inputStyle }} required />
              <input name="carrierAddress" value={form.carrierAddress} onChange={handleChange} placeholder="Address" style={{ flex: 2, ...inputStyle }} required />
            </div>
            <input name="carrierContact" value={form.carrierContact} onChange={handleChange} placeholder="Primary Contact" style={{ width: '100%', marginTop: 8, ...inputStyle }} required />
          </div>
          <div style={{ borderBottom: '1px solid #eee', paddingBottom: 12, marginBottom: 8 }}>
            <h4 style={{ margin: 0, fontWeight: 600, color: '#007bff', fontSize: 18 }}>Shipper Info</h4>
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <input name="shipperName" value={form.shipperName} onChange={handleChange} placeholder="Shipper Name" style={{ flex: 1, ...inputStyle }} required />
              <input name="shipperAddress" value={form.shipperAddress} onChange={handleChange} placeholder="Address" style={{ flex: 2, ...inputStyle }} />
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <input name="shipperCityState" value={form.shipperCityState} onChange={handleChange} placeholder="City & State" style={{ flex: 1, ...inputStyle }} />
              <input name="shipperContact" value={form.shipperContact} onChange={handleChange} placeholder="Contact" style={{ flex: 1, ...inputStyle }} />
            </div>
          </div>
          <div style={{ borderBottom: '1px solid #eee', paddingBottom: 12, marginBottom: 8 }}>
            <h4 style={{ margin: 0, fontWeight: 600, color: '#007bff', fontSize: 18 }}>Invoice Details</h4>
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <input name="invoiceNumber" value={form.invoiceNumber} onChange={handleChange} placeholder="Invoice Number" style={{ flex: 1, ...inputStyle }} required />
              <input name="poNumber" value={form.poNumber} onChange={handleChange} placeholder="PO Number" style={{ flex: 1, ...inputStyle }} required />
            </div>
            <textarea name="jobDetails" value={form.jobDetails} onChange={handleChange} placeholder="Job Details" style={{ width: '100%', marginTop: 8, ...inputStyle, minHeight: 40, resize: 'vertical' }} rows={2} />
            <input name="rate" value={form.rate} onChange={handleChange} placeholder="Rate" style={{ width: '100%', marginTop: 8, ...inputStyle }} required />
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <input name="dateDelivered" type="date" value={form.dateDelivered} onChange={handleChange} style={{ flex: 1, ...inputStyle }} required />
              <input name="dateDue" type="date" value={form.dateDue} onChange={handleChange} style={{ flex: 1, ...inputStyle }} required />
            </div>
          </div>
          <div style={{ borderBottom: '1px solid #eee', paddingBottom: 12, marginBottom: 8 }}>
            <h4 style={{ margin: 0, fontWeight: 600, color: '#007bff', fontSize: 18 }}>Additional Information</h4>
            <textarea name="additionalInfo" value={form.additionalInfo} onChange={handleChange} placeholder="Additional Information" style={{ width: '100%', marginTop: 8, ...inputStyle, minHeight: 40, resize: 'vertical' }} rows={2} />
            <textarea name="terms" value={form.terms} onChange={handleChange} placeholder="Terms and Conditions" style={{ width: '100%', marginTop: 8, ...inputStyle, minHeight: 40, resize: 'vertical' }} rows={2} />
          </div>
          <div style={{ marginTop: 8 }}>
            <label style={{ fontWeight: 500, color: '#333', marginBottom: 6, display: 'block' }}>Attach Files</label>
            <input name="files" type="file" multiple onChange={handleFileChange} style={{ ...inputStyle, padding: 6 }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
            <button type="button" onClick={onClose} style={{ padding: '10px 28px', background: '#eee', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 500, fontSize: 16 }}>Cancel</button>
            <button type="submit" disabled={submitting} style={{ padding: '10px 28px', background: '#28a745', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 16, boxShadow: '0 2px 8px rgba(40,167,69,0.08)' }}>{submitting ? 'Submitting...' : 'Submit'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InvoiceModal; 