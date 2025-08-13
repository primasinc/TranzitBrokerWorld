# Firestore Collections Setup for Broker Portal
*Creating new collections without affecting existing system*

## **🎯 Current Task: Phase 2.1 - Firestore Collection Creation**

### **Status: IN PROGRESS**
- [x] Database schema designed
- [ ] Create new Firestore collections
- [ ] Set up security rules
- [ ] Create indexes

## **🏗️ New Collections Being Created**

### **1. `userTypes` Collection (Configurable User Types)**

**Purpose**: Make user types configurable instead of hardcoded

**Structure**:
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

**Initial Data to Create**:
```typescript
// shipper user type
{
  id: 'shipper',
  name: 'Shipper',
  description: 'Company that needs freight transported',
  canPostLoads: true,
  canViewLoads: false,
  canManageCarriers: true,
  canManagePartners: true,
  defaultRoute: '/shipper/dashboard',
  allowedRoutes: ['/shipper/*', '/carrier-directory', '/partnerships'],
  features: ['load_posting', 'carrier_management', 'shipment_tracking'],
  restrictions: [],
  isActive: true
}

// carrier user type
{
  id: 'carrier',
  name: 'Carrier',
  description: 'Company that transports freight',
  canPostLoads: false,
  canViewLoads: true,
  canManageCarriers: false,
  canManagePartners: true,
  defaultRoute: '/carrier/home',
  allowedRoutes: ['/carrier/*', '/available-loads', '/partnerships'],
  features: ['load_viewing', 'load_bidding', 'shipment_management'],
  restrictions: [],
  isActive: true
}

// broker user type
{
  id: 'broker',
  name: 'Broker',
  description: 'Company that brokers freight to carriers',
  canPostLoads: true,
  canViewLoads: false,
  canManageCarriers: true,
  canManagePartners: true,
  defaultRoute: '/shipper/dashboard', // Same as shipper portal
  allowedRoutes: ['/shipper/*', '/carrier-directory', '/partnerships'],
  features: ['load_posting', 'carrier_management', 'shipment_tracking'],
  restrictions: ['cannot_see_broker_loads'], // Competition protection
  isActive: true
}

// broker_carrier user type
{
  id: 'broker_carrier',
  name: 'Broker with Carrier Operations',
  description: 'Company that brokers freight and also operates as a carrier',
  canPostLoads: true,
  canViewLoads: true,
  canManageCarriers: true,
  canManagePartners: true,
  defaultRoute: '/shipper/dashboard', // Same as shipper portal
  allowedRoutes: ['/shipper/*', '/carrier/*', '/carrier-directory', '/partnerships'],
  features: ['load_posting', 'carrier_management', 'shipment_tracking', 'load_viewing', 'load_bidding'],
  restrictions: ['cannot_see_broker_loads'], // Competition protection
  isActive: true
}
```

## **🔐 Security Rules for userTypes Collection**

```typescript
// Firestore security rules for userTypes collection
match /userTypes/{userTypeId} {
  allow read: if isAuthenticated(); // All authenticated users can read user types
  allow write: if isAdmin();        // Only admins can modify user types
}
```

## **📊 Indexes for userTypes Collection**

```typescript
// Firestore indexes for userTypes collection
{
  "collectionGroup": "userTypes",
  "queryScope": "COLLECTION",
  "fields": [
    {
      "fieldPath": "isActive",
      "order": "ASCENDING"
    },
    {
      "fieldPath": "id",
      "order": "ASCENDING"
    }
  ]
}
```

## **✅ Next Steps**

1. **Create userTypes collection** in Firestore
2. **Add initial user type data**
3. **Set up security rules**
4. **Create indexes**
5. **Move to next collection**

---

**This collection will make your system configurable. Instead of hardcoded user types, everything will be driven by this database configuration.**

**Ready to create this collection in Firestore?**
