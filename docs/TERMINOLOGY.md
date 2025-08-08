# TranzIt.io System Terminology Reference

This document serves as the official reference for terminology used throughout the TranzIt.io platform. Maintaining consistent terminology is crucial for code clarity and system integrity.

## User Types and Roles

### Primary User Types (`userType`)
- `shipper` - Company that needs freight transported
- `carrier` - Company that transports freight
- `driver` - Individual who drives for a carrier

### Status Types

#### User Status
- `online` - User is currently active
- `offline` - User is inactive

#### Carrier Status (`CarrierStatus`)
- `active` - Carrier is operational and can accept loads
- `inactive` - Carrier is temporarily not accepting loads
- `pending` - Carrier registration is pending approval
- `suspended` - Carrier account has been suspended

#### Shipment Status (`ShipmentStatus`)
- `scheduled` - Shipment is planned but not yet in transit
- `in_transit` - Shipment is currently being transported
- `delivered` - Shipment has been delivered
- `delayed` - Shipment is experiencing delays
- `cancelled` - Shipment has been cancelled

## Common Fields

### User Information
- `companyName` - Name of the company
- `companyRep` - Representative's name from the company
- `phoneNumber` - Contact phone number
- `email` - Email address
- `address` - Physical address information
  - `street`
  - `city`
  - `state`
  - `zip`

### Carrier-Specific Fields
- `mcNumber` - Motor Carrier number
- `dotNumber` - Department of Transportation number
- `equipment` - List of available equipment
- `serviceAreas` - Geographic areas where carrier operates
- `preferredLoadTypes` - Types of loads carrier prefers to transport
- `minimumRate` - Minimum acceptable rate per mile

### Insurance Types (`InsuranceType`)
- `liability` - General liability insurance
- `cargo` - Cargo insurance
- `physical_damage` - Physical damage coverage
- `workers_comp` - Workers compensation insurance

### Metrics and Performance
- `totalLoads` - Total number of loads handled
- `completedLoads` - Number of successfully completed loads
- `onTimeDeliveries` - Number of on-time deliveries
- `averageTransitTime` - Average time in transit (hours)
- `averageResponseTime` - Average response time to load offers (minutes)
- `rating` - Performance rating (1-5 scale)

## Relationships

### Company Hierarchy
- `parentCompanyId` - ID linking driver to their carrier/shipper
- `inviterId` - ID of the user who sent an invitation

## Document Types

### Carrier Documents
- Insurance certificates
- Operating authority
- W-9 forms
- Safety records

## System States

### Authentication States
- `isAuthenticated` - User is logged in and verified
- `isPending` - Action is in progress
- `isVerified` - User's credentials are verified

## Best Practices

1. **Always Use Established Terms**
   - Use `userType` instead of "role" or "userRole"
   - Use `shipper`/`carrier` instead of "company_owner"

2. **Status Consistency**
   - Use the defined status enums
   - Don't create new status types without documentation

3. **Field Naming**
   - Use camelCase for all field names
   - Be consistent with prefix/suffix patterns

## Notes for Developers

1. When adding new terms or fields:
   - Document them in this reference
   - Use existing patterns where possible
   - Get team approval for new terminology

2. When writing code:
   - Reference this document for correct terms
   - Use TypeScript interfaces to enforce terminology
   - Add JSDoc comments referencing official terms

3. When creating UI elements:
   - Use exact terms from this reference
   - Maintain consistent capitalization
   - Use official field names in form elements

## Version Control

This terminology reference should be updated whenever new terms are added to the system. All updates should be reviewed and approved by the team lead.
