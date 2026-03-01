# Family Roadtrip 2028 - Copilot Instructions

## Project Overview
**Family Roadtrip 2028** is a Next.js 15 app for planning collaborative road trips. The core entity is **Trip**, which cascades permissions to related items (Destinations, Activities, Files, Budgets, Expenses, Timeline events).

**Key Technologies**: Next.js, TypeScript, Zod schemas, Azure Cosmos DB, Vercel Blob, NextAuth.js

---

## Architecture: Trip-Centric Model

### Data Structure
```
Trip (trip.people, trip.viewers, trip.createdBy)
├── Destinations (dest.tripId, cascading perms from trip)
├── Activities (activity.destinationId → tripId)
├── Files (file.tripId, file.destinationId, file.activityId)
├── Expenses (expense.tripId, expense.destinationId)
├── Timeline Events (event.tripId)
└── Budgets (budget.tripId)
```

**Critical**: Items don't directly reference trip role - they cascade permissions through the Trip entity. Example: `destinations/[id]/vote.ts` must fetch trip and check `canVoteOnItems(trip, userEmail)`.

### User Roles (from Trip.people & Trip.viewers)
- **Creator** (trip.createdBy): Full control
- **Traveler** (trip.people[]): Create/edit items, vote, manage budgets, upload files
- **Viewer** (trip.viewers[]): Read-only, NO voting, NO files, NO budgets, NO expenses

---

## Permission System

### Core Functions (src/lib/auth-helpers.ts)
```typescript
canViewTrip()              // All roles
canEditTrip()              // Creator + Travelers only
canViewTripBudget()        // Travelers only (VIEWERS BLOCKED)
canViewTripFiles()         // Travelers only (VIEWERS BLOCKED)
canVoteOnItems()           // Travelers only (VIEWERS BLOCKED)
canCreateExpense()         // Travelers only
canUploadTripFiles()       // Travelers only
```

**Pattern**: Every API endpoint with data access must:
1. Get session: `const session = await getServerSession(req, res, authOptions);`
2. Extract email: `const userEmail = session.user?.email || "";`
3. Fetch trip: `const trip = await tripsApi.getTrip(tripId);`
4. Check permission: `if (!canViewTrip(trip, userEmail)) return res.status(403)...`

### Example: Vote Endpoint (`src/pages/api/destinations/[id]/vote.ts`)
```typescript
// BAD: Allows viewers to vote
const success = await destinationApi.voteForDestination(id, userEmail);

// GOOD: Check permission first
const destination = await destinationApi.getDestination(id);
if (destination.tripId) {
  const trip = await tripsApi.getTrip(destination.tripId);
  if (!canVoteOnItems(trip, userEmail)) return res.status(403)...
}
```

---

## API Response Format Inconsistency (Common Gotcha!)

### GET /api/activities endpoint returns TWO formats:
**Without filters** (no tripId/destinationId):
```typescript
return res.status(200).json({ activities: [...], itemReferences: [...] })
```

**With filters** (tripId or destinationId):
```typescript
return res.status(200).json([...])  // Direct array
```

### Frontend Fix (ALWAYS USE THIS PATTERN):
```typescript
const tripActivities = (activitiesResponse.data.activities || activitiesResponse.data).filter(...)
```

---

## Build, Dev & Environment

### Commands
```bash
npm run dev        # Start dev server (localhost:3000)
npm run build      # Next.js production build
npm run lint       # Run ESLint
```

### Critical Environment Variables
```
NEXTAUTH_SECRET=<required>
NEXTAUTH_URL=http://localhost:3000

AZURE_COSMOS_ENDPOINT=https://...documents.azure.com:443
AZURE_COSMOS_KEY=<required>
AZURE_COSMOS_DB_NAME=web-db

AZURE_COSMOS_CONTAINERS_TRIPS=trips
AZURE_COSMOS_CONTAINERS_DESTINATIONS=destinations
AZURE_COSMOS_CONTAINERS_ACTIVITIES=activities
AZURE_COSMOS_CONTAINERS_EXPENSES=expenses
AZURE_COSMOS_CONTAINERS_FILES=files
AZURE_COSMOS_CONTAINERS_TIMELINE=timeline
AZURE_COSMOS_CONTAINERS_BUDGETS=budgets

BLOB_READ_WRITE_TOKEN=<Vercel Blob token>
```

---

## Type Safety Gotchas

### 1. NULL vs UNDEFINED from NextAuth
NextAuth session.user?.email can be **null**. Always convert:
```typescript
// WRONG: Passes null to function expecting string | undefined
const userEmail = session.user?.email;

// RIGHT: Explicitly converts null to undefined
const userEmail = session.user?.email || undefined;
```

### 2. Union Type Narrowing
When handling Activity | Destination unions, TypeScript doesn't know which properties exist:
```typescript
// WRONG: destinationId not on all types
const tripActivities = originalItem.destinationId;

// RIGHT: Cast/narrow first
const activity = originalItem as Activity;
const tripActivities = activity.destinationId;
```

### 3. Index Type Safety
```typescript
// WRONG: TypeScript can't verify key exists
const statusColor = statusColors[activity.status];

// RIGHT: Explicitly cast key type
const statusColor = statusColors[activity.status as keyof typeof statusColors];
```

---

## Frontend Patterns

### useSession & Auth Flow
```typescript
const { data: session, status } = useSession();
const { id } = router.query;

useEffect(() => {
  if (!router.isReady) return;  // Wait for router
  if (status === "unauthenticated") router.push("/login");
  if (status === "authenticated") fetchData();
}, [router.isReady, status]);
```

### Form Handling Pattern
```typescript
const [formData, setFormData] = useState({ name: "", email: "" });

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  const response = await axios.post("/api/endpoint", formData);
  setFormData({ name: "", email: "" });  // Reset form
  toast.success("Success!");
};
```

### Defensive Array Access
```typescript
// API might return { items, data } or direct array
const items = (response.data.items || response.data).filter(...);
```

---

## Key Files to Understand

- **src/lib/auth-helpers.ts** - All permission helper functions
- **src/api/itemPermissions.ts** - Permission grant/revoke/check logic
- **src/types/schema.ts** - All Zod schemas (Trip, Destination, Activity, etc.)
- **src/pages/api/trips/[id].ts** - Trip detail endpoint with permission checks
- **src/pages/api/destinations/[id]/vote.ts** - Example of correct permission check pattern
- **src/pages/trips/[id].tsx** - Main trip UI with role-based rendering (travelers vs viewers)
- **src/lib/cosmosdb.ts** - Cosmos DB connection & container setup

---

## Important Workflows

### Adding a New Permission-Protected Feature
1. Define permission helper in `src/lib/auth-helpers.ts`
2. Add check to endpoint: `if (!canDoX(trip, userEmail)) return 403`
3. Test with both traveler and viewer roles
4. Update UI to conditionally render for travelers only (check `canViewTrip()` client-side)

### Fixing Response Format Issues
1. Always defensive: `(response.data.items || response.data).filter(...)`
2. If adding new endpoint, return consistent format: prefer object with named properties
3. Consider creating response wrapper: `{ data: [...], meta: {} }`

### Debugging Permission Errors
1. Check if user is in trip.people (traveler) vs trip.viewers (viewer)
2. Verify correct permission helper is used (not just canViewTrip - use specific one)
3. Check if item has parentType/parentId in permissions table
4. Cosmos DB queries use ARRAY_CONTAINS - ensure array fields have correct values

---

## ESLint Configuration
Current: Simplified config in `eslint.config.mjs` (Next.js plugin issue). If extending, avoid importing non-existent submodules like `eslint-config-next/core-web-vitals`.


---
## Instructions when running terminal commands
When running terminal commands, ensure you are in the correct directory (`family-roadtrip-2028`). Also make sure you kill any running dev server before starting a new one to avoid port conflicts. Use `npm run dev` for development and `npm run build` for production builds. Always set environment variables before running commands that require database access. U can load the env vars from the `.env.local` file.