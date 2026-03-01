# Project Architecture

Overview of the project structure, data models, and key systems.

## Directory Structure

```
src/
├── pages/                    # Next.js pages and API routes
│   ├── api/
│   │   ├── auth/
│   │   ├── destinations/
│   │   ├── activities/
│   │   ├── trips/
│   │   ├── expenses/
│   │   ├── files/
│   │   ├── budgets/
│   │   ├── timeline/
│   │   └── [other endpoints]
│   ├── trips/               # Trip management pages
│   ├── destinations/        # Destination pages
│   ├── activities.tsx       # Activities page
│   ├── budgets.tsx         # Budget tracking
│   ├── expenses.tsx        # Expense tracking
│   ├── files.tsx           # File management
│   ├── timeline.tsx        # Timeline events
│   ├── index.tsx           # Home dashboard
│   ├── login.tsx           # Authentication
│   ├── _app.tsx            # App wrapper
│   └── [other pages]
│
├── api/                     # Business logic layer
│   ├── trips.ts
│   ├── destinations.ts
│   ├── activities.ts
│   ├── expenses.ts
│   ├── budgets.ts
│   ├── files.ts
│   ├── timeline.ts
│   ├── itemPermissions.ts
│   ├── itemReferences.ts
│   └── [other services]
│
├── lib/                     # Utilities and integrations
│   ├── cosmosdb.ts         # Cosmos DB client
│   ├── email.ts            # Email notifications
│   ├── notifications.ts    # Notification orchestration
│   ├── auth-helpers.ts     # Permission checking
│   └── [other utilities]
│
├── components/              # Reusable React components
│   ├── ActivityRecommendations.tsx
│   ├── DestinationRecommendations.tsx
│   ├── MapComponent.tsx
│   └── [other components]
│
├── types/
│   └── schema.ts           # Zod schemas and TypeScript types
│
└── globals.css             # Global styles
```

## Pages Overview

| Page | Route | Purpose |
|------|-------|---------|
| Home | `/` | Dashboard with navigation |
| Destinations | `/destinations` | View and suggest destinations |
| Activities | `/activities` | View and create activities |
| Trips | `/trips/[id]` | Trip details and management |
| Budgets | `/budgets` | Budget tracking and analysis |
| Expenses | `/expenses` | Expense tracking |
| Files | `/files` | File upload and management |
| Timeline | `/timeline` | Timeline events and milestones |
| Login | `/login` | Authentication page |

## API Endpoints

### Trips (`/api/trips`)
- `GET` - List user's trips
- `POST` - Create new trip
- `GET /[id]` - Get trip details
- `PUT /[id]` - Update trip
- `DELETE /[id]` - Delete trip
- `POST /[id]/members` - Add/remove members
- `GET /[id]/expenses` - Get trip expenses
- `GET /[id]/files` - Get trip files
- `GET /[id]/feed` - Get trip activity feed

### Destinations (`/api/destinations`)
- `GET` - List destinations
- `POST` - Create destination
- `GET /[id]` - Get destination details
- `PUT /[id]` - Update destination
- `DELETE /[id]` - Delete destination
- `POST /[id]/vote` - Vote on destination
- `PATCH /[id]/make-public` - Toggle public status

### Activities (`/api/activities`)
- `GET` - List activities
- `POST` - Create activity
- `GET /[id]` - Get activity details
- `PUT /[id]` - Update activity
- `DELETE /[id]` - Delete activity
- `PUT /[id]?action=vote` - Vote on activity
- `PUT /[id]?action=status` - Update status

### Other Endpoints
- `/api/expenses` - Expense management
- `/api/budgets` - Budget management
- `/api/files` - File upload/download
- `/api/timeline` - Timeline events
- `/api/permissions` - Permission management

## Data Model

### Trip (Trip-centric Model)
A trip is the central entity that cascades permissions to all related items.

```typescript
Trip {
  id: uuid
  name: string
  description?: string
  goal: "relaxation" | "adventure" | "work" | "cultural" | "food" | "family" | "other"
  startDate: Date
  endDate: Date
  days: number
  people: string[]        // Full travelers (can create/edit items)
  viewers: string[]       // Guest viewers (read-only access)
  createdBy: string       // Creator email
  totalBudget: number
  currency: string
  status: "planning" | "active" | "completed" | "cancelled"
  hasPet: boolean
  createdAt: Date
  updatedAt: Date
}
```

### Destination
```typescript
Destination {
  id: uuid
  name: string
  description?: string
  place: string
  country: string
  latitude?: number
  longitude?: number
  tripId?: uuid          // Link to trip (cascades permissions)
  status: "proposed" | "accepted" | "planned" | "visited"
  addedBy: string        // Creator email
  votes: number
  votedBy: string[]
  urls: URL[]
  photos: Photo[]
  createdAt: Date
  updatedAt: Date
}
```

### Activity
```typescript
Activity {
  id: uuid
  name: string
  destinationId: uuid
  tripId?: uuid
  category: string
  description?: string
  location?: string
  latitude?: number
  longitude?: number
  addedBy: string
  votes: number
  votedBy: string[]
  status: "suggested" | "planned" | "completed"
  url?: string
  estimatedCost?: number
  duration?: string
  eventIds: uuid[]
  public: boolean
  createdAt: Date
  updatedAt: Date
}
```

### Expense
```typescript
Expense {
  id: uuid
  tripId: uuid
  destinationId?: uuid
  description: string
  amount: number
  currency: string
  category: "accommodation" | "food" | "activity" | "transport" | "other"
  paidBy: string         // Email of person who paid
  splits: Split[]        // How cost is split
  date: Date
  createdAt: Date
  updatedAt: Date
}
```

### Budget
```typescript
Budget {
  id: uuid
  tripId: uuid
  destinationId?: uuid
  category: string
  estimatedBudget: number
  actualSpent: number
  currency: string
  notes?: string
  createdAt: Date
  updatedAt: Date
}
```

### File
```typescript
File {
  id: uuid
  tripId?: uuid
  destinationId?: uuid
  activityId?: uuid
  filename: string
  blobUrl: string
  fileType: string       // MIME type
  fileSize: number
  category: "picture" | "document" | "ticket" | "other"
  uploadedBy: string     // Email
  createdAt: Date
  updatedAt: Date
}
```

### Timeline Event
```typescript
TimelineEvent {
  id: uuid
  tripId: uuid
  name: string
  description?: string
  date: Date
  type: "milestone" | "event" | "deadline"
  category?: string
  completed: boolean
  priority?: "low" | "medium" | "high"
  createdAt: Date
  updatedAt: Date
}
```

## Permission System

### Trip-Centric Access Control

All permissions cascade from Trip roles:

- **Creator** (trip.createdBy): Full control over trip and all items
- **Traveler** (trip.people[]): Can create, edit, and vote on items
- **Viewer** (trip.viewers[]): Read-only access, cannot vote or edit

### Permission Helpers (src/lib/auth-helpers.ts)

```typescript
canViewTrip(trip, userEmail)          // All roles
canEditTrip(trip, userEmail)          // Creator + Travelers
canViewTripBudget(trip, userEmail)    // Travelers only
canViewTripFiles(trip, userEmail)     // Travelers only
canVoteOnItems(trip, userEmail)       // Travelers only
canCreateExpense(trip, userEmail)     // Travelers only
canUploadTripFiles(trip, userEmail)   // Travelers only
```

### Usage Pattern

Every protected API endpoint must:
1. Get session and user email
2. Fetch trip data
3. Check appropriate permission
4. Return 403 if unauthorized

```typescript
const trip = await tripsApi.getTrip(tripId);
if (!canViewTrip(trip, userEmail)) {
  return res.status(403).json({ error: "Forbidden" });
}
```

See [permissions/PERMISSIONS.md](./permissions/PERMISSIONS.md) for detailed documentation.

## Database Schema (Azure Cosmos DB)

### Collections

| Collection | Partition Key | Purpose |
|-----------|--------------|---------|
| `trips` | `/createdBy` | Trip management |
| `destinations` | `/addedBy` | Destination suggestions |
| `activities` | `/destinationId` | Activities per destination |
| `expenses` | `/tripId` | Trip expenses |
| `budgets` | `/tripId` | Budget tracking |
| `files` | `/tripId` | File metadata |
| `timeline` | `/tripId` | Timeline events |
| `itemPermissions` | `/itemId` | Permission management |
| `itemReferences` | `/userId` | User's item references |

### Partition Key Strategy

- Use `/createdBy` for user-created items (destinations, trips)
- Use `/tripId` for trip-related items (expenses, budgets, files, timeline)
- Use `/destinationId` for destination-related items (activities)

This optimizes queries by naturally grouping related data.

## Authentication & Session

### NextAuth.js Configuration

Provider: GitHub OAuth 2.0

Session includes:
- User email
- User name
- User image

### Session Checking

**Server-side:**
```typescript
const session = await getServerSession(req, res, authOptions);
const userEmail = session?.user?.email || "";
```

**Client-side:**
```typescript
const { data: session } = useSession();
```

## File Storage

### Vercel Blob Storage

- Upload files to Vercel Blob
- Store metadata in Cosmos DB `files` collection
- Maximum file size: 50MB per upload
- Supports: images, documents, PDFs, etc.

### File Upload Flow

1. User selects file in UI
2. Convert to base64
3. POST to `/api/files`
4. Save to Vercel Blob
5. Store metadata in Cosmos DB
6. Return file ID to client

## Search & Filtering

### Query Patterns

**By trip:**
```typescript
SELECT * FROM c WHERE c.tripId = @tripId
```

**By status:**
```typescript
SELECT * FROM c WHERE c.tripId = @tripId AND c.status = @status
```

**Sorted by votes:**
```typescript
SELECT * FROM c WHERE c.tripId = @tripId ORDER BY c.votes DESC
```

## Email Notifications

Triggers:
- User added to trip
- User removed from trip
- Item upvoted
- New destination added
- New activity added
- Status changed

See [EMAIL_NOTIFICATIONS.md](./EMAIL_NOTIFICATIONS.md) for configuration.

## Type Safety

### Zod Schemas

All data models have Zod schemas in `src/types/schema.ts`:

```typescript
export const TripSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  // ... other fields
});

export type Trip = z.infer<typeof TripSchema>;
```

### Type Checking

```bash
npm run type-check
```

## Development Workflow

### Adding a New Feature

1. **Define schema** in `src/types/schema.ts`
2. **Create API functions** in `src/api/`
3. **Create API routes** in `src/pages/api/`
4. **Create UI page** in `src/pages/`
5. **Add navigation** in `src/pages/index.tsx`
6. **Test** locally with `npm run dev`

### Code Organization

- **Pages:** React UI components
- **API Routes:** HTTP endpoints
- **API Layer:** Business logic and database operations
- **Types:** Data models and validation
- **Lib:** Utilities, integrations, helpers

## Performance Optimization

### Database

- Use partition keys in queries
- Create indexes for frequently-filtered fields
- Batch operations when possible
- Avoid N+1 queries

### Frontend

- Use React hooks for state
- Lazy load components
- Memoize expensive computations
- Debounce search/filter inputs

### Caching

- Cosmos DB provides automatic indexing
- Consider SWR for client-side caching
- Use Next.js static generation where appropriate

## Styling

### Tailwind CSS

All styling uses Tailwind utility classes. Custom theme in `tailwind.config.js`.

### Global Styles

`src/globals.css` contains global imports and custom utilities.

## Error Handling

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not found
- `405` - Method not allowed
- `500` - Server error

### Error Messages

Always return clear error messages:
```json
{ "error": "User is not a member of this trip" }
```

## Logging & Debugging

### Console Logging

Development server logs available in terminal running `npm run dev`.

### TypeScript Checking

```bash
npm run type-check
```

### Linting

```bash
npm run lint
```

## Deployment Architecture

The application is designed for deployment to Vercel/Azure with:
- Static site generation where possible
- Server-side rendering for dynamic pages
- Server-side authentication
- External database and blob storage

See [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment instructions.
