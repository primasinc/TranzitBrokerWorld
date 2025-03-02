import React, { useState } from 'react';
import styles from './PaymentSettingsModal.module.css';

interface PaymentSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: PaymentSettings;
  onSaveSettings: (settings: PaymentSettings) => void;
}

export interface PaymentSettings {
  preferredPaymentMethod: 'directDeposit' | 'check' | 'wire';
  bankInfo: {
    accountName: string;
    accountNumber: string;
    routingNumber: string;
    bankName: string;
  };
  factoring: {
    defaultFactoringOption: 'platform' | 'external' | 'none';
    externalFactoringCompany: string;
    externalFactoringEmail: string;
    autoFactorLoadsOver: number;
  };
  notifications: {
    emailNotifications: boolean;
    smsNotifications: boolean;
    paymentStatusChanges: boolean;
    paymentReminders: boolean;
    weeklyReports: boolean;
  };
  reportTemplates: {
    name: string;
    type: 'all' | 'paid' | 'pending' | 'custom';
    format: 'csv' | 'pdf';
    fields: string[];
  }[];
}

const PaymentSettingsModal: React.FC<PaymentSettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  settings,
  onSaveSettings
}) => {
  const [currentSettings, setCurrentSettings] = useState<PaymentSettings>(settings);
  const [activeTab, setActiveTab] = useState<'payment' | 'factoring' | 'notifications' | 'templates'>('payment');
  const [saving, setSaving] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  
  const handleInputChange = (section: keyof PaymentSettings, field: string, value: any) => {
    setCurrentSettings(prev => ({
      ...prev,
      [section]: {
        ...(prev[section] as object),
        [field]: value
      }
    }));
  };
  
  const handleBankInfoChange = (field: string, value: string) => {
    setCurrentSettings(prev => ({
      ...prev,
      bankInfo: {
        ...prev.bankInfo,
        [field]: value
      }
    }));
  };
  
  const handleNotificationChange = (field: string, checked: boolean) => {
    setCurrentSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [field]: checked
      }
    }));
  };
  
  const handleSaveTemplate = () => {
    if (!newTemplateName.trim()) return;
    
    const newTemplate = {
      name: newTemplateName,
      type: 'all' as const,
      format: 'csv' as const,
      fields: ['loadId', 'date', 'customer', 'amount', 'status']
    };
    
    setCurrentSettings(prev => ({
      ...prev,
      reportTemplates: [...prev.reportTemplates, newTemplate]
    }));
    
    setNewTemplateName('');
  };
  
  const handleDeleteTemplate = (index: number) => {
    setCurrentSettings(prev => ({
      ...prev,
      reportTemplates: prev.reportTemplates.filter((_, i) => i !== index)
    }));
  };
  
  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      onSaveSettings(currentSettings);
      onClose();
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2>Payment Settings</h2>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>
        
        <div className={styles.tabsContainer}>
          <button 
            className={`${styles.tabButton} ${activeTab === 'payment' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('payment')}
          >
            Payment Methods
          </button>
          <button 
            className={`${styles.tabButton} ${activeTab === 'factoring' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('factoring')}
          >
            Factoring
          </button>
          <button 
            className={`${styles.tabButton} ${activeTab === 'notifications' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('notifications')}
          >
            Notifications
          </button>
          <button 
            className={`${styles.tabButton} ${activeTab === 'templates' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('templates')}
          >
            Report Templates
          </button>
        </div>
        
        <div className={styles.content}>
          {activeTab === 'payment' && (
            <div className={styles.paymentTab}>
              <h3>Preferred Payment Method</h3>
              <div className={styles.radioGroup}>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={currentSettings.preferredPaymentMethod === 'directDeposit'}
                    onChange={() => handleInputChange('preferredPaymentMethod', '', 'directDeposit')}
                  />
                  <span>Direct Deposit (ACH)</span>
                </label>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={currentSettings.preferredPaymentMethod === 'check'}
                    onChange={() => handleInputChange('preferredPaymentMethod', '', 'check')}
                  />
                  <span>Check</span>
                </label>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={currentSettings.preferredPaymentMethod === 'wire'}
                    onChange={() => handleInputChange('preferredPaymentMethod', '', 'wire')}
                  />
                  <span>Wire Transfer</span>
                </label>
              </div>
              
              <h3>Bank Information</h3>
              <div className={styles.formGroup}>
                <label>Account Name</label>
                <input
                  type="text"
                  value={currentSettings.bankInfo.accountName}
                  onChange={(e) => handleBankInfoChange('accountName', e.target.value)}
                  placeholder="Enter account name"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Account Number</label>
                <input
                  type="text"
                  value={currentSettings.bankInfo.accountNumber}
                  onChange={(e) => handleBankInfoChange('accountNumber', e.target.value)}
                  placeholder="Enter account number"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Routing Number</label>
                <input
                  type="text"
                  value={currentSettings.bankInfo.routingNumber}
                  onChange={(e) => handleBankInfoChange('routingNumber', e.target.value)}
                  placeholder="Enter routing number"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Bank Name</label>
                <input
                  type="text"
                  value={currentSettings.bankInfo.bankName}
                  onChange={(e) => handleBankInfoChange('bankName', e.target.value)}
                  placeholder="Enter bank name"
                />
              </div>
            </div>
          )}
          
          {activeTab === 'factoring' && (
            <div className={styles.factoringTab}>
              <h3>Default Factoring Option</h3>
              <div className={styles.radioGroup}>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="factoringOption"
                    checked={currentSettings.factoring.defaultFactoringOption === 'platform'}
                    onChange={() => handleInputChange('factoring', 'defaultFactoringOption', 'platform')}
                  />
                  <span>Factor through Tranzit Platform</span>
                </label>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="factoringOption"
                    checked={currentSettings.factoring.defaultFactoringOption === 'external'}
                    onChange={() => handleInputChange('factoring', 'defaultFactoringOption', 'external')}
                  />
                  <span>Use External Factoring Company</span>
                </label>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="factoringOption"
                    checked={currentSettings.factoring.defaultFactoringOption === 'none'}
                    onChange={() => handleInputChange('factoring', 'defaultFactoringOption', 'none')}
                  />
                  <span>Don't Use Factoring</span>
                </label>
              </div>
              
              {currentSettings.factoring.defaultFactoringOption === 'external' && (
                <>
                  <h3>External Factoring Company</h3>
                  <div className={styles.formGroup}>
                    <label>Company Name</label>
                    <input
                      type="text"
                      value={currentSettings.factoring.externalFactoringCompany}
                      onChange={(e) => handleInputChange('factoring', 'externalFactoringCompany', e.target.value)}
                      placeholder="Enter company name"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Contact Email</label>
                    <input
                      type="email"
                      value={currentSettings.factoring.externalFactoringEmail}
                      onChange={(e) => handleInputChange('factoring', 'externalFactoringEmail', e.target.value)}
                      placeholder="Enter contact email"
                    />
                  </div>
                </>
              )}
              
              <h3>Auto-Factoring</h3>
              <div className={styles.formGroup}>
                <label>Automatically factor loads over</label>
                <div className={styles.inputWithAddon}>
                  <span className={styles.inputAddon}>$</span>
                  <input
                    type="number"
                    value={currentSettings.factoring.autoFactorLoadsOver}
                    onChange={(e) => handleInputChange('factoring', 'autoFactorLoadsOver', parseInt(e.target.value) || 0)}
                    placeholder="Enter amount"
                  />
                </div>
                <p className={styles.helpText}>Set to 0 to disable auto-factoring</p>
              </div>
            </div>
          )}
          
          {activeTab === 'notifications' && (
            <div className={styles.notificationsTab}>
              <h3>Notification Channels</h3>
              <div className={styles.checkboxGroup}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={currentSettings.notifications.emailNotifications}
                    onChange={(e) => handleNotificationChange('emailNotifications', e.target.checked)}
                  />
                  <span>Email Notifications</span>
                </label>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={currentSettings.notifications.smsNotifications}
                    onChange={(e) => handleNotificationChange('smsNotifications', e.target.checked)}
                  />
                  <span>SMS Notifications</span>
                </label>
              </div>
              
              <h3>Notification Types</h3>
              <div className={styles.checkboxGroup}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={currentSettings.notifications.paymentStatusChanges}
                    onChange={(e) => handleNotificationChange('paymentStatusChanges', e.target.checked)}
                  />
                  <span>Payment Status Changes</span>
                </label>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={currentSettings.notifications.paymentReminders}
                    onChange={(e) => handleNotificationChange('paymentReminders', e.target.checked)}
                  />
                  <span>Payment Reminders</span>
                </label>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={currentSettings.notifications.weeklyReports}
                    onChange={(e) => handleNotificationChange('weeklyReports', e.target.checked)}
                  />
                  <span>Weekly Payment Reports</span>
                </label>
              </div>
            </div>
          )}
          
          {activeTab === 'templates' && (
            <div className={styles.templatesTab}>
              <h3>Saved Report Templates</h3>
              
              {currentSettings.reportTemplates.length > 0 ? (
                <div className={styles.templatesList}>
                  {currentSettings.reportTemplates.map((template, index) => (
                    <div key={index} className={styles.templateItem}>
                      <div className={styles.templateInfo}>
                        <div className={styles.templateName}>{template.name}</div>
                        <div className={styles.templateDetails}>
                          {template.type === 'all' ? 'All Payments' : 
                           template.type === 'paid' ? 'Paid Payments' : 
                           template.type === 'pending' ? 'Pending Payments' : 'Custom'}
                          {' • '}
                          {template.format.toUpperCase()}
                        </div>
                      </div>
                      <button 
                        className={styles.deleteTemplateButton}
                        onClick={() => handleDeleteTemplate(index)}
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={styles.noTemplates}>No saved templates yet.</p>
              )}
              
              <h3>Add New Template</h3>
              <div className={styles.addTemplateForm}>
                <div className={styles.formGroup}>
                  <label>Template Name</label>
                  <input
                    type="text"
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    placeholder="Enter template name"
                  />
                </div>
                <button 
                  className={styles.addTemplateButton}
                  onClick={handleSaveTemplate}
                  disabled={!newTemplateName.trim()}
                >
                  Save Template
                </button>
              </div>
            </div>
          )}
        </div>
        
        <div className={styles.actions}>
          <button 
            onClick={onClose} 
            className={styles.cancelButton}
            disabled={saving}
          >
            Cancel
          </button>
          <button 
            onClick={handleSaveSettings} 
            className={styles.saveButton}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentSettingsModal; 