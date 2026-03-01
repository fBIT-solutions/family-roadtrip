# Development Guide

This guide covers everything needed to set up and develop the Family Road Trip 2028 application locally.

## Prerequisites

Before you start, ensure you have:

- **Node.js 18 or higher** - Download from [nodejs.org](https://nodejs.org/)
- **Git** - For version control
- **An Azure Account** - For Cosmos DB ([sign up free](https://azure.microsoft.com/free/))
- **A Vercel Account** - For Blob Storage ([vercel.com](https://vercel.com))
- **A GitHub Account** - For OAuth authentication

## Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/jo-anb/family-roadtrip-2028.git
cd family-roadtrip-2028
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env.local
```

Edit `.env.local` with the credentials from the following sections.

### 3. Generate NextAuth Secret

**On macOS/Linux:**
```bash
openssl rand -base64 32
```

**On Windows (PowerShell):**
```powershell
[System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((1..32 | ForEach-Object { [char][int](Get-Random -Minimum 33 -Maximum 127) }) -join ''))
```

Add to `.env.local`:
```
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<your-generated-secret>
```

### 4. Start Development Server

```bash
npm run dev
```

Visit http://localhost:3000

---

## External Service Configuration

### Azure Cosmos DB Setup

1. Go to [Azure Portal](https://portal.azure.com)
2. Create a new **Azure Cosmos DB** resource
3. Select **NoSQL** API
4. Create the database named `roadtrip-db`

#### Create Containers

In Data Explorer, create these containers with the listed partition keys:

| Container | Partition Key | Purpose |
|-----------|--------------|---------|
| `users` | `/email` | User profiles |
| `destinations` | `/addedBy` | Destination suggestions |
| `activities` | `/destinationId` | Activities per destination |
| `trips` | `/createdBy` | Trip management |
| `expenses` | `/tripId` | Trip expenses |
| `timeline` | `/tripId` | Timeline events |
| `files` | `/tripId` | File metadata |
| `budgets` | `/tripId` | Budget tracking |
| `itemPermissions` | `/itemId` | Permission management |
| `itemReferences` | `/userId` | User's item references |

#### Get Credentials

1. In Cosmos DB account, click **Keys**
2. Copy values to `.env.local`:
   ```
   AZURE_COSMOS_ENDPOINT=<URI>
   AZURE_COSMOS_KEY=<PRIMARY KEY>
   AZURE_COSMOS_DB_NAME=roadtrip-db
   ```

### Vercel Blob Storage Setup

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Storage** → **Create** → **Blob**
4. Name it `roadtrip-files`
5. Click on it → **Tokens** → **Create Token**
6. Add to `.env.local`:
   ```
   BLOB_READ_WRITE_TOKEN=<your-token>
   ```

### GitHub OAuth Setup

1. Go to [GitHub Settings](https://github.com/settings/developers) → **OAuth Apps** → **New OAuth App**
2. Fill in:
   - **Application name**: Family Road Trip 2028
   - **Homepage URL**: http://localhost:3000
   - **Authorization callback URL**: http://localhost:3000/api/auth/callback/github
3. Copy credentials to `.env.local`:
   ```
   GITHUB_ID=<Client ID>
   GITHUB_SECRET=<Client Secret>
   ```

### Resend Email Notifications (Optional)

To enable email notifications:

1. Sign up at [Resend.com](https://resend.com)
2. Get your API key
3. Add to `.env.local`:
   ```
   RESEND_API_KEY=<your-api-key>
   SENDER_EMAIL=<your-verified-email>
   ```

---

## Development Workflow

### Available Scripts

```bash
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Build for production
npm start            # Start production server
npm run lint         # Run ESLint
npm run type-check   # Check TypeScript types
```

### Project Structure

```
src/
├── api/              # Business logic and DB operations
│   ├── destinations.ts
│   ├── activities.ts
│   ├── trips.ts
│   └── [other API modules]
├── components/       # Reusable React components
├── lib/              # Utilities and integrations
│   ├── auth-helpers.ts
│   ├── email.ts
│   ├── notifications.ts
│   └── cosmosdb.ts
├── pages/            # Next.js pages and API routes
│   ├── api/          # API endpoints
│   └── [page routes]
└── types/            # TypeScript types and Zod schemas
    └── schema.ts
```

### Adding a New Feature

**1. Define the data model** in `src/types/schema.ts`:
```typescript
export const MyFeatureSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  createdBy: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type MyFeature = z.infer<typeof MyFeatureSchema>;
```

**2. Create API layer** in `src/api/my-feature.ts`:
```typescript
import { containers } from "@/lib/cosmosdb";
import { MyFeature } from "@/types/schema";

export async function createMyFeature(data: MyFeature): Promise<MyFeature> {
  await containers.myfeature.items.create(data);
  return data;
}
```

**3. Create API routes** in `src/pages/api/my-feature/`:
```typescript
// index.ts - List and create
// [id].ts - Single item operations
```

**4. Create UI page** in `src/pages/my-feature.tsx`:
```typescript
export default function MyFeaturePage() {
  // Implementation
}
```

**5. Add navigation** in `src/pages/index.tsx`

### Permission System

The app uses a trip-centric permission model:

- **Creator** (trip.createdBy): Full control
- **Traveler** (trip.people[]): Can create/edit items, vote
- **Viewer** (trip.viewers[]): Read-only, cannot vote or manage files

**Always check permissions in API endpoints:**
```typescript
const trip = await tripsApi.getTrip(tripId);
if (!canViewTrip(trip, userEmail)) {
  return res.status(403).json({ error: "Forbidden" });
}
```

See [docs/permissions/PERMISSIONS.md](./permissions/PERMISSIONS.md) for detailed information.

---

## Database Operations

### Using Cosmos DB Containers

```typescript
import { containers } from "@/lib/cosmosdb";

// Create
await containers.destinations.items.create(item);

// Read
const { resource } = await containers.destinations.item(id, id).read();

// Update
await containers.destinations.item(id, id).replace(updatedItem);

// Delete
await containers.destinations.item(id, id).delete();

// Query
const { resources } = await containers.destinations.items
  .query({
    query: "SELECT * FROM c WHERE c.status = @status",
    parameters: [{ name: "@status", value: "active" }],
  })
  .fetchAll();
```

### Partition Keys

Always include the partition key in queries for optimal performance:

```typescript
// Good: Uses partition key
const { resource } = await containers.destinations
  .item(id, addedBy)  // id, partition key
  .read();

// Also works but less efficient
const { resources } = await containers.destinations.items
  .query({
    query: "SELECT * FROM c WHERE c.id = @id",
    parameters: [{ name: "@id", value: id }],
  })
  .fetchAll();
```

---

## Authentication Patterns

### Verify User Session

```typescript
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

const session = await getServerSession(req, res, authOptions);
const userEmail = session?.user?.email || "";

if (!session) {
  return res.status(401).json({ error: "Unauthorized" });
}
```

### Client-Side Session Check

```typescript
import { useSession } from "next-auth/react";

export default function MyPage() {
  const { data: session, status } = useSession();

  if (status === "loading") return <div>Loading...</div>;
  if (status === "unauthenticated") return <div>Please sign in</div>;

  return <div>Welcome, {session?.user?.email}</div>;
}
```

---

## Email Notifications

The app uses Resend for email notifications. Triggered events:

- User added/removed from trip
- Destination/activity upvoted
- New destination/activity added to trip
- Status changes on items

See [EMAIL_NOTIFICATIONS.md](./EMAIL_NOTIFICATIONS.md) for configuration.

---

## Performance & Best Practices

### Database Queries
- Use partition keys in queries
- Create indexes for frequently-filtered fields
- Avoid N+1 queries with batch operations

### Frontend State
- Use React hooks for component state
- Fetch data in useEffect with dependency arrays
- Show loading states while fetching

### API Design
- Return consistent response formats
- Include proper error messages
- Use appropriate HTTP status codes (200, 201, 400, 401, 403, 404, 500)

### Type Safety
- Always export Zod schemas
- Use `z.infer<typeof Schema>` for TypeScript types
- Run `npm run type-check` before pushing

---

## Styling

Uses Tailwind CSS with custom configuration.

### Common Utilities
```tsx
// Buttons
<button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
  Click me
</button>

// Cards
<div className="bg-white p-6 rounded-lg shadow">
  Content
</div>

// Forms
<input className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500" />
```

---

## Troubleshooting

### Database Connection Error
```
Error: connect ENOTFOUND your-account.documents.azure.com
```
- Verify Cosmos DB connection string
- Check your IP isn't blocked by firewall
- Ensure database exists

### Port Already in Use
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:3000 | xargs kill -9
```

### TypeScript Errors
```bash
npm run type-check
```

### Authentication Not Working
- Clear browser cookies
- Verify GitHub OAuth credentials
- Check NEXTAUTH_SECRET is set

---

## Deployment

See [docs/DEPLOYMENT.md](./DEPLOYMENT.md) for production deployment instructions.

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [NextAuth.js Documentation](https://next-auth.js.org)
- [Azure Cosmos DB](https://learn.microsoft.com/en-us/azure/cosmos-db/)
- [Vercel Blob](https://vercel.com/docs/storage/vercel-blob)
- [Tailwind CSS](https://tailwindcss.com)
- [Zod Validation](https://zod.dev)
