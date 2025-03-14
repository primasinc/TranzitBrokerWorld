import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styles from './CarrierDetails.module.css';

interface CarrierDetail {
  id: string;
  name: string;
  rating: number;
  completedLoads: number;
  activeLoads: number;
  specialties: string[];
  status: 'Active' | 'Inactive';
  location: string;
  contact: {
    name: string;
    phone: string;
    email: string;
  };
  description: string;
  yearEstablished: number;
  fleetSize: number;
  usdotNumber?: string;
  mcNumber?: string;
  insuranceCoverage: string;
  paymentTerms: string;
  preferredLanes: string[];
  performanceMetrics: {
    onTimeDelivery: number;
    loadAcceptanceRate: number;
    claimRate: number;
    avgResponseTime: string;
  };
  documents: {
    name: string;
    dateUploaded: string;
    status: 'Valid' | 'Expired' | 'Pending';
  }[];
  rateAgreements: {
    id: string;
    name: string;
    effectiveDate: string;
    expirationDate: string;
    status: 'Active' | 'Expired' | 'Pending';
  }[];
}

const CarrierDetails: React.FC = () => {
  const { partnerId } = useParams<{ partnerId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'rates' | 'performance'>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [carrier, setCarrier] = useState<CarrierDetail | null>(null);

  useEffect(() => {
    // Simulate API call to fetch carrier details
    const fetchCarrierDetails = async () => {
      setIsLoading(true);
      try {
        // In a real app, this would be an API call
        // For now, we'll use mock data
        setTimeout(() => {
          if (partnerId === "C003") {
            // SMR CONSULTING LLC data
            setCarrier({
              id: partnerId,
              name: "SMR CONSULTING LLC",
              rating: 4.2,
              completedLoads: 91,
              activeLoads: 1,
              specialties: ["Interstate", "General Freight"],
              status: "Active" as 'Active',
              location: "HURON, OH",
              usdotNumber: "3688871",
              mcNumber: "MC-1285125",
              contact: {
                name: "Contact Person",
                phone: "(724) 344-4978",
                email: "contact@smrconsulting.com"
              },
              description: "SMR CONSULTING LLC is a carrier based in HURON, OH. We specialize in interstate transportation and general freight. Our company has been providing reliable transportation services since 2018.",
              yearEstablished: 2018,
              fleetSize: 1,
              insuranceCoverage: "$750,000 General Liability, $1,000,000 Auto Liability",
              paymentTerms: "Net 30",
              preferredLanes: ["Ohio to Kentucky", "Ohio to Pennsylvania", "Ohio to Michigan"],
              performanceMetrics: {
                onTimeDelivery: 95.0,
                loadAcceptanceRate: 90.0,
                claimRate: 0.8,
                avgResponseTime: "20 minutes"
              },
              documents: [
                { name: "Operating Authority", dateUploaded: "2023-05-15", status: "Valid" as 'Valid' },
                { name: "Insurance Certificate", dateUploaded: "2023-06-10", status: "Valid" as 'Valid' },
                { name: "W-9 Form", dateUploaded: "2023-05-05", status: "Valid" as 'Valid' }
              ],
              rateAgreements: [
                { id: "RA001", name: "Standard Rate Agreement", effectiveDate: "2023-01-01", expirationDate: "2023-12-31", status: "Active" as 'Active' }
              ]
            });
          } else {
            // Default carrier data (ABC Trucking Co)
            setCarrier({
              id: partnerId || "C001",
              name: "ABC Trucking Co",
              rating: 4.8,
              completedLoads: 156,
              activeLoads: 3,
              specialties: ["Refrigerated", "Hazmat", "LTL"],
              status: "Active" as 'Active',
              location: "Chicago, IL",
              usdotNumber: "1234567",
              mcNumber: "MC-987654",
              contact: {
                name: "John Smith",
                phone: "(555) 123-4567",
                email: "john@abctrucking.com"
              },
              description: "ABC Trucking is a reliable carrier with over 10 years of experience in the transportation industry. We specialize in refrigerated, hazardous materials, and less-than-truckload shipments across the Midwest and Northeast regions.",
              yearEstablished: 2012,
              fleetSize: 45,
              insuranceCoverage: "$2,000,000 General Liability, $1,000,000 Auto Liability",
              paymentTerms: "Net 30",
              preferredLanes: ["Chicago to New York", "Detroit to Atlanta", "Indianapolis to Dallas"],
              performanceMetrics: {
                onTimeDelivery: 97.5,
                loadAcceptanceRate: 92.3,
                claimRate: 0.5,
                avgResponseTime: "15 minutes"
              },
              documents: [
                { name: "Operating Authority", dateUploaded: "2023-01-15", status: "Valid" as 'Valid' },
                { name: "Insurance Certificate", dateUploaded: "2023-02-10", status: "Valid" as 'Valid' },
                { name: "W-9 Form", dateUploaded: "2023-01-05", status: "Valid" as 'Valid' },
                { name: "Safety Rating", dateUploaded: "2022-11-20", status: "Valid" as 'Valid' }
              ],
              rateAgreements: [
                { id: "RA001", name: "Standard Rate Agreement", effectiveDate: "2023-01-01", expirationDate: "2023-12-31", status: "Active" as 'Active' },
                { id: "RA002", name: "Refrigerated Loads Agreement", effectiveDate: "2023-02-15", expirationDate: "2023-12-31", status: "Active" as 'Active' },
                { id: "RA003", name: "Hazmat Surcharge Agreement", effectiveDate: "2023-03-01", expirationDate: "2023-12-31", status: "Active" as 'Active' }
              ]
            });
          }
          setIsLoading(false);
        }, 800);
      } catch (error) {
        console.error("Error fetching carrier details:", error);
        setIsLoading(false);
      }
    };

    fetchCarrierDetails();
  }, [partnerId]);

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    
    return (
      <>
        {'★'.repeat(fullStars)}
        {halfStar ? '½' : ''}
        {'☆'.repeat(emptyStars)}
      </>
    );
  };

  const handleViewSafer = () => {
    // Open the SAFER website in a new tab with the carrier's USDOT number if available
    if (carrier?.usdotNumber) {
      window.open(`https://safer.fmcsa.dot.gov/query.asp?searchtype=ANY&query_type=queryCarrierSnapshot&query_param=USDOT&query_string=${carrier.usdotNumber}`, '_blank');
    } else {
      window.open('https://safer.fmcsa.dot.gov/CompanySnapshot.aspx', '_blank');
    }
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loader}></div>
        <p>Loading carrier details...</p>
      </div>
    );
  }

  if (!carrier) {
    return (
      <div className={styles.errorContainer}>
        <h2>Carrier Not Found</h2>
        <p>The carrier you're looking for doesn't exist or you don't have permission to view it.</p>
        <button 
          className={styles.backButton}
          onClick={() => navigate('/shipper/partners')}
        >
          Back to Carrier Partners
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <button 
            className={styles.backButton}
            onClick={() => navigate('/shipper/partners')}
          >
            ← Back
          </button>
          <h1>{carrier.name}</h1>
          <span className={`${styles.status} ${styles[carrier.status.toLowerCase()]}`}>
            {carrier.status}
          </span>
        </div>
        <div className={styles.headerRight}>
          <button 
            className={styles.saferButton}
            onClick={handleViewSafer}
          >
            View SAFER
          </button>
          <button className={styles.contactButton}>Contact Carrier</button>
        </div>
      </div>

      <div className={styles.tabs}>
        <button 
          className={`${styles.tab} ${activeTab === 'overview' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'documents' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('documents')}
        >
          Documents
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'rates' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('rates')}
        >
          Rate Agreements
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'performance' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('performance')}
        >
          Performance
        </button>
      </div>

      <div className={styles.content}>
        {activeTab === 'overview' && (
          <>
            <div className={styles.mainInfo}>
              <div className={styles.rating}>
                <span className={styles.stars}>{renderStars(carrier.rating)}</span>
                <span>{carrier.rating.toFixed(1)}</span>
              </div>

              <div className={styles.description}>
                <h2>About</h2>
                <p>{carrier.description}</p>
              </div>

              <div className={styles.stats}>
                <div className={styles.statCard}>
                  <label>Completed Loads</label>
                  <span>{carrier.completedLoads}</span>
                </div>
                <div className={styles.statCard}>
                  <label>Active Loads</label>
                  <span>{carrier.activeLoads}</span>
                </div>
                <div className={styles.statCard}>
                  <label>Year Established</label>
                  <span>{carrier.yearEstablished}</span>
                </div>
                <div className={styles.statCard}>
                  <label>Fleet Size</label>
                  <span>{carrier.fleetSize} trucks</span>
                </div>
              </div>

              <div className={styles.specialtiesSection}>
                <h2>Specialties</h2>
                <div className={styles.specialties}>
                  {carrier.specialties.map((specialty) => (
                    <span key={specialty} className={styles.specialty}>
                      {specialty}
                    </span>
                  ))}
                </div>
              </div>

              <div className={styles.lanesSection}>
                <h2>Preferred Lanes</h2>
                <ul className={styles.lanesList}>
                  {carrier.preferredLanes.map((lane, index) => (
                    <li key={index}>{lane}</li>
                  ))}
                </ul>
              </div>

              <div className={styles.infoSection}>
                <h2>Business Information</h2>
                <div className={styles.infoGrid}>
                  <div className={styles.infoItem}>
                    <label>Location</label>
                    <p>{carrier.location}</p>
                  </div>
                  {carrier.usdotNumber && (
                    <div className={styles.infoItem}>
                      <label>USDOT Number</label>
                      <p>{carrier.usdotNumber}</p>
                    </div>
                  )}
                  {carrier.mcNumber && (
                    <div className={styles.infoItem}>
                      <label>MC Number</label>
                      <p>{carrier.mcNumber}</p>
                    </div>
                  )}
                  <div className={styles.infoItem}>
                    <label>Insurance Coverage</label>
                    <p>{carrier.insuranceCoverage}</p>
                  </div>
                  <div className={styles.infoItem}>
                    <label>Payment Terms</label>
                    <p>{carrier.paymentTerms}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.contactInfo}>
              <h2>Contact Information</h2>
              <div className={styles.contactDetail}>
                <label>Contact Person</label>
                <p>{carrier.contact.name}</p>
              </div>
              <div className={styles.contactDetail}>
                <label>Phone</label>
                <p>{carrier.contact.phone}</p>
              </div>
              <div className={styles.contactDetail}>
                <label>Email</label>
                <p>{carrier.contact.email}</p>
              </div>
              <button className={styles.contactButton}>Send Message</button>
            </div>
          </>
        )}

        {activeTab === 'documents' && (
          <div className={styles.documentsTab}>
            <h2>Carrier Documents</h2>
            <div className={styles.documentsList}>
              <table className={styles.documentsTable}>
                <thead>
                  <tr>
                    <th>Document Name</th>
                    <th>Date Uploaded</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {carrier.documents.map((doc, index) => (
                    <tr key={index}>
                      <td>{doc.name}</td>
                      <td>{doc.dateUploaded}</td>
                      <td>
                        <span className={`${styles.docStatus} ${styles[doc.status.toLowerCase()]}`}>
                          {doc.status}
                        </span>
                      </td>
                      <td>
                        <button className={styles.viewButton}>View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={styles.documentActions}>
              <button className={styles.primaryButton}>Request Document</button>
            </div>
          </div>
        )}

        {activeTab === 'rates' && (
          <div className={styles.ratesTab}>
            <div className={styles.ratesHeader}>
              <h2>Rate Agreements</h2>
              <button className={styles.primaryButton}>New Agreement</button>
            </div>
            <div className={styles.ratesList}>
              <table className={styles.ratesTable}>
                <thead>
                  <tr>
                    <th>Agreement Name</th>
                    <th>Effective Date</th>
                    <th>Expiration Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {carrier.rateAgreements.map((agreement) => (
                    <tr key={agreement.id}>
                      <td>{agreement.name}</td>
                      <td>{agreement.effectiveDate}</td>
                      <td>{agreement.expirationDate}</td>
                      <td>
                        <span className={`${styles.agreementStatus} ${styles[agreement.status.toLowerCase()]}`}>
                          {agreement.status}
                        </span>
                      </td>
                      <td>
                        <button className={styles.viewButton}>View</button>
                        <button className={styles.editButton}>Edit</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'performance' && (
          <div className={styles.performanceTab}>
            <h2>Performance Metrics</h2>
            <div className={styles.metricsGrid}>
              <div className={styles.metricCard}>
                <h3>On-Time Delivery</h3>
                <div className={styles.metricValue}>{carrier.performanceMetrics.onTimeDelivery}%</div>
                <div className={styles.metricBar}>
                  <div 
                    className={styles.metricFill} 
                    style={{ width: `${carrier.performanceMetrics.onTimeDelivery}%` }}
                  ></div>
                </div>
              </div>
              <div className={styles.metricCard}>
                <h3>Load Acceptance Rate</h3>
                <div className={styles.metricValue}>{carrier.performanceMetrics.loadAcceptanceRate}%</div>
                <div className={styles.metricBar}>
                  <div 
                    className={styles.metricFill} 
                    style={{ width: `${carrier.performanceMetrics.loadAcceptanceRate}%` }}
                  ></div>
                </div>
              </div>
              <div className={styles.metricCard}>
                <h3>Claim Rate</h3>
                <div className={styles.metricValue}>{carrier.performanceMetrics.claimRate}%</div>
                <div className={styles.metricBar}>
                  <div 
                    className={`${styles.metricFill} ${styles.inverseFill}`} 
                    style={{ width: `${100 - carrier.performanceMetrics.claimRate * 20}%` }}
                  ></div>
                </div>
              </div>
              <div className={styles.metricCard}>
                <h3>Average Response Time</h3>
                <div className={styles.metricValue}>{carrier.performanceMetrics.avgResponseTime}</div>
              </div>
            </div>

            <div className={styles.performanceHistory}>
              <h3>Performance History</h3>
              <p>Detailed performance history charts will be displayed here.</p>
              {/* In a real app, you would include charts/graphs here */}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CarrierDetails; 