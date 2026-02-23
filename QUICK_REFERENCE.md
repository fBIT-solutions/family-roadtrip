# Quick Reference Guide

## Commands

### Development
```bash
npm run dev          # Start development server (http://localhost:3000)
npm run build        # Build for production
npm start            # Start production server
npm run lint         # Run ESLint
npm run type-check   # Check TypeScript
```

### Set Up
```bash
npm install          # Install dependencies
cp .env.example .env.local  # Create environment config
```

## Files Location

### Add a new page
Create file in `src/pages/`
Example: `src/pages/my-feature.tsx`

### Add API endpoint
Create files in `src/pages/api/`
Example: `src/pages/api/my-feature/index.ts`

### Add business logic
Create file in `src/api/`
Example: `src/api/my-feature.ts`

### Add database operations
All use `src/lib/cosmosdb.ts` for Cosmos DB connection

### Add styles
Use Tailwind CSS classes or edit `src/globals.css`

## Database

### Create new collection in Cosmos DB
1. Azure Portal → Cosmos DB account
2. Data Explorer → New Container
3. Set partition key (usually `/createdBy` or `/userId`)

### Add type for new data model
Edit `src/types/schema.ts`:
```typescript
export const MyModelSchema = z.object({
  id: z.string().uuid(),
  // ... other fields
});

export type MyModel = z.infer<typeof MyModelSchema>;
```

### Access database in API
```typescript
import { containers } from "@/lib/cosmosdb";

// Example: Create
const item = { id: uuidv4(), /* ... */ };
await containers.myCollection.items.create(item);

// Example: Query
const { resources } = await containers.myCollection.items
  .query("SELECT * FROM c WHERE c.id = @id", { parameters: [{ name: "@id", value: "123" }] })
  .fetchAll();
```

## Authentication

### Check if user is authenticated
```typescript
import { useSession } from "next-auth/react";

const { data: session } = useSession();
if (!session) { /* not authenticated */ }
```

### Protect API route
```typescript
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "Unauthorized" });
  // ... rest of handler
}
```

### Redirect unauthenticated users
```typescript
import { signIn } from "next-auth/react";

if (!session) {
  return (
    <button onClick={() => signIn()}>Sign In</button>
  );
}
```

## File Upload

### Upload file to Vercel Blob
```typescript
import * as storageApi from "@/api/storage";

const metadata = await storageApi.uploadFile(
  file,              // File object
  "picture",         // category: "document" | "ticket" | "picture" | "other"
  userId,            // Current user
  relatedId          // Optional: link to another record
);
```

### Get uploaded files
```typescript
import * as storageApi from "@/api/storage";

const files = await storageApi.getFilesByCategory("picture");
```

## Forms

### Basic form pattern
```typescript
import { useState } from "react";

export default function MyForm() {
  const [data, setData] = useState({
    field1: "",
    field2: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const response = await axios.post("/api/endpoint", data);
    setData({ field1: "", field2: "" });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={data.field1}
        onChange={(e) => setData({ ...data, field1: e.target.value })}
      />
      <button type="submit">Submit</button>
    </form>
  );
}
```

## API Calls

### GET request
```typescript
import axios from "axios";

const { data } = await axios.get("/api/endpoint");
```

### POST request
```typescript
const { data } = await axios.post("/api/endpoint", {
  field1: "value1",
  field2: "value2",
});
```

### PUT request
```typescript
const { data } = await axios.put("/api/endpoint/123", {
  field1: "updated value",
});
```

### DELETE request
```typescript
await axios.delete("/api/endpoint/123");
```

## Styling with Tailwind

### Common patterns
```html
<!-- Button -->
<button class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
  Click me
</button>

<!-- Card -->
<div class="bg-white p-6 rounded-lg shadow hover:shadow-lg">
  Content
</div>

<!-- Form input -->
<input class="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />

<!-- Grid -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  Items
</div>
```

## Environment Variable

### Add new variable
1. Edit `.env.example` (documentation)
2. Edit `.env.local` (your local copy)
3. Use in code: `process.env.VARIABLE_NAME`

### Example
```typescript
// In code
const endpoint = process.env.AZURE_COSMOS_ENDPOINT;
```

## Debugging

### TypeScript errors
```bash
npm run type-check
```

### Linting errors
```bash
npm run lint
```

### Database connection issues
- Check `.env.local` has correct credentials
- Verify Azure Cosmos DB account is running
- Check IP is not blocked by firewall

### Authentication issues
- Clear browser cookies
- Check GitHub OAuth credentials
- Verify redirect URL matches

### Check Next.js dev server logs
Watch the terminal where you ran `npm run dev`

## Useful Links

- [Next.js Docs](https://nextjs.org/docs)
- [NextAuth.js Docs](https://next-auth.js.org)
- [Tailwind CSS](https://tailwindcss.com)
- [TypeScript Docs](https://www.typescriptlang.org)
- [Azure Cosmos DB](https://learn.microsoft.com/en-us/azure/cosmos-db/)
- [Vercel Blob Docs](https://vercel.com/docs/storage/vercel-blob)

## Common Tasks

### Add a new feature
1. Create page in `src/pages/`
2. Create API logic in `src/api/`
3. Create API routes in `src/pages/api/`
4. Add schema to `src/types/schema.ts` if needed
5. Add navigation link in `src/pages/index.tsx`

### Add Cosmos DB collection
1. Azure Portal → Cosmos DB → Data Explorer → New Container
2. Update `.env.local` with container name
3. Import in `src/lib/cosmosdb.ts`
4. Create API functions

### Deploy to Vercel
1. Push code to GitHub
2. Import repository in Vercel
3. Add environment variables
4. Deploy with one click

### Invite family member
1. They create GitHub account
2. Share app URL
3. They click Sign In
4. They can start collaborating

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + K` | Open command palette (in VS Code) |
| `Ctrl/Cmd + Shift + F` | Find across files |
| `F2` | Rename symbol (in VS Code) |
| `Ctrl/Cmd + /` | Toggle comment |

## Error Messages

| Error | Solution |
|-------|----------|
| `ENOTFOUND your-account.documents.azure.com` | Check Cosmos DB connection string |
| `GitHubError: OAuth Callback` | Verify GitHub OAuth credentials |
| `Invalid Vercel Blob Token` | Generate new token from Vercel |
| `EADDRINUSE :::3000` | Kill process on port 3000 |

---

For more detailed information, see the full documentation files:
- [README.md](./README.md) - Project overview
- [SETUP.md](./SETUP.md) - Detailed setup
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Development guide
- [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) - What was created
