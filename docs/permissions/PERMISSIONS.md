# Permissions System

Comprehensive documentation of the Family Road Trip 2028 permission system.

## Overview

The permission system uses a **trip-centric model** where access to all items is derived from the user's role in the trip itself:

- **Creator** - Full control over the trip and all items
- **Traveler** - Can create, edit, and vote on items
- **Viewer** - Read-only access, cannot create or edit

## User Roles

### Creator (trip.createdBy)
- **Can do everything**
- Manage trip members
- Create/edit/delete destinations and activities
- Create/edit expenses and budgets
- Upload and manage files
- Vote on destinations and activities
- Change status of items
- Invite travelers and viewers

### Traveler (trip.people[])
- Create destinations and activities
- Vote on destinations and activities
- View all trip data
- Create and track expenses
- Upload files to trip
- Manage budgets
- **Cannot**: Delete trip, remove other members, manage file storage
- **Cannot receive**: Certain notifications (viewers don't get some)

### Viewer (trip.viewers[])
- **Read-only access** to:
  - Destinations (can see but not vote)
  - Activities (can see but not vote)
  - Trip details
  - Timeline
  - **Picture files only** (cannot see document/ticket files)
- **Cannot**: Create, edit, delete anything
- **Cannot**: Vote, upload files, create expenses, manage budgets

## Permission Checking Helpers

### In `src/lib/auth-helpers.ts`

#### Role Determination
```typescript
getUserTripRole(trip, userEmail)    // Returns: "creator" | "traveler" | "viewer" | "none"
```

#### Permission Checkers
```typescript
// Basic access
canViewTrip(trip, userEmail)           // Can user see this trip?
canEditTrip(trip, userEmail)           // Can user edit trip? (creator + traveler)
canManageTripMembers(trip, userEmail)  // Can manage members? (creator only)

// Specific features
canViewTripBudget(trip, userEmail)     // View budget? (travelers only)
canViewTripFiles(trip, userEmail)      // View files? (travelers only)
canUploadTripFiles(trip, userEmail)    // Upload files? (travelers only)
canVoteOnItems(trip, userEmail)        // Vote? (travelers only)
canCreateExpense(trip, userEmail)      // Create expense? (travelers only)
canViewTripExpenses(trip, userEmail)   // View expenses? (travelers only)

// Viewers and specific status
isViewer(trip, userEmail)              // Is this user a viewer?
canViewTripDestinations(trip, userEmail) // Can see destinations? (all roles)
canEditTripDestinations(trip, userEmail) // Can edit destinations? (creator + traveler)
```

## Implementation Pattern

Every protected API endpoint should follow this pattern:

```typescript
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import * as tripsApi from "@/api/trips";
import { canViewTrip } from "@/lib/auth-helpers";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 1. Get session
  const session = await getServerSession(req, res, authOptions);
  const userEmail = session?.user?.email || "";

  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // 2. Get trip
  const trip = await tripsApi.getTrip(tripId);
  if (!trip) {
    return res.status(404).json({ error: "Trip not found" });
  }

  // 3. Check appropriate permission
  if (!canViewTrip(trip, userEmail)) {
    return res.status(403).json({ error: "You do not have access to this trip" });
  }

  // 4. For specific operations, check more granular permission
  if (req.method === "POST") {
    if (!canEditTrip(trip, userEmail)) {
      return res.status(403).json({ error: "You cannot edit this trip" });
    }
  }

  // 5. Proceed with operation
  // ...
}
```

## Permission Rules

### Trip Management

| Operation | Creator | Traveler | Viewer |
|-----------|---------|----------|--------|
| View trip | ✅ | ✅ | ✅ |
| Edit trip | ✅ | ❌ | ❌ |
| Delete trip | ✅ | ❌ | ❌ |
| Manage members | ✅ | ❌ | ❌ |
| View members | ✅ | ✅ | ✅ |

### Destinations

| Operation | Creator | Traveler | Viewer |
|-----------|---------|----------|--------|
| View | ✅ | ✅ | ✅ |
| Create | ✅ | ✅ | ❌ |
| Edit | ✅ | ✅ | ❌ |
| Delete | ✅ | ❌ | ❌ |
| Vote | ✅ | ✅ | ❌ |
| Change status | ✅ | ✅ | ❌ |

### Activities

| Operation | Creator | Traveler | Viewer |
|-----------|---------|----------|--------|
| View | ✅ | ✅ | ✅ |
| Create | ✅ | ✅ | ❌ |
| Edit | ✅ | ✅ | ❌ |
| Delete | ✅ | ❌ | ❌ |
| Vote | ✅ | ✅ | ❌ |
| Change status | ✅ | ✅ | ❌ |

### Budgets & Expenses

| Operation | Creator | Traveler | Viewer |
|-----------|---------|----------|--------|
| View expenses | ✅ | ✅ | ❌ |
| Create expense | ✅ | ✅ | ❌ |
| Edit expense | ✅ | ✅ | ❌ |
| Delete expense | ✅ | ❌ | ❌ |
| View budget | ✅ | ✅ | ❌ |
| Create budget | ✅ | ✅ | ❌ |
| Edit budget | ✅ | ✅ | ❌ |

### Files

| Operation | Creator | Traveler | Viewer |
|-----------|---------|----------|--------|
| View pictures | ✅ | ✅ | ✅ |
| View documents | ✅ | ✅ | ❌ |
| View tickets | ✅ | ✅ | ❌ |
| Upload files | ✅ | ✅ | ❌ |
| Delete files | ✅ | ❌ | ❌ |

## Notification Rules

### Who receives which notifications?

#### User Added to Trip
- **Recipients:** The added user only
- **Condition:** Always for travelers and viewers

#### User Removed from Trip
- **Recipients:** The removed user only
- **Condition:** Always

#### Destination/Activity Upvoted
- **Recipients:** Item creator only
- **Condition:** Only if voter is not creator

#### New Destination Added
- **Recipients:** All trip members except creator
- **Condition:** Creator gets auto-vote, other travelers notified

#### New Activity Added
- **Recipients:** All trip members except creator
- **Condition:** Creator gets auto-vote, other travelers notified

## Trip Member Management

### Adding a Traveler
```typescript
POST /api/trips/[id]/members
{
  "email": "family-member@example.com",
  "role": "traveler"
}
```

Result:
- User can create/edit destinations and activities
- User can vote
- User gets all notifications

### Adding a Viewer
```typescript
POST /api/trips/[id]/members
{
  "email": "family-member@example.com",
  "role": "viewer"
}
```

Result:
- User can only view trip data
- User can only see picture files (not documents/tickets)
- User cannot vote or create items
- User gets limited notifications

### Removing a Member
```typescript
DELETE /api/trips/[id]/members?email=family-member@example.com
```

Result:
- All access revoked
- User receives removal notification
- User cannot see trip anymore

## Data Isolation

### Each user sees only:
1. **Trips they are part of** (creator, traveler, or viewer)
2. **Destinations from those trips** (with cascading permissions)
3. **Their own public items** (accessible to all users)
4. **Items shared explicitly** (via trip membership)

### Example Scenario

Alice creates a trip and adds:
- Bob as traveler
- Charlie as viewer

**Alice sees:**
- All destinations, activities, files, expenses (full access)

**Bob sees:**
- All destinations, activities, timeline (can edit)
- All files including documents
- All expenses and budgets
- Can vote, add items, upload files

**Charlie sees:**
- All destinations and activities (read-only, cannot vote)
- Timeline (read-only)
- Picture files only (not documents/tickets)
- Cannot see expenses or budgets
- Cannot vote or add items

## Security Considerations

### Always Verify on Server
- Client-side checks are for UX only
- **Always verify permissions on API endpoints**
- Never trust client to enforce permissions

### Email-Based Identification
- Users identified by email (from GitHub OAuth)
- Email is permanent within app
- No direct user IDs externally exposed

### Cascade Rules
- When user added to trip, permissions cascade to all items
- When user removed, all permissions revoked automatically
- When user role changed, permissions updated across all items

### Public Items
- Only public items visible to non-members
- Can be made public by creator
- Same permission checks apply

## Advanced: Custom Permissions

For special cases, the system also supports item-level permissions through `itemPermissions` collection:

```typescript
// Grant specific permission
await permissionsApi.grantPermission(
  itemId,           // destination, activity, budget, etc
  "destination",    // item type
  userEmail,
  "contributor",    // role
  "trip",           // parent type
  tripId            // parent ID
);
```

But for most cases, trip-based permissions are sufficient.

## Testing Permissions

### Local Testing

1. Create a trip as User A (yourself)
2. Invite User B as traveler and User C as viewer
3. Use different browsers/sessions to test each role
4. Verify:
   - User B can create/edit items
   - User C can only view items
   - User C cannot see documents

### Permission Boundaries to Test

- ✅ Un-authenticated user gets 401
- ✅ Non-member gets 403
- ✅ Viewer cannot vote (403)
- ✅ Viewer cannot upload files (403)
- ✅ Viewer cannot see expenses (403)
- ✅ Traveler can vote
- ✅ Traveler can upload
- ✅ Creator can manage members

## Troubleshooting

### User says "Permission Denied"

1. Verify user is in trip.people or trip.viewers
2. Check which operation they're trying
3. Verify permission helper function is correct
4. Check API logs for permission checks

### User should see item but doesn't

1. Check user's role (creator/traveler/viewer)
2. Verify `canView*` function used in endpoint
3. Check authentication (session exists?)
4. Test with different browser/incognito to rule out caching

### Editing works when it shouldn't

Always verify `canEdit*` is used, not just `canView*`

## References

- **Helper Functions:** [src/lib/auth-helpers.ts](../../src/lib/auth-helpers.ts)
- **Permission API:** [src/api/itemPermissions.ts](../../src/api/itemPermissions.ts)
- **Trip Schema:** [src/types/schema.ts](../../src/types/schema.ts)
- **Development Guide:** [DEVELOPMENT.md](../DEVELOPMENT.md)
