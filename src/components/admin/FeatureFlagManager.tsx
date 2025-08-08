import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFeatureFlags } from '../../hooks/useFeatureFlags';
import { FeatureFlag } from '../../services/featureFlagService';
import styles from './FeatureFlagManager.module.css';

const FeatureFlagManager: React.FC = () => {
  const navigate = useNavigate();
  const { flags, isReady, updateFeatureFlag } = useFeatureFlags();
  const [editingFlag, setEditingFlag] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FeatureFlag>({
    enabled: false,
    rolloutPercentage: 0,
    userTypes: [],
    regions: [],
    maxUsers: 0,
    startDate: '',
    endDate: '',
    metadata: {
      description: '',
      owner: '',
      version: ''
    }
  });

  const handleEditFlag = (flagName: string) => {
    const flag = flags[flagName];
    setEditingFlag(flagName);
    setEditForm({
      enabled: flag.enabled,
      rolloutPercentage: flag.rolloutPercentage || 0,
      userTypes: flag.userTypes || [],
      regions: flag.regions || [],
      maxUsers: flag.maxUsers || 0,
      startDate: flag.startDate || '',
      endDate: flag.endDate || '',
      metadata: {
        description: flag.metadata?.description || '',
        owner: flag.metadata?.owner || '',
        version: flag.metadata?.version || ''
      }
    });
  };

  const handleSaveFlag = async () => {
    if (!editingFlag) return;

    try {
      await updateFeatureFlag(editingFlag, editForm);
      setEditingFlag(null);
    } catch (error) {
      console.error('Failed to update feature flag:', error);
      alert('Failed to update feature flag');
    }
  };

  const handleCancelEdit = () => {
    setEditingFlag(null);
  };

  const handleInputChange = (field: string, value: any) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleMetadataChange = (field: string, value: string) => {
    setEditForm(prev => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        [field]: value
      }
    }));
  };

  if (!isReady) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading feature flags...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>Feature Flag Management</h1>
            <p>Manage feature rollouts and system capabilities</p>
          </div>
          <button 
            onClick={() => navigate('/admin')}
            style={{
              backgroundColor: '#495057',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#343a40';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#495057';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <span style={{ fontSize: '16px' }}>←</span>
            Back to Dashboard
          </button>
        </div>
      </div>

      <div className={styles.flagsList}>
        {Object.entries(flags).map(([flagName, flag]) => (
          <div key={flagName} className={styles.flagCard}>
            <div className={styles.flagHeader}>
              <div className={styles.flagInfo}>
                <h3>{flagName}</h3>
                <span className={`${styles.status} ${flag.enabled ? styles.enabled : styles.disabled}`}>
                  {flag.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <button
                onClick={() => handleEditFlag(flagName)}
                className={styles.editButton}
              >
                Edit
              </button>
            </div>

            {editingFlag === flagName ? (
              <div className={styles.editForm}>
                <div className={styles.formRow}>
                  <label>
                    <input
                      type="checkbox"
                      checked={editForm.enabled}
                      onChange={(e) => handleInputChange('enabled', e.target.checked)}
                    />
                    Enable Feature
                  </label>
                </div>

                <div className={styles.formRow}>
                  <label>Rollout Percentage (0-100):</label>
                                     <input
                     type="number"
                     min="0"
                     max="100"
                     value={editForm.rolloutPercentage || 0}
                     onChange={(e) => handleInputChange('rolloutPercentage', parseInt(e.target.value) || 0)}
                   />
                </div>

                <div className={styles.formRow}>
                  <label>User Types:</label>
                  <select
                    multiple
                    value={editForm.userTypes}
                    onChange={(e) => {
                      const values = Array.from(e.target.selectedOptions, option => option.value);
                      handleInputChange('userTypes', values);
                    }}
                  >
                    <option value="shipper">Shipper</option>
                    <option value="carrier">Carrier</option>
                    <option value="driver">Driver</option>
                  </select>
                </div>

                <div className={styles.formRow}>
                  <label>Regions:</label>
                  <input
                    type="text"
                    placeholder="OH, MI, CA (comma separated)"
                                         value={editForm.regions?.join(', ') || ''}
                    onChange={(e) => {
                      const regions = e.target.value.split(',').map(r => r.trim()).filter(r => r);
                      handleInputChange('regions', regions);
                    }}
                  />
                </div>

                <div className={styles.formRow}>
                  <label>Max Users:</label>
                                     <input
                     type="number"
                     min="0"
                     value={editForm.maxUsers || 0}
                     onChange={(e) => handleInputChange('maxUsers', parseInt(e.target.value) || 0)}
                   />
                </div>

                <div className={styles.formRow}>
                  <label>Start Date:</label>
                  <input
                    type="datetime-local"
                    value={editForm.startDate}
                    onChange={(e) => handleInputChange('startDate', e.target.value)}
                  />
                </div>

                <div className={styles.formRow}>
                  <label>End Date:</label>
                  <input
                    type="datetime-local"
                    value={editForm.endDate}
                    onChange={(e) => handleInputChange('endDate', e.target.value)}
                  />
                </div>

                <div className={styles.formRow}>
                  <label>Description:</label>
                  <textarea
                    value={editForm.metadata?.description || ''}
                    onChange={(e) => handleMetadataChange('description', e.target.value)}
                    placeholder="Feature description..."
                  />
                </div>

                <div className={styles.formActions}>
                  <button onClick={handleSaveFlag} className={styles.saveButton}>
                    Save Changes
                  </button>
                  <button onClick={handleCancelEdit} className={styles.cancelButton}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles.flagDetails}>
                {flag.rolloutPercentage !== undefined && (
                  <p><strong>Rollout:</strong> {flag.rolloutPercentage}%</p>
                )}
                {flag.userTypes && flag.userTypes.length > 0 && (
                  <p><strong>User Types:</strong> {flag.userTypes.join(', ')}</p>
                )}
                {flag.regions && flag.regions.length > 0 && (
                  <p><strong>Regions:</strong> {flag.regions.join(', ')}</p>
                )}
                {flag.metadata?.description && (
                  <p><strong>Description:</strong> {flag.metadata.description}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FeatureFlagManager;
