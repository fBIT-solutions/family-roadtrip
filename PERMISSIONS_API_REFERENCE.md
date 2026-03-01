# Permissions System - API Quick Reference

## Function Usage Guide

### Core Permission Checks

```typescript
import * as permissionsApi from "@/api/itemPermissions";

// Check if user can view item
const canView = await permissionsApi.canViewItem(itemId, userEmail);
if (!canView) {
  return res.status(403).json({ error: "Access denied" });
}

// Check if user can edit item
const canEdit = await permissionsApi.canEditItem(itemId, userEmail);
if (!canEdit) {
  return res.status(403).json({ error: "You cannot edit this" });
}

// Check if user owns item (delete/permission management)
const isOwner = await permissionsApi.isOwner(itemId, userEmail);
if (!isOwner) {
  return res.status(403).json({ error: "Only owner can delete" });
}

// Check if item is public
const isPublic = await permissionsApi.isPublic(itemId);
```

### Creating Items with Permissions

**When creating a destination:**
```typescript
const destination = await destinationApi.createDestination(
  {
    name, place, country, // ... other data
    addedBy: userEmail,
    tripId: tripId
  },
  userEmail,           // creator email for permission
  tripId              // trip to cascade permissions to
);
```

**When creating an activity:**
```typescript
const activity = await activitiesApi.createActivity(
  name,
  destinationId,
  userEmail,          // creator email
  { category, description, url, ... },
  tripId              // optional: pass trip for cascading
);
```

**When creating an expense:**
```typescript
const expense = await expenseApi.createExpense(
  {
    title, amount, currency, category,
    date, paidBy, tripId,
    // ... other expense fields
  },
  userEmail           // creator email for permission
);
```

**When creating a timeline event:**
```typescript
const event = await timelineApi.createTimelineEvent(
  {
    title, description, date, tripId,
    // ... other event fields
  },
  userEmail           // creator email for permission
);
```

## API Endpoint Patterns

### GET (List) Endpoint
```typescript
// Already handles permissions internally by getting user's trips
const items = await api.getItemsForUser(userEmail, userTripIds);
```

### GET (Single Item) Endpoint
```typescript
// Always check view permission before returning
const canView = await permissionsApi.canViewItem(itemId, userEmail);
if (!canView) {
  return res.status(403).json({ error: "Access denied" });
}

const item = await api.getItem(itemId);
res.status(200).json(item);
```

### POST (Create) Endpoint
```typescript
// Pass creator email and trip info to create function
const item = await api.createItem(
  { ...data, addedBy: userEmail },
  userEmail,    // for permission
  tripId        // for cascading
);
res.status(201).json(item);
```

### PUT (Update) Endpoint
```typescript
// Check edit permission before updating
const canEdit = await permissionsApi.canEditItem(itemId, userEmail);
if (!canEdit) {
  return res.status(403).json({ error: "Cannot edit" });
}

const updated = await api.updateItem(itemId, updates);
res.status(200).json(updated);
```

### DELETE Endpoint
```typescript
// Check ownership before deleting
const isOwner = await permissionsApi.isOwner(itemId, userEmail);
if (!isOwner) {
  return res.status(403).json({ error: "Only owner can delete" });
}

await api.deleteItem(itemId);
res.status(204).end();
```

## Cascading Permissions

When you need to manually cascade permissions:

```typescript
import * as permissionsApi from "@/api/itemPermissions";

// Cascade to destination members (when adding member to trip)
await permissionsApi.grantDestinationToTripMembers(
  destinationId,
  tripId,
  members,      // array of emails (travelers)
  guests        // array of emails (viewers)
);

// Cascade to activity members
await permissionsApi.grantActivityToDestinationMembers(
  activityId,
  destinationId,
  tripId,
  members,
  guests
);

// Revoke cascaded permissions
await permissionsApi.revokeChildPermissions(
  [activityId1, activityId2],  // child item IDs
  userEmail                    // user to revoke
);
```

## Common Pattern: Trip Context

When an API supports both trip-scoped and item-scoped queries:

```typescript
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const userEmail = session.user?.email || "";
  const { tripId, itemId } = req.query;

  if (req.method === "GET") {
    // Trip-scoped query
    if (tripId) {
      const canView = await permissionsApi.canViewItem(tripId as string, userEmail);
      if (!canView) {
        return res.status(403).json({ error: "Access denied" });
      }
      // Return trip's items
      const items = await api.getItemsByTrip(tripId as string);
      return res.status(200).json(items);
    }

    // User's items (public + their own)
    const userTrips = await tripsApi.getTripsForUser(userEmail);
    const items = await api.getItemsForUser(userEmail, userTrips.map(t => t.id));
    return res.status(200).json(items);
  }

  if (req.method === "POST") {
    // Create item (auto-grants permissions)
    const item = await api.createItem(req.body, userEmail, tripId);
    return res.status(201).json(item);
  }
}
```

## Public Items

To make an item public:
```typescript
// Make item public (readable by all)
await permissionsApi.makePublic(itemId, "destination", "reader");

// Make item private again
await permissionsApi.makePrivate(itemId);

// Check if item is public
const isPublic = await permissionsApi.isPublic(itemId);
```

## Permission Roles

- **owner**: Full access (view, edit, delete, manage permissions)
- **contributor**: View & edit (cannot delete or revoke permissions)
- **reader**: View only

## Error Responses

```typescript
// Unauthorized (no session)
403 - { error: "Unauthorized" }

// Forbidden (not a member)
403 - { error: "You do not have access to this X" }

// Cannot edit
403 - { error: "You do not have permission to edit this X" }

// Cannot delete
403 - { error: "Only owner can delete this X" }

// Not found
404 - { error: "X not found" }
```

## Testing Permissions

```typescript
// Get all permissions for an item
const perms = await permissionsApi.getItemPermissions(itemId);
console.log(perms); // [{itemId, userId, role, ...}]

// Get user's accessible items
const myDestinations = await permissionsApi.getUserItems(
  userEmail,
  "destination",
  "contributor"  // min role needed
);

// Get user's role for item
const role = await permissionsApi.getUserPermissionRole(itemId, userEmail);
console.log(role); // "owner" | "contributor" | "reader" | null
```

## Migration Notes

Old auth helper functions that should be replaced:
```typescript
// OLD: canViewTrip, canEditTrip
// NEW: permissionsApi.canViewItem(tripId, userEmail)
//      permissionsApi.canEditItem(tripId, userEmail)

// OLD: canManageTripMembers
// NEW: permissionsApi.isOwner(tripId, userEmail)

// OLD: canViewTripDestinations, canViewTripActivities, etc
// NEW: permissionsApi.canViewItem(itemId, userEmail)

// OLD: canEditTripDestinations, canEditTripActivities, etc
// NEW: permissionsApi.canEditItem(itemId, userEmail)
```

## Performance Tips

1. **Batch permission checks** when possible
   ```typescript
   const checks = await Promise.all([
     permissionsApi.canViewItem(itemId1, userEmail),
     permissionsApi.canViewItem(itemId2, userEmail),
     permissionsApi.canViewItem(itemId3, userEmail),
   ]);
   ```

2. **Cache trip members** if checking many items
   ```typescript
   const trip = await tripsApi.getTrip(tripId);
   // Use trip.people and trip.viewers for logic instead of fetching permissions
   ```

3. **Let cascade handle nested** permissions
   - Don't manually create permissions for nested items
   - Use grantDestinationToTripMembers() and grantActivityToDestinationMembers()

## Debugging

Check permissions in Cosmos DB:
```sql
-- All permissions for a specific item
SELECT * FROM c WHERE c.itemId = 'destination-123'

-- All items accessible to a user
SELECT * FROM c WHERE c.userId = 'user@example.com'

-- Check for public permissions
SELECT * FROM c WHERE c.userId = '*'

-- Count permissions by item type
SELECT c.itemType, COUNT(1) as count FROM c GROUP BY c.itemType
```
