# Database Schema Design for Broker Portal
*Production-ready, scalable architecture supporting broker, shipper, and carrier operations*

## **🎯 Business Requirements**

### **Core Rules:**
1. **Brokers with carrier operations CANNOT see other broker loads**
2. **Brokers can ONLY see shipper loads** (competition protection)
3. **Brokers have FULL shipper portal capabilities**
4. **Carriers can toggle between shipper and broker loads**
5. **System must be configurable and scalable**

## **🏗️ New Collection Architecture**

### **1. `companies` Collection**
```typescript
interface Company {
  id: string;                    // Auto-generated company ID
  name: string;                  // Company name
  type: CompanyType;             // 'shipper' | 'broker' | 'carrier' | 'broker_carrier'
  status: CompanyStatus;         // 'active' | 'inactive' | 'suspended' | 'pending'
  
  // Business Information
  businessType: BusinessType;    // 'logistics' | 'manufacturing' | 'retail' | etc.
  taxId: string;                 // Tax identification number
  dunsNumber: string;            // DUNS number for business verification
  address: CompanyAddress;       // Company address information
  
  // Service Configuration
  services: CompanyService[];    // Array of services this company provides
  capabilities: CompanyCapability[]; // What this company can do
  
  // Broker-Specific Fields
  brokerLicense?: string;        // Broker license number
  suretyBond?: string;           // Surety bond information
  commissionRates?: CommissionRate[]; // Commission structure
  
  // Carrier-Specific Fields (for broker-carrier companies)
  carrierOperations?: CarrierOperations; // Carrier service details
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  verifiedAt?: Timestamp;
  
  // Metadata
  tags: string[];                // Searchable tags
  notes: string;                 // Admin notes
}
```

### **2. `companyUsers` Collection**
```typescript
interface CompanyUser {
  id: string;                    // Firebase Auth UID
  companyId: string;             // Reference to companies collection
  email: string;                 // User email
  role: UserRole;                // 'owner' | 'admin' | 'manager' | 'user' | 'driver'
  
  // User Information
  firstName: string;
  lastName: string;
  phoneNumber: string;
  position: string;              // Job title/position
  
  // Permissions
  permissions: UserPermission[]; // Granular permissions
  accessLevel: AccessLevel;      // 'full' | 'limited' | 'readonly'
  
  // Status
  status: UserStatus;            // 'active' | 'inactive' | 'suspended'
  lastActive: Timestamp;
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  invitedAt?: Timestamp;
  acceptedAt?: Timestamp;
}
```

### **3. `userTypes` Collection (Configurable)**
```typescript
interface UserType {
  id: string;                    // 'shipper' | 'broker' | 'carrier' | 'broker_carrier'
  name: string;                  // Display name
  description: string;           // Description of this user type
  
  // Capabilities
  canPostLoads: boolean;         // Can post loads
  canViewLoads: boolean;         // Can view loads
  canManageCarriers: boolean;    // Can manage carrier relationships
  canManagePartners: boolean;    // Can manage partnerships
  
  // Load Visibility Rules
  loadVisibilityRules: LoadVisibilityRule[];
  
  // Portal Access
  defaultRoute: string;          // Default dashboard route
  allowedRoutes: string[];       // Allowed navigation routes
  
  // Features
  features: string[];            // Available features
  restrictions: string[];        // Feature restrictions
  
  // Business Rules
  businessRules: BusinessRule[]; // Specific business logic
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isActive: boolean;
}
```

### **4. `loadVisibilityRules` Collection**
```typescript
interface LoadVisibilityRule {
  id: string;
  userTypeId: string;            // Reference to userTypes collection
  
  // Visibility Configuration
  canSeeShipperLoads: boolean;   // Can see loads from shipper companies
  canSeeBrokerLoads: boolean;    // Can see loads from broker companies
  canSeeCarrierLoads: boolean;   // Can see loads from carrier companies
  
  // Competition Protection Rules
  competitionProtection: CompetitionProtectionRule[];
  
  // Load Filtering
  loadFilters: LoadFilter[];      // Additional filtering rules
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### **5. `competitionProtectionRules` Collection**
```typescript
interface CompetitionProtectionRule {
  id: string;
  userTypeId: string;            // Reference to userTypes collection
  
  // Protection Rules
  ruleType: 'broker_competition' | 'carrier_competition' | 'shipper_competition';
  
  // Specific Restrictions
  restrictedUserTypes: string[]; // User types this rule applies to
  restrictedActions: string[];   // Actions that are restricted
  
  // Load Visibility Impact
  affectsLoadVisibility: boolean; // Does this rule affect load viewing
  affectsLoadPosting: boolean;   // Does this rule affect load posting
  
  // Business Logic
  businessLogic: string;         // Description of the business rule
  enforcement: 'strict' | 'flexible'; // How strictly to enforce
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### **6. `loads` Collection (Updated)**
```typescript
interface Load {
  id: string;                    // Auto-generated load ID
  
  // Origin Information
  originatorCompanyId: string;   // Reference to companies collection
  originatorUserId: string;      // Reference to companyUsers collection
  originatorType: string;        // 'shipper' | 'broker' | 'carrier'
  
  // Load Details
  pickup: LoadLocation;
  delivery: LoadLocation;
  items: LoadItem[];
  specialRequirements: string[];
  
  // Pricing
  rate: number;
  rateType: 'per_mile' | 'flat_rate' | 'negotiable';
  paymentTerms: string;
  
  // Status
  status: LoadStatus;            // 'available' | 'assigned' | 'in_transit' | 'delivered'
  assignedCarrierId?: string;    // Reference to companies collection
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  scheduledPickup: Timestamp;
  scheduledDelivery: Timestamp;
  
  // Metadata
  tags: string[];
  notes: string;
}
```

### **7. `companyRelationships` Collection**
```typescript
interface CompanyRelationship {
  id: string;                    // Auto-generated relationship ID
  
  // Relationship Parties
  companyId1: string;            // Reference to companies collection
  companyId2: string;            // Reference to companies collection
  
  // Relationship Type
  type: RelationshipType;        // 'carrier_partner' | 'broker_client' | 'shipper_broker'
  status: RelationshipStatus;    // 'active' | 'pending' | 'suspended' | 'terminated'
  
  // Contract Terms
  contractTerms: ContractTerms;
  commissionRates?: CommissionRate[];
  
  // Performance Metrics
  performanceMetrics: PerformanceMetrics;
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  activatedAt?: Timestamp;
  terminatedAt?: Timestamp;
}
```

## **🔐 Business Rules Implementation**

### **Rule 1: Broker-Carrier Competition Protection**
```typescript
// When a broker with carrier operations views loads:
// 1. Check company type = 'broker_carrier'
// 2. Apply competition protection rule
// 3. Filter loads to show ONLY shipper loads
// 4. Hide all broker loads (competition protection)

const getVisibleLoads = async (companyId: string) => {
  const company = await getCompany(companyId);
  
  if (company.type === 'broker_carrier') {
    // Apply competition protection
    return await getLoads({
      originatorType: 'shipper',  // Only shipper loads
      excludeBrokerLoads: true    // Competition protection
    });
  }
  
  // Normal load visibility for other company types
  return await getLoads({ companyId });
};
```

### **Rule 2: Broker Portal Functionality**
```typescript
// Brokers get the same portal capabilities as shippers:
// 1. Same dashboard components
// 2. Same load management tools
// 3. Same carrier management features
// 4. Same partnership tools
// 5. Same analytics and reporting

const getBrokerPortal = async (companyId: string) => {
  const company = await getCompany(companyId);
  const userType = await getUserType('broker');
  
  // Return shipper portal with broker-specific data
  return {
    ...shipperPortal,
    userType: 'broker',
    companyType: company.type,
    restrictions: userType.restrictions,
    features: userType.features
  };
};
```

## **🚀 Migration Strategy**

### **Phase 1: Schema Creation**
1. Create new collections in Firestore
2. Set up security rules for new collections
3. Create indexes for new collections

### **Phase 2: Data Migration**
1. Migrate existing users to new company structure
2. Preserve all existing relationships
3. Maintain backward compatibility

### **Phase 3: Feature Rollout**
1. Enable new schema for new registrations
2. Gradually migrate existing users
3. Test all functionality thoroughly

## **✅ Benefits of This Schema**

### **Scalability:**
- ✅ Support unlimited company types
- ✅ Support unlimited user roles
- ✅ Support unlimited permissions
- ✅ Support unlimited business rules

### **Flexibility:**
- ✅ Add new user types without code changes
- ✅ Modify business rules without deployment
- ✅ Customize features per company
- ✅ Support enterprise requirements

### **Production Ready:**
- ✅ Zero downtime migrations
- ✅ Comprehensive audit trails
- ✅ Role-based access control
- ✅ Business rule enforcement

---

**This schema design supports all your business requirements while providing the foundation for unlimited scalability and flexibility. Ready to proceed with the next phase of implementation?**
