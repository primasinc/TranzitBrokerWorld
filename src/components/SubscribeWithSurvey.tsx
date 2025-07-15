import React, { useState } from "react";
import { getFirestore, collection, addDoc, Timestamp } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";

const cardStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: 16,
  boxShadow: "0 4px 24px rgba(0,0,0,0.07)",
  padding: 32,
  maxWidth: 480,
  margin: "0 auto",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
};

const inputStyle: React.CSSProperties = {
  padding: "12px 16px",
  borderRadius: 8,
  border: "1px solid #d1d5db",
  fontSize: 16,
  marginRight: 12,
  width: 220,
  outline: "none",
  marginBottom: 0,
};

const buttonStyle: React.CSSProperties = {
  padding: "12px 28px",
  borderRadius: 8,
  border: "none",
  background: "linear-gradient(90deg, #00eaff 0%, #0f2027 100%)",
  color: "#fff",
  fontWeight: 700,
  fontSize: 16,
  cursor: "pointer",
  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  transition: "background 0.2s",
};

const modalOverlay: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  background: 'rgba(0,0,0,0.35)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const modalCard: React.CSSProperties = {
  background: '#fff',
  padding: 32,
  borderRadius: 16,
  minWidth: 340,
  maxWidth: 480,
  boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
  position: 'relative', // Ensure absolute children are positioned relative to this
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  margin: '18px 0 8px',
  fontWeight: 500,
  color: '#0f2027',
};

const textareaStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  minHeight: 48,
  borderRadius: 8,
  border: '1px solid #d1d5db',
  padding: '10px 12px',
  fontSize: 15,
  marginTop: 4,
  resize: 'vertical',
};

const selectStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  borderRadius: 8,
  border: '1px solid #d1d5db',
  padding: '10px 12px',
  fontSize: 15,
  marginTop: 4,
};

const statusStyle: React.CSSProperties = {
  marginTop: 18,
  color: '#00eaff',
  fontWeight: 600,
  fontSize: 16,
};

const SubscribeWithSurvey: React.FC = () => {
  const [email, setEmail] = useState("");
  const [showSurvey, setShowSurvey] = useState(false);
  const [answers, setAnswers] = useState({
    role: "",
    concern: "",
    tech: "",
  });
  const [status, setStatus] = useState("");

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowSurvey(true);
  };

  const handleSurveyChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setAnswers({ ...answers, [e.target.name]: e.target.value });
  };

  const handleSurveySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("Submitting...");
    try {
      // Save to Firestore
      const db = getFirestore();
      await addDoc(collection(db, "subscribers"), {
        email,
        ...answers,
        createdAt: Timestamp.now(),
      });

      // Call Cloud Function to send discount email
      const functions = getFunctions();
      const sendDiscountEmail = httpsCallable(functions, "sendDiscountEmail");
      await sendDiscountEmail({ email });

      setStatus("Thank you! Check your email for your 20% discount.");
      setShowSurvey(false);
      setEmail("");
      setAnswers({ role: "", concern: "", tech: "" });
    } catch (err) {
      setStatus("There was an error. Please try again.");
    }
  };

  return (
    <div style={{ width: '100%', background: '#f6fafd', padding: '36px 0 32px' }}>
      <div style={cardStyle}>
        <h2 style={{ fontWeight: 800, fontSize: 28, marginBottom: 8, color: '#0f2027' }}>Stay Connected</h2>
        <p style={{ color: '#444', marginBottom: 24, fontSize: 17, textAlign: 'center' }}>
          Get updates and be the first to know when Tranzit.io goes live.<br />
          <span style={{ color: '#00eaff', fontWeight: 600 }}>Answer 3 questions after subscribing for a 20% discount!</span>
        </p>
        <form style={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'center', marginBottom: 0 }} onSubmit={handleSubscribe}>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
            style={inputStyle}
          />
          <button type="submit" style={buttonStyle}>Subscribe</button>
        </form>
        {status && <div style={statusStyle}>{status}</div>}
      </div>

      {showSurvey && (
        <div className="modal" style={modalOverlay}>
          <form onSubmit={handleSurveySubmit} style={modalCard}>
            {/* X button to close modal */}
            <button
              type="button"
              aria-label="Close"
              onClick={() => setShowSurvey(false)}
              style={{
                position: 'absolute',
                top: 16,
                right: 20,
                background: 'none',
                border: 'none',
                fontSize: 24,
                color: '#888',
                cursor: 'pointer',
                zIndex: 10,
                fontWeight: 700,
              }}
            >
              ×
            </button>
            <h3 style={{ fontWeight: 700, fontSize: 22, marginBottom: 8, color: '#0f2027' }}>Thank you for subscribing!</h3>
            <p style={{ color: '#444', marginBottom: 18, fontSize: 16 }}>
              Answer 3 quick questions for a <span style={{ color: '#00eaff', fontWeight: 600 }}>20% discount</span> on your first year:
            </p>
            <label style={labelStyle}>
              Are you a supplier or carrier?
              <select name="role" value={answers.role} onChange={handleSurveyChange} required style={selectStyle}>
                <option value="">Select...</option>
                <option value="supplier">Supplier</option>
                <option value="carrier">Carrier</option>
              </select>
            </label>
            <label style={labelStyle}>
              What is your biggest concern in working directly with your shipper/carrier counterpart?
              <textarea name="concern" value={answers.concern} onChange={handleSurveyChange} required style={textareaStyle} />
            </label>
            <label style={labelStyle}>
              What can we do from the tech side to make your operations easier between you and your partner?
              <textarea name="tech" value={answers.tech} onChange={handleSurveyChange} required style={textareaStyle} />
            </label>
            <button type="submit" style={{ ...buttonStyle, width: '100%', marginTop: 18 }}>Submit for Discount</button>
          </form>
        </div>
      )}
    </div>
  );
};

export default SubscribeWithSurvey; 