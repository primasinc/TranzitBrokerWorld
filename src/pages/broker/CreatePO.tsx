import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './CreatePO.module.css';
import { db } from '../../config/firebase';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { PurchaseOrderForm } from '../../components/broker/forms/PurchaseOrderForm';
import { useAuth } from '../../contexts/AuthContext';

interface LocationState {
  editingPO?: any;
  isEditing?: boolean;
}

const CreatePO: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { editingPO, isEditing } = location.state as LocationState || {};
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    // Check if user is authenticated
    if (!isLoading && !isAuthenticated) {
      console.warn('User not authenticated');
      navigate('/login');
      return;
    }
  }, [isLoading, isAuthenticated, navigate]);

  // Clear messages when component unmounts
  useEffect(() => {
    return () => {
      setError(null);
      setSuccess(null);
    };
  }, []);

  const handleSubmit = async (data: any) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      // Check if user is authenticated
      if (!user?.uid) {
        setError('No current user found. Please log in again.');
        return;
      }
      
      const brokerId = user.uid;
      
      let poData: any;
      
      if (isEditing && editingPO) {
        // Update existing PO in new optimized collection
        const poRef = doc(db, 'brokerPurchaseOrders', editingPO.id);
        await updateDoc(poRef, {
          ...data,
          brokerId,
          updatedAt: serverTimestamp()
        });
        
        setSuccess('Purchase Order updated successfully!');
        
        // For editing, use the existing PO data
        poData = {
          ...editingPO,
          ...data,
          brokerId,
          updatedAt: serverTimestamp()
        };
      } else {
        // Create new PO
        poData = {
          ...data,
          brokerId,
          status: 'Processing',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
        await addDoc(collection(db, 'brokerPurchaseOrders'), poData);
        setSuccess('Purchase Order created successfully!');
      }
      
      // Navigate based on the selected option after a brief delay
      setTimeout(() => {
        if (data.carrierOption === 'carrier') {
          // Navigate to carrier partners selection with PO data
          navigate('/broker/carrier-partners', { 
            state: { 
              poData: poData,
              rate: data.rate || 0
            }
          });
        } else if (data.carrierOption === 'marketplace') {
          // Navigate back to purchase orders list for marketplace
          navigate('/broker/orders');
        } else {
          // Default navigation back to purchase orders list
          navigate('/broker/orders');
        }
      }, 1500);
      
    } catch (error) {
      console.error('Error saving purchase order:', error);
      setError('Failed to save purchase order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/broker/orders');
  };

  // Show loading state while authentication is being determined
  if (isLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Loading...</p>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    navigate('/login');
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>{isEditing ? 'Edit Purchase Order' : 'Create New Purchase Order'}</h1>
        <button 
          className={styles.backButton}
          onClick={handleCancel}
        >
          Back to Orders
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className={styles.errorMessage}>
          <span>⚠️ {error}</span>
          <button 
            onClick={() => setError(null)}
            className={styles.errorClose}
          >
            ×
          </button>
        </div>
      )}

      {/* Success Display */}
      {success && (
        <div className={styles.successMessage}>
          <span>✅ {success}</span>
          <p>Redirecting...</p>
        </div>
      )}

      <div className={styles.formContainer}>
        <PurchaseOrderForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          initialData={editingPO}
        />
      </div>

      {loading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner}></div>
          <p>{isEditing ? 'Updating...' : 'Creating...'}</p>
        </div>
      )}
    </div>
  );
};

export default CreatePO;
