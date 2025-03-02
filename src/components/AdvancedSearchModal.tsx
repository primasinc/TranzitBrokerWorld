import React, { useState } from 'react';
import styles from './AdvancedSearchModal.module.css';

interface AdvancedSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (criteria: SearchCriteria) => void;
  savedSearches: SavedSearch[];
  onSaveSearch: (search: SavedSearch) => void;
  onDeleteSavedSearch: (id: string) => void;
}

export interface SearchCriteria {
  loadId?: string;
  customer?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  amountRange?: {
    min: number;
    max: number;
  };
  status?: string[];
  origin?: string;
  destination?: string;
}

export interface SavedSearch {
  id: string;
  name: string;
  criteria: SearchCriteria;
}

const AdvancedSearchModal: React.FC<AdvancedSearchModalProps> = ({ 
  isOpen, 
  onClose, 
  onSearch,
  savedSearches,
  onSaveSearch,
  onDeleteSavedSearch
}) => {
  const [criteria, setCriteria] = useState<SearchCriteria>({
    loadId: '',
    customer: '',
    dateRange: {
      start: '',
      end: ''
    },
    amountRange: {
      min: 0,
      max: 0
    },
    status: [],
    origin: '',
    destination: ''
  });
  
  const [searchName, setSearchName] = useState('');
  const [activeTab, setActiveTab] = useState<'criteria' | 'saved'>('criteria');
  
  const handleInputChange = (field: keyof SearchCriteria, value: any) => {
    setCriteria(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const handleDateRangeChange = (field: 'start' | 'end', value: string) => {
    setCriteria(prev => ({
      ...prev,
      dateRange: {
        ...prev.dateRange!,
        [field]: value
      }
    }));
  };
  
  const handleAmountRangeChange = (field: 'min' | 'max', value: number) => {
    setCriteria(prev => ({
      ...prev,
      amountRange: {
        ...prev.amountRange!,
        [field]: value
      }
    }));
  };
  
  const handleStatusChange = (status: string, checked: boolean) => {
    setCriteria(prev => {
      const currentStatuses = prev.status || [];
      const newStatuses = checked
        ? [...currentStatuses, status]
        : currentStatuses.filter(s => s !== status);
      
      return {
        ...prev,
        status: newStatuses
      };
    });
  };
  
  const handleSearch = () => {
    // Clean up criteria by removing empty values
    const cleanCriteria = { ...criteria };
    
    if (!cleanCriteria.loadId) delete cleanCriteria.loadId;
    if (!cleanCriteria.customer) delete cleanCriteria.customer;
    if (!cleanCriteria.origin) delete cleanCriteria.origin;
    if (!cleanCriteria.destination) delete cleanCriteria.destination;
    
    if (!cleanCriteria.dateRange?.start && !cleanCriteria.dateRange?.end) {
      delete cleanCriteria.dateRange;
    }
    
    if (cleanCriteria.amountRange?.min === 0 && cleanCriteria.amountRange?.max === 0) {
      delete cleanCriteria.amountRange;
    }
    
    if (cleanCriteria.status?.length === 0) {
      delete cleanCriteria.status;
    }
    
    onSearch(cleanCriteria);
    onClose();
  };
  
  const handleSaveSearch = () => {
    if (!searchName.trim()) return;
    
    // Clean up criteria by removing empty values
    const cleanCriteria = { ...criteria };
    
    if (!cleanCriteria.loadId) delete cleanCriteria.loadId;
    if (!cleanCriteria.customer) delete cleanCriteria.customer;
    if (!cleanCriteria.origin) delete cleanCriteria.origin;
    if (!cleanCriteria.destination) delete cleanCriteria.destination;
    
    if (!cleanCriteria.dateRange?.start && !cleanCriteria.dateRange?.end) {
      delete cleanCriteria.dateRange;
    }
    
    if (cleanCriteria.amountRange?.min === 0 && cleanCriteria.amountRange?.max === 0) {
      delete cleanCriteria.amountRange;
    }
    
    if (cleanCriteria.status?.length === 0) {
      delete cleanCriteria.status;
    }
    
    const newSavedSearch: SavedSearch = {
      id: Date.now().toString(),
      name: searchName,
      criteria: cleanCriteria
    };
    
    onSaveSearch(newSavedSearch);
    setSearchName('');
  };
  
  const handleLoadSavedSearch = (savedSearch: SavedSearch) => {
    setCriteria(savedSearch.criteria);
    setActiveTab('criteria');
  };
  
  const handleClearCriteria = () => {
    setCriteria({
      loadId: '',
      customer: '',
      dateRange: {
        start: '',
        end: ''
      },
      amountRange: {
        min: 0,
        max: 0
      },
      status: [],
      origin: '',
      destination: ''
    });
  };
  
  if (!isOpen) return null;
  
  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2>Advanced Search</h2>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>
        
        <div className={styles.tabsContainer}>
          <button 
            className={`${styles.tabButton} ${activeTab === 'criteria' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('criteria')}
          >
            Search Criteria
          </button>
          <button 
            className={`${styles.tabButton} ${activeTab === 'saved' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('saved')}
          >
            Saved Searches
          </button>
        </div>
        
        <div className={styles.content}>
          {activeTab === 'criteria' && (
            <div className={styles.criteriaTab}>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>Load ID</label>
                  <input
                    type="text"
                    value={criteria.loadId || ''}
                    onChange={(e) => handleInputChange('loadId', e.target.value)}
                    placeholder="Enter load ID"
                  />
                </div>
                
                <div className={styles.formGroup}>
                  <label>Customer</label>
                  <input
                    type="text"
                    value={criteria.customer || ''}
                    onChange={(e) => handleInputChange('customer', e.target.value)}
                    placeholder="Enter customer name"
                  />
                </div>
                
                <div className={styles.formGroup}>
                  <label>Origin</label>
                  <input
                    type="text"
                    value={criteria.origin || ''}
                    onChange={(e) => handleInputChange('origin', e.target.value)}
                    placeholder="Enter origin city/state"
                  />
                </div>
                
                <div className={styles.formGroup}>
                  <label>Destination</label>
                  <input
                    type="text"
                    value={criteria.destination || ''}
                    onChange={(e) => handleInputChange('destination', e.target.value)}
                    placeholder="Enter destination city/state"
                  />
                </div>
              </div>
              
              <div className={styles.sectionTitle}>Date Range</div>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>Start Date</label>
                  <input
                    type="date"
                    value={criteria.dateRange?.start || ''}
                    onChange={(e) => handleDateRangeChange('start', e.target.value)}
                  />
                </div>
                
                <div className={styles.formGroup}>
                  <label>End Date</label>
                  <input
                    type="date"
                    value={criteria.dateRange?.end || ''}
                    onChange={(e) => handleDateRangeChange('end', e.target.value)}
                  />
                </div>
              </div>
              
              <div className={styles.sectionTitle}>Amount Range</div>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>Minimum Amount</label>
                  <div className={styles.inputWithAddon}>
                    <span className={styles.inputAddon}>$</span>
                    <input
                      type="number"
                      value={criteria.amountRange?.min || 0}
                      onChange={(e) => handleAmountRangeChange('min', parseInt(e.target.value) || 0)}
                      placeholder="Min amount"
                    />
                  </div>
                </div>
                
                <div className={styles.formGroup}>
                  <label>Maximum Amount</label>
                  <div className={styles.inputWithAddon}>
                    <span className={styles.inputAddon}>$</span>
                    <input
                      type="number"
                      value={criteria.amountRange?.max || 0}
                      onChange={(e) => handleAmountRangeChange('max', parseInt(e.target.value) || 0)}
                      placeholder="Max amount"
                    />
                  </div>
                </div>
              </div>
              
              <div className={styles.sectionTitle}>Payment Status</div>
              <div className={styles.checkboxGrid}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={criteria.status?.includes('Pending') || false}
                    onChange={(e) => handleStatusChange('Pending', e.target.checked)}
                  />
                  <span>Pending</span>
                </label>
                
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={criteria.status?.includes('Requested') || false}
                    onChange={(e) => handleStatusChange('Requested', e.target.checked)}
                  />
                  <span>Requested</span>
                </label>
                
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={criteria.status?.includes('Processing') || false}
                    onChange={(e) => handleStatusChange('Processing', e.target.checked)}
                  />
                  <span>Processing</span>
                </label>
                
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={criteria.status?.includes('Paid') || false}
                    onChange={(e) => handleStatusChange('Paid', e.target.checked)}
                  />
                  <span>Paid</span>
                </label>
                
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={criteria.status?.includes('Canceled') || false}
                    onChange={(e) => handleStatusChange('Canceled', e.target.checked)}
                  />
                  <span>Canceled</span>
                </label>
              </div>
              
              <div className={styles.saveSearchContainer}>
                <input
                  type="text"
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  placeholder="Enter a name to save this search"
                  className={styles.saveSearchInput}
                />
                <button 
                  className={styles.saveSearchButton}
                  onClick={handleSaveSearch}
                  disabled={!searchName.trim()}
                >
                  Save Search
                </button>
              </div>
            </div>
          )}
          
          {activeTab === 'saved' && (
            <div className={styles.savedTab}>
              {savedSearches.length > 0 ? (
                <div className={styles.savedSearchesList}>
                  {savedSearches.map((search) => (
                    <div key={search.id} className={styles.savedSearchItem}>
                      <div className={styles.savedSearchInfo}>
                        <div className={styles.savedSearchName}>{search.name}</div>
                        <div className={styles.savedSearchCriteria}>
                          {Object.entries(search.criteria)
                            .filter(([key, value]) => value !== undefined && value !== '')
                            .map(([key, value]) => {
                              if (key === 'status' && Array.isArray(value)) {
                                return `Status: ${value.join(', ')}`;
                              }
                              if (key === 'dateRange' && typeof value === 'object') {
                                return `Date: ${value.start || 'Any'} to ${value.end || 'Any'}`;
                              }
                              if (key === 'amountRange' && typeof value === 'object') {
                                return `Amount: $${value.min || 0} to $${value.max || 'Any'}`;
                              }
                              return `${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}`;
                            })
                            .join(' • ')
                          }
                        </div>
                      </div>
                      <div className={styles.savedSearchActions}>
                        <button 
                          className={styles.loadSearchButton}
                          onClick={() => handleLoadSavedSearch(search)}
                        >
                          Load
                        </button>
                        <button 
                          className={styles.deleteSearchButton}
                          onClick={() => onDeleteSavedSearch(search.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={styles.noSavedSearches}>No saved searches yet.</p>
              )}
            </div>
          )}
        </div>
        
        <div className={styles.actions}>
          {activeTab === 'criteria' && (
            <>
              <button 
                onClick={handleClearCriteria} 
                className={styles.clearButton}
              >
                Clear All
              </button>
              <div className={styles.spacer}></div>
              <button 
                onClick={onClose} 
                className={styles.cancelButton}
              >
                Cancel
              </button>
              <button 
                onClick={handleSearch} 
                className={styles.searchButton}
              >
                Search
              </button>
            </>
          )}
          
          {activeTab === 'saved' && (
            <button 
              onClick={onClose} 
              className={styles.cancelButton}
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdvancedSearchModal; 