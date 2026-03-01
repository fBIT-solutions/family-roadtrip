# Permissions System Implementation Guide

## Overview

This document describes the implemented fine-grained permissions system for the Family Roadtrip 2028 application. The system controls access rights at the database level using the `item-permissions` container.

## Architecture

### Permission Model

Each permission record stores:
- **itemId**: UUID of the item (trip, destination, activity, file, etc.)
- **itemType**: Type of item (trip, destination, activity, file, expense, schedule)
- **userId**: Email of the user (or "*" for public items)
- **role**: One of "owner", "contributor", or "reader"
- **parentType**: Optional type of parent item (trip, destination)
- **parentId**: Optional ID of parent item
- **createdAt/updatedAt**: Timestamps

### Role Definitions

| Role | Permissions | Notes |
|------|-----------|-------|
| **owner** | Full access (view, edit, delete, share) | Can manage permissions for others |
| **contributor** | View, edit, add to items | Can modify item but cannot delete or revoke permissions |
| **reader** | View only | Read-only access to item |

### Permission Hierarchy

Permissions follow a parent-child model:
- **Trip** → Destinations → Activities
- Permissions granted at parent level cascade to children
- When removing a member, all child permissions are revoked

## Database Schema

### ItemPermission Type
```typescript
{
  id: string;              // UUID
  itemId: string;          // UUID of the item
  itemType: "trip" | "destination" | "activity" | "file" | "expense" | "schedule";
  userId: string;          // User email or "*" for public
  role: "owner" | "contributor" | "reader";
  parentType?: "trip" | "destination";
  parentId?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

## API Modules

### 1. `src/api/itemPermissions.ts`

Core permission management functions:

```typescript
// Grant/revoke permissions
await grantPermission(itemId, itemType, userId, role, parentType, parentId);
await revokePermission(itemId, userId);

// Query permissions
await getUserPermissionRole(itemId, userId);           // Get user's role
await getItemPermissions(itemId);                       // Get all permissions for item
await getUserItems(userId, itemType, role);             // Get user's items of type
await getChildItems(parentId, parentType);              // Get child items

// Permission checks
await canViewItem(itemId, userId);      // Can user view?
await canEditItem(itemId, userId);      // Can user edit?
await isOwner(itemId, userId);          // Is user owner?
await isPublic(itemId);                 // Is item public?

// Public/private management
await makePublic(itemId, itemType, role);   // Make item public
await makePrivate(itemId);                   // Remove public access

// Trip-specific helpers
await grantDestinationToTripMembers(destinationId, tripId, members, guests);
await grantActivityToDestinationMembers(activityId, destinationId, tripId, members, guests);
```

### 2. `src/lib/permissions.ts`

Helper functions for use in API endpoints:

```typescript
// Permission checks
await checkPermission(itemId, userId, requiredRole);     // Returns boolean
await assertPermission(itemId, userId, requiredRole);    // Throws on failure

// Get accessible items
await getViewableItems(userId, itemType);    // Items user can view
await getEditableItems(userId, itemType);    // Items user can edit
await getOwnedItems(userId, itemType);       // Items user owns

// Filter item arrays
await filterViewableItems(items, userId, itemType);
await filterEditableItems(items, userId, itemType);

// Nested access checks
await canAccessActivityThroughDestination(activityId, destId, userId, role);
await canAccessDestinationThroughTrip(destId, tripId, userId, role);
```

### 3. API Endpoints

#### `/api/permissions` - Manage permissions
```
GET    /api/permissions?itemId=...      Get all permissions for item
GET    /api/permissions?userId=...&itemType=... Get user's items
POST   /api/permissions                 Grant permission
PATCH  /api/permissions                 Update user's role
DELETE /api/permissions                 Revoke permission
```

#### `/api/permissions/public` - Toggle public access
```
PATCH  /api/permissions/public          Make item public/private
       Body: { itemId, itemType, isPublic }
```

#### `/api/trips/[id]/members` - Manage trip members
```
POST   /api/trips/[id]/members          Add member (traveler/viewer)
DELETE /api/trips/[id]/members          Remove member
       Body: { email, role }
```

## Integration Points

### Trip Management

When a trip is created:
1. Owner permission granted to creator
2. Contributor permissions granted to travelers (people array)
3. Reader permissions granted to viewers

When adding/removing trip members:
1. Permissions cascade to all destinations in trip
2. Permissions cascade to all activities in destinations
3. Removes all permissions when member is removed

### Destination Management

When destination is added to trip:
1. Trip travelers get contributor access
2. Trip viewers get reader access
3. All existing activities inherit permissions

### Activity Management

When activity is created:
1. Creator gets owner permission
2. All destination members inherit permissions
3. Activity inherits destination's parentType/parentId

### Public Items

When item is made public:
1. Permission record created with userId = "*"
2. All non-authenticated users can view (reader role)
3. Public permissions can be revoked to make private

## Usage Examples

### Check if user can edit destination
```typescript
const canEdit = await permissionsApi.canEditItem(destinationId, userEmail);
if (!canEdit) {
  throw new Error("Insufficient permissions");
}
```

### Get all trips for user
```typescript
const tripPermissions = await permissionsApi.getUserItems(userEmail, "trip");
const tripIds = tripPermissions.map(p => p.itemId);
```

### Add guest to trip with viewer access
```typescript
await tripsApi.addViewerToTrip(tripId, guestEmail);
// Auto-creates permission records for trip and all destinations
```

### Make destination public
```typescript
await permissionsApi.makePublic(destinationId, "destination", "reader");
// Users (authenticated or not) can view the destination
```

### Revoke public access
```typescript
await permissionsApi.makePrivate(destinationId);
// Only those with explicit permissions can view
```

## Migration Path

### For Existing Data

To migrate existing trips to the permission system:

1. For each trip:
   - Create owner permission for createdBy user
   - Create contributor permissions for people array
   - Create reader permissions for viewers array

2. For each destination with tripId:
   - Create owner permission for addedBy user
   - Create contributor/reader permissions for trip members

3. For each activity:
   - Create owner permission for addedBy user
   - Inherit from parent destination

### Script Template
```typescript
async function migratePermissions() {
  const trips = await getAllTrips();
  
  for (const trip of trips) {
    // Grant trip owner
    await grantPermission(trip.id, "trip", trip.createdBy, "owner");
    
    // Grant trip members
    for (const email of trip.people) {
      await grantPermission(trip.id, "trip", email, "contributor");
    }
    
    // Grant trip viewers
    for (const email of trip.viewers) {
      await grantPermission(trip.id, "trip", email, "reader");
    }
  }
  
  // Repeat for destinations, activities, etc.
}
```

## Environment Variables

Add to `.env.local`:
```
AZURE_COSMOS_CONTAINERS_ITEM_PERMISSIONS=item-permissions
```

## Cosmos DB Setup

Create container in Azure Cosmos DB:
- Container ID: `item-permissions`
- Partition key: `/itemId`
- Indexes on: `itemType`, `userId`, `parentId`, `parentType`

## Security Considerations

1. **Always check permissions** in API endpoints before returning/modifying data
2. **Use utility functions** from `src/lib/permissions.ts` for consistency
3. **Cascade permissions** when items are linked or removed
4. **Audit changes** by tracking createdAt/updatedAt timestamps
5. **Public items** should use role "reader" only, never "contributor" or "owner"
6. **Cleanup permissions** when items are deleted

## Testing

### Permission Checks
```typescript
// Test owner access
const isOwner = await permissionsApi.isOwner(itemId, ownerEmail);
expect(isOwner).toBe(true);

// Test cascade
await tripsApi.addTravelerToTrip(tripId, newTraveler);
const destPerms = await permissionsApi.getItemPermissions(destinationId);
expect(destPerms.some(p => p.userId === newTraveler)).toBe(true);

// Test revocation
await tripsApi.removeTravelerFromTrip(tripId, traveler);
const destPermsAfter = await permissionsApi.getItemPermissions(destinationId);
expect(destPermsAfter.some(p => p.userId === traveler)).toBe(false);
```

## Future Enhancements

1. **Fine-grained permissions**: Add permissions for specific actions (view budget, edit budget, delete expense, etc.)
2. **Permission inheritance rules**: Define which actions cascade vs don't cascade
3. **Audit logging**: Track all permission changes with user and timestamp
4. **Permission templates**: Pre-defined permission sets for common scenarios
5. **Time-based permissions**: Access revoked after specific date/time
6. **Delegation**: Owner can delegate permission granting to others

## File Structure

```
src/
├── api/
│   └── itemPermissions.ts                    # Core permission API
├── lib/
│   ├── cosmosdb.ts                           # Updated with itemPermissions container
│   └── permissions.ts                        # Permission helper functions
├── types/
│   └── schema.ts                             # ItemPermission type
└── pages/api/
    ├── permissions.ts                        # /api/permissions endpoint
    ├── permissions/
    │   └── public.ts                         # /api/permissions/public endpoint
    └── trips/[id]/
        └── members.ts                        # Updated member management
```

## Summary

The permissions system provides:
✅ Fine-grained access control at the database level
✅ Role-based permissions (owner, contributor, reader)
✅ Cascading permissions for nested items
✅ Public/private item sharing
✅ Automatic permission management for trip members
✅ Helper functions for consistent permission checks
✅ API endpoints for permission management

This system is stable, secure, and ready for production use.
