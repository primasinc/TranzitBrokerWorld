import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { db } from '../../config/firebase';
import { doc, setDoc, collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import styles from './Login.module.css';

// New broker-specific types
type BusinessType = 'broker' | 'broker_carrier';
type ServiceType = 'freight_brokerage' | 'carrier_operations' | 'both';

interface BrokerRegistrationData {
  // Company Information
  companyName: string;
  businessType: BusinessType;
  services: ServiceType;
  
  // Company Representative
  companyRep: string;
  email: string;
  phoneNumber: string;
  
  // Business Details
  mcNumber?: string;
  dotNumber?: string;
  taxId?: string;
  dunsNumber?: string;
  
  // Service Configuration
  primaryServiceArea: string;
  serviceAreas: string[];
  
  // Carrier Operations (if applicable)
  hasCarrierOperations: boolean;
  carrierEquipment?: string[];
  carrierInsurance?: boolean;
  
  // Password
  password: string;
  confirmPassword: string;
}

const BrokerRegister: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<BrokerRegistrationData>({
    companyName: '',
    businessType: 'broker',
    services: 'freight_brokerage',
    companyRep: '',
    email: '',
    phoneNumber: '',
    mcNumber: '',
    dotNumber: '',
    taxId: '',
    dunsNumber: '',
    primaryServiceArea: '',
    serviceAreas: [],
    hasCarrierOperations: false,
    carrierEquipment: [],
    carrierInsurance: false,
    password: '',
    confirmPassword: ''
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const handleInputChange = (field: keyof BrokerRegistrationData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: '' }));
    }
    
    // Real-time validation for certain fields
    if (field === 'email' || field === 'phoneNumber' || field === 'mcNumber' || field === 'dotNumber') {
      const error = validateField(field, value);
      if (error) {
        setFieldErrors(prev => ({ ...prev, [field]: error }));
      }
    }
  };

  const handleServiceAreaAdd = () => {
    if (formData.primaryServiceArea.trim()) {
      setFormData(prev => ({
        ...prev,
        serviceAreas: [...prev.serviceAreas, prev.primaryServiceArea.trim()],
        primaryServiceArea: ''
      }));
    }
  };

  const handleServiceAreaRemove = (index: number) => {
    setFormData(prev => ({
      ...prev,
      serviceAreas: prev.serviceAreas.filter((_, i) => i !== index)
    }));
  };

  const validateField = (field: keyof BrokerRegistrationData, value: any): string => {
    switch (field) {
      case 'companyName':
        if (!value.trim()) return 'Company name is required';
        if (value.trim().length < 2) return 'Company name must be at least 2 characters';
        if (value.trim().length > 100) return 'Company name must be less than 100 characters';
        return '';
      
      case 'companyRep':
        if (!value.trim()) return 'Company representative is required';
        if (value.trim().length < 2) return 'Representative name must be at least 2 characters';
        return '';
      
      case 'email':
        if (!value.trim()) return 'Email is required';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) return 'Please enter a valid email address';
        return '';
      
      case 'phoneNumber':
        if (!value.trim()) return 'Phone number is required';
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        if (!phoneRegex.test(value.replace(/[\s\-\(\)]/g, ''))) return 'Please enter a valid phone number';
        return '';
      
      case 'mcNumber':
        if (value && value.trim()) {
          const mcRegex = /^[A-Z]{2}\d{6}$/;
          if (!mcRegex.test(value.toUpperCase())) return 'MC number must be 2 letters followed by 6 digits';
        }
        return '';
      
      case 'dotNumber':
        if (value && value.trim()) {
          const dotRegex = /^\d{8}$/;
          if (!dotRegex.test(value)) return 'DOT number must be 8 digits';
        }
        return '';
      
      case 'password':
        if (!value) return 'Password is required';
        if (value.length < 8) return 'Password must be at least 8 characters';
        if (!/(?=.*[a-z])/.test(value)) return 'Password must contain at least one lowercase letter';
        if (!/(?=.*[A-Z])/.test(value)) return 'Password must contain at least one uppercase letter';
        if (!/(?=.*\d)/.test(value)) return 'Password must contain at least one number';
        return '';
      
      case 'confirmPassword':
        if (!value) return 'Please confirm your password';
        if (value !== formData.password) return 'Passwords do not match';
        return '';
      
      default:
        return '';
    }
  };

  const validateStep = (step: number): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    const newFieldErrors: Record<string, string> = {};

    switch (step) {
      case 1:
        // Validate company information
        ['companyName', 'companyRep', 'email', 'phoneNumber'].forEach(field => {
          const error = validateField(field as keyof BrokerRegistrationData, formData[field as keyof BrokerRegistrationData]);
          if (error) {
            errors.push(error);
            newFieldErrors[field] = error;
          }
        });

        // Validate optional business numbers
        if (formData.mcNumber) {
          const mcError = validateField('mcNumber', formData.mcNumber);
          if (mcError) {
            errors.push(mcError);
            newFieldErrors.mcNumber = mcError;
          }
        }

        if (formData.dotNumber) {
          const dotError = validateField('dotNumber', formData.dotNumber);
          if (dotError) {
            errors.push(dotError);
            newFieldErrors.dotNumber = dotError;
          }
        }
        break;

      case 2:
        if (!formData.primaryServiceArea.trim()) {
          errors.push('Primary service area is required');
          newFieldErrors.primaryServiceArea = 'Primary service area is required';
        }
        if (formData.serviceAreas.length === 0) {
          errors.push('At least one service area is required');
          newFieldErrors.serviceAreas = 'At least one service area is required';
        }
        break;

      case 3:
        const passwordError = validateField('password', formData.password);
        const confirmPasswordError = validateField('confirmPassword', formData.confirmPassword);
        
        if (passwordError) {
          errors.push(passwordError);
          newFieldErrors.password = passwordError;
        }
        if (confirmPasswordError) {
          errors.push(confirmPasswordError);
          newFieldErrors.confirmPassword = confirmPasswordError;
        }
        break;
    }

    setFieldErrors(newFieldErrors);
    return { isValid: errors.length === 0, errors };
  };

  const nextStep = () => {
    const validation = validateStep(currentStep);
    if (validation.isValid) {
      setCurrentStep(prev => Math.min(prev + 1, 3));
      setValidationErrors([]);
    } else {
      setValidationErrors(validation.errors);
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const checkDuplicateCompany = async (companyName: string, email: string): Promise<{ hasDuplicate: boolean; message: string }> => {
    try {
      // Check if company name already exists
      const companiesRef = collection(db, 'companies');
      const companyQuery = query(companiesRef, where('name', '==', companyName));
      const companySnapshot = await getDocs(companyQuery);
      
      if (!companySnapshot.empty) {
        return { hasDuplicate: true, message: 'A company with this name already exists' };
      }

      // Check if email already exists in companyUsers
      const companyUsersRef = collection(db, 'companyUsers');
      const emailQuery = query(companyUsersRef, where('email', '==', email));
      const emailSnapshot = await getDocs(emailQuery);
      
      if (!emailSnapshot.empty) {
        return { hasDuplicate: true, message: 'An account with this email already exists' };
      }

      return { hasDuplicate: false, message: '' };
    } catch (error) {
      console.error('Error checking for duplicates:', error);
      return { hasDuplicate: false, message: '' };
    }
  };

  const getPasswordStrength = (password: string): number => {
    let strength = 0;
    
    if (password.length >= 8) strength += 20;
    if (password.length >= 12) strength += 10;
    if (/(?=.*[a-z])/.test(password)) strength += 20;
    if (/(?=.*[A-Z])/.test(password)) strength += 20;
    if (/(?=.*\d)/.test(password)) strength += 20;
    if (/(?=.*[!@#$%^&*(),.?":{}|<>])/.test(password)) strength += 10;
    
    return Math.min(strength, 100);
  };

  const getPasswordStrengthClass = (password: string): string => {
    const strength = getPasswordStrength(password);
    if (strength < 40) return styles.weak;
    if (strength < 70) return styles.medium;
    return styles.strong;
  };

  const getPasswordStrengthText = (password: string): string => {
    const strength = getPasswordStrength(password);
    if (strength < 40) return 'Weak';
    if (strength < 70) return 'Medium';
    return 'Strong';
  };

  const validateBusinessNumbers = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    // Validate MC Number format if provided
    if (formData.mcNumber && formData.mcNumber.trim()) {
      const mcRegex = /^[A-Z]{2}\d{6}$/;
      if (!mcRegex.test(formData.mcNumber.toUpperCase())) {
        errors.push('MC number must be 2 letters followed by 6 digits (e.g., MC123456)');
      }
    }
    
    // Validate DOT Number format if provided
    if (formData.dotNumber && formData.dotNumber.trim()) {
      const dotRegex = /^\d{8}$/;
      if (!dotRegex.test(formData.dotNumber)) {
        errors.push('DOT number must be exactly 8 digits');
      }
    }
    
    return { isValid: errors.length === 0, errors };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setValidationErrors([]);

    try {
      // Final validation before submission
      const businessValidation = validateBusinessNumbers();
      if (!businessValidation.isValid) {
        setValidationErrors(businessValidation.errors);
        setLoading(false);
        return;
      }

      // Check for duplicate company/email
      const duplicateCheck = await checkDuplicateCompany(formData.companyName, formData.email);
      if (duplicateCheck.hasDuplicate) {
        setError(duplicateCheck.message);
        setLoading(false);
        return;
      }

      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      const userId = userCredential.user.uid;
      const companyId = `company_${userId}`;

      // Create company record
      const companyData = {
        id: companyId,
        name: formData.companyName,
        type: formData.businessType,
        status: 'pending',
        
        // Business Information
        mcNumber: formData.mcNumber || null,
        dotNumber: formData.dotNumber || null,
        taxId: formData.taxId || null,
        dunsNumber: formData.dunsNumber || null,
        
        // Service Configuration
        services: formData.services === 'both' ? ['freight_brokerage', 'carrier_operations'] : [formData.services],
        serviceAreas: formData.serviceAreas,
        primaryServiceArea: formData.serviceAreas[0] || '',
        
        // Carrier Operations
        hasCarrierOperations: formData.hasCarrierOperations,
        carrierEquipment: formData.carrierEquipment || [],
        carrierInsurance: formData.carrierInsurance || false,
        
        // Business Type
        businessType: 'logistics',
        capabilities: ['freight_management', 'brokerage'],
        
        // Timestamps
        createdAt: new Date(),
        updatedAt: new Date(),
        verifiedAt: null,
        
        // Metadata
        tags: ['broker_portal', 'new_registration'],
        notes: 'Registered through broker portal'
      };

      // Create company user record
      const companyUserData = {
        id: userId,
        companyId: companyId,
        
        // User Information
        email: formData.email,
        companyName: formData.companyName,
        companyRep: formData.companyRep,
        phoneNumber: formData.phoneNumber,
        
        // User Type and Role
        userType: formData.businessType,
        companyUserRole: 'owner',
        role: 'company_owner',
        
        // Status and Permissions
        status: 'pending',
        approvalStatus: 'pending',
        isAdmin: false,
        isSuperAdmin: false,
        
        // Permissions based on business type
        permissions: formData.businessType === 'broker_carrier' 
          ? ['admin', 'load_management', 'carrier_management', 'user_management', 'carrier_operations']
          : ['admin', 'load_management', 'carrier_management', 'user_management'],
        
        accessLevel: 'full',
        
        // Timestamps
        createdAt: new Date(),
        updatedAt: new Date(),
        
        // Migration tracking
        migratedFrom: {
          collection: 'broker_registration',
          migratedAt: new Date(),
          source: 'broker_portal'
        }
      };

      // Save to new collections
      await setDoc(doc(db, 'companies', companyId), companyData);
      await setDoc(doc(db, 'companyUsers', userId), companyUserData);

      console.log('Broker registration successful:', { companyId, userId });
      setRegistrationSuccess(true);

    } catch (err: any) {
      console.error('Broker registration error:', err);
      setError(err.message || 'Failed to create broker account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (registrationSuccess) {
    return (
      <div className={styles.loginContainer}>
        <div className={styles.loginBox}>
          <h1>Broker Registration Successful! 🎉</h1>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <p>Welcome to Tranzit Broker Portal!</p>
            <p>Your broker account has been created and is pending approval.</p>
            <p>You will receive an email notification once your account is approved.</p>
            <p>This process typically takes 24-48 hours.</p>
            <p><strong>Next Steps:</strong></p>
            <ul style={{ textAlign: 'left', display: 'inline-block' }}>
              <li>Complete company verification</li>
              <li>Set up your broker profile</li>
              <li>Start posting loads</li>
              <li>Build your carrier network</li>
            </ul>
          </div>
          <button 
            className={styles.loginButton}
            onClick={() => navigate('/login')}
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginBox}>
        <h1>Broker Portal Registration</h1>
        <p style={{ textAlign: 'center', marginBottom: '20px', color: '#666' }}>
          Join the Tranzit Broker Portal and start managing freight operations
        </p>
        
        {/* Progress Bar */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ color: currentStep >= 1 ? '#007bff' : '#ccc' }}>Company Info</span>
            <span style={{ color: currentStep >= 2 ? '#007bff' : '#ccc' }}>Service Areas</span>
            <span style={{ color: currentStep >= 3 ? '#007bff' : '#ccc' }}>Account Setup</span>
          </div>
          <div style={{ 
            height: '4px', 
            backgroundColor: '#eee', 
            borderRadius: '2px',
            overflow: 'hidden'
          }}>
            <div style={{ 
              width: `${(currentStep / 3) * 100}%`, 
              height: '100%', 
              backgroundColor: '#007bff',
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>
        
                 {error && <div className={styles.error}>{error}</div>}
         
         {/* Step Validation Errors */}
         {validationErrors.length > 0 && (
           <div className={styles.validationErrors}>
             <h4 style={{ margin: '0 0 10px 0', color: '#dc3545' }}>Please fix the following errors:</h4>
             <ul style={{ margin: '0', paddingLeft: '20px', color: '#dc3545' }}>
               {validationErrors.map((error, index) => (
                 <li key={index}>{error}</li>
               ))}
             </ul>
           </div>
         )}
        
        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Step 1: Company Information */}
          {currentStep === 1 && (
            <>
                             <div className={styles.inputGroup}>
                 <label htmlFor="companyName">Company Name<span style={{color: 'red'}}>*</span></label>
                 <input
                   type="text"
                   id="companyName"
                   value={formData.companyName}
                   onChange={(e) => handleInputChange('companyName', e.target.value)}
                   className={`${styles.input} ${fieldErrors.companyName ? styles.inputError : ''}`}
                   placeholder="Enter your company name"
                   required
                 />
                 {fieldErrors.companyName && (
                   <div className={styles.fieldError}>{fieldErrors.companyName}</div>
                 )}
               </div>

              <div className={styles.inputGroup}>
                <label htmlFor="businessType">Business Type<span style={{color: 'red'}}>*</span></label>
                <select
                  id="businessType"
                  value={formData.businessType}
                  onChange={(e) => handleInputChange('businessType', e.target.value as BusinessType)}
                  className={styles.select}
                >
                  <option value="broker">Freight Broker Only</option>
                  <option value="broker_carrier">Broker with Carrier Operations</option>
                </select>
              </div>

                             <div className={styles.inputGroup}>
                 <label htmlFor="companyRep">Company Representative<span style={{color: 'red'}}>*</span></label>
                 <input
                   type="text"
                   id="companyRep"
                   value={formData.companyRep}
                   onChange={(e) => handleInputChange('companyRep', e.target.value)}
                   className={`${styles.input} ${fieldErrors.companyRep ? styles.inputError : ''}`}
                   placeholder="Enter company representative name"
                   required
                 />
                 {fieldErrors.companyRep && (
                   <div className={styles.fieldError}>{fieldErrors.companyRep}</div>
                 )}
               </div>

                             <div className={styles.inputGroup}>
                 <label htmlFor="email">Email<span style={{color: 'red'}}>*</span></label>
                 <input
                   type="email"
                   id="email"
                   value={formData.email}
                   onChange={(e) => handleInputChange('email', e.target.value)}
                   className={`${styles.input} ${fieldErrors.email ? styles.inputError : ''}`}
                   placeholder="Enter your email"
                   required
                 />
                 {fieldErrors.email && (
                   <div className={styles.fieldError}>{fieldErrors.email}</div>
                 )}
               </div>

                             <div className={styles.inputGroup}>
                 <label htmlFor="phoneNumber">Phone Number<span style={{color: 'red'}}>*</span></label>
                 <input
                   type="tel"
                   id="phoneNumber"
                   value={formData.phoneNumber}
                   onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                   className={`${styles.input} ${fieldErrors.phoneNumber ? styles.inputError : ''}`}
                   placeholder="Enter your phone number"
                   required
                 />
                 {fieldErrors.phoneNumber && (
                   <div className={styles.fieldError}>{fieldErrors.phoneNumber}</div>
                 )}
               </div>

                             <div className={styles.inputGroup}>
                 <label htmlFor="mcNumber">MC Number (Optional)</label>
                 <input
                   type="text"
                   id="mcNumber"
                   value={formData.mcNumber}
                   onChange={(e) => handleInputChange('mcNumber', e.target.value)}
                   className={`${styles.input} ${fieldErrors.mcNumber ? styles.inputError : ''}`}
                   placeholder="Enter MC number if applicable"
                 />
                 {fieldErrors.mcNumber && (
                   <div className={styles.fieldError}>{fieldErrors.mcNumber}</div>
                 )}
               </div>

               <div className={styles.inputGroup}>
                 <label htmlFor="dotNumber">DOT Number (Optional)</label>
                 <input
                   type="text"
                   id="dotNumber"
                   value={formData.dotNumber}
                   onChange={(e) => handleInputChange('dotNumber', e.target.value)}
                   className={`${styles.input} ${fieldErrors.dotNumber ? styles.inputError : ''}`}
                   placeholder="Enter DOT number if applicable"
                 />
                 {fieldErrors.dotNumber && (
                   <div className={styles.fieldError}>{fieldErrors.dotNumber}</div>
                 )}
               </div>
            </>
          )}

          {/* Step 2: Service Areas */}
          {currentStep === 2 && (
            <>
                             <div className={styles.inputGroup}>
                 <label htmlFor="primaryServiceArea">Primary Service Area<span style={{color: 'red'}}>*</span></label>
                 <input
                   type="text"
                   id="primaryServiceArea"
                   value={formData.primaryServiceArea}
                   onChange={(e) => handleInputChange('primaryServiceArea', e.target.value)}
                   className={`${styles.input} ${fieldErrors.primaryServiceArea ? styles.inputError : ''}`}
                   placeholder="e.g., Houston, TX or Midwest Region"
                   required
                 />
                 {fieldErrors.primaryServiceArea && (
                   <div className={styles.fieldError}>{fieldErrors.primaryServiceArea}</div>
                 )}
                <button
                  type="button"
                  onClick={handleServiceAreaAdd}
                  style={{
                    marginTop: '5px',
                    padding: '5px 10px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Add Service Area
                </button>
              </div>

              {formData.serviceAreas.length > 0 && (
                <div className={styles.inputGroup}>
                  <label>Service Areas Added:</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                    {formData.serviceAreas.map((area, index) => (
                      <span
                        key={index}
                        style={{
                          backgroundColor: '#007bff',
                          color: 'white',
                          padding: '5px 10px',
                          borderRadius: '15px',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                      >
                        {area}
                        <button
                          type="button"
                          onClick={() => handleServiceAreaRemove(index)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '16px',
                            padding: '0',
                            margin: '0'
                          }}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {formData.businessType === 'broker_carrier' && (
                <>
                  <div className={styles.inputGroup}>
                    <label>
                      <input
                        type="checkbox"
                        checked={formData.hasCarrierOperations}
                        onChange={(e) => handleInputChange('hasCarrierOperations', e.target.checked)}
                      />
                      We also operate as a carrier
                    </label>
                  </div>

                  {formData.hasCarrierOperations && (
                    <>
                      <div className={styles.inputGroup}>
                        <label>Carrier Equipment (Optional)</label>
                        <input
                          type="text"
                          value={formData.carrierEquipment?.join(', ') || ''}
                          onChange={(e) => handleInputChange('carrierEquipment', e.target.value.split(',').map(s => s.trim()))}
                          className={styles.input}
                          placeholder="e.g., Dry van, Flatbed, Reefer"
                        />
                      </div>

                      <div className={styles.inputGroup}>
                        <label>
                          <input
                            type="checkbox"
                            checked={formData.carrierInsurance}
                            onChange={(e) => handleInputChange('carrierInsurance', e.target.checked)}
                          />
                          We have carrier insurance
                        </label>
                      </div>
                    </>
                  )}
                </>
              )}
            </>
          )}

          {/* Step 3: Account Setup */}
          {currentStep === 3 && (
            <>
                             <div className={styles.inputGroup}>
                 <label htmlFor="password">Password<span style={{color: 'red'}}>*</span></label>
                 <input
                   type="password"
                   id="password"
                   value={formData.password}
                   onChange={(e) => handleInputChange('password', e.target.value)}
                   className={`${styles.input} ${fieldErrors.password ? styles.inputError : ''}`}
                   placeholder="Create a password (min 8 characters)"
                   required
                   minLength={8}
                 />
                 {fieldErrors.password && (
                   <div className={styles.fieldError}>{fieldErrors.password}</div>
                 )}
                 
                 {/* Password Strength Indicator */}
                 {formData.password && (
                   <div className={styles.passwordStrength}>
                     <div className={styles.strengthBar}>
                       <div 
                         className={`${styles.strengthFill} ${getPasswordStrengthClass(formData.password)}`}
                         style={{ width: `${getPasswordStrength(formData.password)}%` }}
                       />
                     </div>
                     <span className={styles.strengthText}>
                       {getPasswordStrengthText(formData.password)}
                     </span>
                   </div>
                 )}
               </div>

               <div className={styles.inputGroup}>
                 <label htmlFor="confirmPassword">Confirm Password<span style={{color: 'red'}}>*</span></label>
                 <input
                   type="password"
                   id="confirmPassword"
                   value={formData.confirmPassword}
                   onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                   className={`${styles.input} ${fieldErrors.confirmPassword ? styles.inputError : ''}`}
                   placeholder="Confirm your password"
                   required
                   minLength={8}
                 />
                 {fieldErrors.confirmPassword && (
                   <div className={styles.fieldError}>{fieldErrors.confirmPassword}</div>
                 )}
               </div>

              <div style={{ 
                backgroundColor: '#f8f9fa', 
                padding: '15px', 
                borderRadius: '5px', 
                marginBottom: '20px',
                border: '1px solid #dee2e6'
              }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#495057' }}>What You'll Get:</h4>
                <ul style={{ margin: '0', paddingLeft: '20px', color: '#6c757d' }}>
                  <li>Full broker portal access</li>
                  <li>Load posting and management</li>
                  <li>Carrier network building tools</li>
                  <li>Rate negotiation platform</li>
                  <li>Commission tracking system</li>
                  {formData.businessType === 'broker_carrier' && (
                    <li>Carrier operations dashboard</li>
                  )}
                </ul>
              </div>
            </>
          )}

          {/* Navigation Buttons */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between' }}>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={prevStep}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Previous
              </button>
            )}
            
            {currentStep < 3 ? (
              <button
                type="button"
                onClick={nextStep}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  marginLeft: 'auto'
                }}
              >
                Next
              </button>
            ) : (
              <button 
                type="submit" 
                className={styles.loginButton}
                disabled={loading}
                style={{ marginLeft: 'auto' }}
              >
                {loading ? 'Creating Broker Account...' : 'Create Broker Account'}
              </button>
            )}
          </div>

          <button 
            type="button" 
            className={styles.registerButton}
            onClick={() => navigate('/login')}
            style={{ marginTop: '20px' }}
          >
            Already have an account? Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default BrokerRegister;
