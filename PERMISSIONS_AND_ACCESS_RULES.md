# PERMISSIONS AND ACCESS RULES SYSTEM

## **🔐 Overview**

This document defines the permissions system for the broker portal, including how permissions work with Firestore security rules and what each permission controls.

## **🏗️ Permission Architecture**

### **1. Permission Levels**

#### **User Level Permissions** (`companyUsers.permissions`)
```typescript
permissions: [
  'admin',                    // Full system access
  'load_management',          // Can create/edit/delete loads
  'carrier_management',       // Can manage carrier relationships
  'user_management',          // Can invite/manage company users
  'financial_management',     // Can view financial data
  'reporting',                // Can access reports and analytics
  'document_management',      // Can upload/manage documents
  'partner_management'        // Can manage partner relationships
]
```

#### **Access Levels** (`companyUsers.accessLevel`)
```typescript
accessLevel: 'full' | 'limited' | 'readonly'
```

### **2. Role-Based Access Control (RBAC)**

#### **Company Roles** (`companyUsers.role`)
```typescript
role: 'owner' | 'admin' | 'manager' | 'user'
```

#### **Role Hierarchy**
1. **Owner** - Full company control, can transfer ownership
2. **Admin** - Full company access, can manage users
3. **Manager** - Limited management, can manage loads/carriers
4. **User** - Basic access, view-only for sensitive data

## **🔒 Firestore Security Rules Integration**

### **1. Collection Access Rules**

#### **Companies Collection**
```javascript
match /companies/{companyId} {
  // Read: Any authenticated user
  allow read: if isAuthenticated();
  
  // Create: Any authenticated user (during registration)
  allow create: if isAuthenticated();
  
  // Update: Company owner/admin only
  allow update: if isAuthenticated() && (
    exists(/databases/$(database)/documents/companyUsers/$(request.auth.uid)) &&
    get(/databases/$(database)/documents/companyUsers/$(request.auth.uid)).data.companyId == companyId &&
    get(/databases/$(database)/documents/companyUsers/$(request.auth.uid)).data.role in ['owner', 'admin']
  );
  
  // Delete: Admin only
  allow delete: if isAdmin();
}
```

#### **Company Users Collection**
```javascript
match /companyUsers/{userId} {
  // Read: Company members only
  allow read: if isAuthenticated() && (
    exists(/databases/$(database)/documents/companyUsers/$(request.auth.uid)) &&
    get(/databases/$(database)/documents/companyUsers/$(request.auth.uid)).data.companyId == 
    get(/databases/$(database)/documents/companyUsers/$(userId)).data.companyId
  );
  
  // Create: Company admin/owner only
  allow create: if isAuthenticated() && (
    exists(/databases/$(database)/documents/companyUsers/$(request.auth.uid)) &&
    get(/databases/$(database)/documents/companyUsers/$(request.auth.uid)).data.role in ['owner', 'admin']
  );
  
  // Update: Self or company admin/owner
  allow update: if isAuthenticated() && (
    request.auth.uid == userId ||
    (
      exists(/databases/$(database)/documents/companyUsers/$(request.auth.uid)) &&
      get(/databases/$(database)/documents/companyUsers/$(request.auth.uid)).data.role in ['owner', 'admin'] &&
      get(/databases/$(database)/documents/companyUsers/$(request.auth.uid)).data.companyId == 
      get(/databases/$(database)/documents/companyUsers/$(userId)).data.companyId
    )
  );
  
  // Delete: Company admin/owner only
  allow delete: if isAuthenticated() && (
    exists(/databases/$(database)/documents/companyUsers/$(request.auth.uid)) &&
    get(/databases/$(database)/documents/companyUsers/$(request.auth.uid)).data.role in ['owner', 'admin'] &&
    get(/databases/$(database)/documents/companyUsers/$(request.auth.uid)).data.companyId == 
    get(/databases/$(database)/documents/companyUsers/$(userId)).data.companyId
  );
}
```

### **2. Permission-Based Field Access**

#### **Sensitive Fields Protection**
```javascript
// Example: Financial data access
match /companies/{companyId} {
  allow read: if isAuthenticated() && (
    // Basic company info: all company members
    // Financial data: admin/owner only
    request.path.segments[-1] != 'financialData' ||
    (
      exists(/databases/$(database)/documents/companyUsers/$(request.auth.uid)) &&
      get(/databases/$(database)/documents/companyUsers/$(request.auth.uid)).data.companyId == companyId &&
      get(/databases/$(database)/documents/companyUsers/$(request.auth.uid)).data.permissions.hasAny(['admin', 'financial_management'])
    )
  );
}
```

## **🎯 Permission Functions**

### **1. Helper Functions in Security Rules**

```javascript
// Check if user is company member
function isCompanyMember(companyId) {
  return exists(/databases/$(database)/documents/companyUsers/$(request.auth.uid)) &&
         get(/databases/$(database)/documents/companyUsers/$(request.auth.uid)).data.companyId == companyId;
}

// Check if user has specific permission
function hasPermission(permission) {
  return isCompanyMember(companyId) &&
         get(/databases/$(database)/documents/companyUsers/$(request.auth.uid)).data.permissions.hasAny([permission]);
}

// Check if user is company admin/owner
function isCompanyAdmin(companyId) {
  return isCompanyMember(companyId) &&
         get(/databases/$(database)/documents/companyUsers/$(request.auth.uid)).data.role in ['owner', 'admin'];
}
```

### **2. Business Logic Enforcement**

#### **Load Visibility Rules**
```javascript
match /loads/{loadId} {
  allow read: if isAuthenticated() && (
    // Public loads: all authenticated users
    resource.data.visibility == 'public' ||
    
    // Company loads: company members only
    (resource.data.companyId != null && isCompanyMember(resource.data.companyId)) ||
    
    // Broker loads: apply competition protection
    (resource.data.loadType == 'broker' && !isBrokerCarrierCompetition(resource.data.brokerId))
  );
}
```

## **🚀 Implementation Examples**

### **1. Frontend Permission Checks**

```typescript
// Check if user can manage loads
const canManageLoads = userPermissions.includes('load_management');

// Check if user is company admin
const isCompanyAdmin = userRole === 'owner' || userRole === 'admin';

// Check access level
const hasFullAccess = userAccessLevel === 'full';
```

### **2. API Endpoint Protection**

```typescript
// Middleware to check permissions
const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userPermissions = req.user.permissions;
    
    if (!userPermissions.includes(permission)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: permission,
        current: userPermissions 
      });
    }
    
    next();
  };
};

// Usage
app.post('/api/loads', requirePermission('load_management'), createLoad);
```

## **📋 Migration Considerations**

### **1. Preserve All Original Fields**
- **Don't lose data** during migration
- **Map fields exactly** from `users` to `companyUsers`
- **Maintain data types** and relationships

### **2. Permission Mapping**
```typescript
// Map existing user types to new permissions
const permissionMap = {
  'shipper': ['load_management', 'carrier_management', 'user_management'],
  'carrier': ['load_management', 'partner_management'],
  'broker': ['load_management', 'carrier_management', 'user_management'],
  'admin': ['admin', 'load_management', 'carrier_management', 'user_management', 'financial_management']
};
```

## **🔍 Testing Permissions**

### **1. Test Cases**
- [ ] User can only see their company data
- [ ] Admin can manage company users
- [ ] Permissions are enforced at API level
- [ ] Firestore rules block unauthorized access
- [ ] Role hierarchy works correctly

### **2. Security Validation**
- [ ] No data leakage between companies
- [ ] Competition protection works
- [ ] Admin functions are properly restricted
- [ ] Audit trail is maintained

## **💡 Best Practices**

1. **Principle of Least Privilege** - Users get minimum permissions needed
2. **Role-Based Access** - Use roles for common permission sets
3. **Permission Granularity** - Fine-grained permissions for flexibility
4. **Audit Logging** - Track all permission changes
5. **Regular Reviews** - Periodically review user permissions

---

**This system ensures secure, scalable access control while maintaining data integrity and business rules.**
