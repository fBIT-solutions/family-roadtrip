# Development Guide

## Getting Started

### Setup Development Environment

1. **Install Node.js 18 or higher** from https://nodejs.org/

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Copy environment template:**
   ```bash
   cp .env.example .env.local
   ```

4. **Configure environment variables** (see `README.md` for detailed instructions)

5. **Start development server:**
   ```bash
   npm run dev
   ```

## Development Scripts

- `npm run dev` - Start development server (http://localhost:3000)
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Check TypeScript types

## Project Architecture

### Pages
- **`pages/`** - Next.js pages and API routes
  - `index.tsx` - Home dashboard with navigation
  - `destinations.tsx` - Destination voting page
  - `reservations.tsx` - Reservation management
  - `timeline.tsx` - Timeline and milestone tracking
  - `files.tsx` - File upload and management
  - `api/` - API routes for backend logic

### API Layer
- **`api/`** - Business logic and database operations
  - `destinations.ts` - Destination CRUD operations
  - `reservations.ts` - Reservation management
  - `timeline.ts` - Timeline event operations
  - `storage.ts` - File upload and storage

### Libraries
- **`lib/`** - Utility functions and integrations
  - `cosmosdb.ts` - Azure Cosmos DB client and container initialization

### Types
- **`types/`** - TypeScript types and Zod schemas
  - `schema.ts` - Data models with validation

## Adding a New Feature

### Example: Adding a "Budget Tracker" Feature

1. **Create Zod schema in `src/types/schema.ts`:**
   ```typescript
   export const BudgetSchema = z.object({
     id: z.string().uuid(),
     category: z.string(),
     amount: z.number(),
     currency: z.string().default("USD"),
     createdBy: z.string(),
     createdAt: z.date(),
     updatedAt: z.date(),
   });
   
   export type Budget = z.infer<typeof BudgetSchema>;
   ```

2. **Create API logic in `src/api/budget.ts`:**
   ```typescript
   import { containers } from "@/lib/cosmosdb";
   import { Budget, BudgetSchema } from "@/types/schema";
   
   export async function createBudget(data: Omit<Budget, "id" | "createdAt" | "updatedAt">): Promise<Budget> {
     // Implementation
   }
   ```

3. **Create API routes:**
   - `src/pages/api/budget/index.ts` - List and create
   - `src/pages/api/budget/[id].ts` - Single item operations

4. **Create page in `src/pages/budget.tsx`:**
   ```typescript
   export default function Budget() {
     // Implementation
   }
   ```

5. **Add navigation link in `src/pages/index.tsx`**

## Database Schema

### Azure Cosmos DB Collections

Each collection uses JSON documents with the following structure:

#### users
- **Partition Key:** `/email`
- **Purpose:** User accounts and profiles
- **TTL:** None (permanent)

#### destinations
- **Partition Key:** `/addedBy`
- **Purpose:** Suggested trip destinations
- **TTL:** None (permanent)
- **Indexes:** votes (for sorting)

#### trips
- **Partition Key:** `/createdBy`
- **Purpose:** Hotel, restaurant, activity, and transport reservations
- **TTL:** None (permanent)
- **Indexes:** startDate (for chronological sorting)

#### timeline
- **Partition Key:** `/createdBy`
- **Purpose:** Trip milestones, events, and preparation deadlines
- **TTL:** None (permanent)
- **Indexes:** date (for chronological sorting)

#### files
- **Partition Key:** `/uploadedBy`
- **Purpose:** File metadata for documents, photos, and tickets
- **TTL:** None (permanent)
- **Indexes:** category (for filtering by type)

## Authentication

Uses NextAuth.js with GitHub OAuth provider. Configuration is in `src/pages/api/auth/[...nextauth].ts`.

### Adding Additional OAuth Providers

1. Install provider package: `npm install next-auth/providers/<provider>`
2. Add to `authOptions.providers` array
3. Configure environment variables
4. Add callback logic if needed

## API Response Format

All endpoints return:

**Success:**
```json
{
  "id": "uuid",
  "field": "value",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

**Error:**
```json
{
  "error": "Error message"
}
```

## Error Handling

- **401 Unauthorized:** User not authenticated
- **404 Not Found:** Resource doesn't exist
- **405 Method Not Allowed:** Wrong HTTP method
- **500 Internal Server Error:** Server-side error

## Performance Considerations

- **File Uploads:** Limited to 50MB via Blob Storage
- **Database Queries:** Use indexes for frequently filtered fields
- **Frontend State:** Use React hooks for client-side state
- **Caching:** Cosmos DB provides automatic indexing

## Testing

Currently no automated tests configured. To add:

1. Install Jest: `npm install --save-dev jest @types/jest`
2. Create test files with `.test.ts` or `.test.tsx` extension
3. Run tests: `npm test`

Example:
```typescript
// src/api/__tests__/destinations.test.ts
import { createDestination } from '@/api/destinations';

describe('destinations', () => {
  it('creates a destination', async () => {
    const dest = await createDestination({
      name: 'Paris',
      location: 'France',
      addedBy: 'user@example.com'
    });
    expect(dest.name).toBe('Paris');
  });
});
```

## Styling

Uses Tailwind CSS with custom configuration in `tailwind.config.js`.

### Common Components

- **Buttons:** `px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700`
- **Forms:** Input fields with `.focus:ring-2 .focus:ring-blue-500`
- **Cards:** `.bg-white .p-6 .rounded-lg .shadow`

## Deployment Checklist

- [ ] All environment variables configured
- [ ] Database collections created in Cosmos DB
- [ ] GitHub OAuth app created
- [ ] TypeScript compiles without errors
- [ ] All API routes working
- [ ] Authentication tested
- [ ] File upload tested
- [ ] Vercel blob storage working
- [ ] UI looks good on mobile

## Troubleshooting

### Database Connection Issues
- Verify Cosmos DB connection string
- Check firewall settings allow your IP
- Ensure containers are created

### File Upload Failures
- Check Vercel blob token is valid
- Verify file size under 50MB
- Check browser console for error details

### Authentication Issues
- Verify GitHub OAuth credentials
- Check NEXTAUTH_SECRET is set
- Clear browser cookies and try again

### TypeScript Errors
- Run `npm run type-check`
- Check all imports are correct
- Ensure Zod schemas match data types

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [NextAuth.js Documentation](https://next-auth.js.org)
- [Azure Cosmos DB SDK](https://github.com/Azure/azure-sdk-for-js/tree/main/sdk/cosmosdb)
- [Vercel Blob Documentation](https://vercel.com/docs/storage/vercel-blob)
- [Tailwind CSS](https://tailwindcss.com)
