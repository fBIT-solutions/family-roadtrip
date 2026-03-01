# Quick Reference Guide

Quick commands and common patterns for development.

## Commands

### Development
```bash
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Build for production
npm start            # Start production server
npm run lint         # Run ESLint
npm run type-check   # Check TypeScript
```

### Setup
```bash
npm install                    # Install dependencies
cp .env.example .env.local    # Create environment config
```

## File Organization

### Add a new page
```
src/pages/my-feature.tsx
```

### Add API endpoint
```
src/pages/api/my-feature/index.ts      # List & create
src/pages/api/my-feature/[id].ts       # Get/update/delete
```

### Add business logic
```
src/api/my-feature.ts
```

### Add data model
```
src/types/schema.ts
```

## Database

### Query Cosmos DB
```typescript
import { containers } from "@/lib/cosmosdb";

// Create
await containers.myCollection.items.create(item);

// Read
const { resource } = await containers.myCollection.item(id, partitionKey).read();

// Update
await containers.myCollection.item(id, partitionKey).replace(updatedItem);

// Delete
await containers.myCollection.item(id, partitionKey).delete();

// Query
const { resources } = await containers.myCollection.items
  .query("SELECT * FROM c WHERE c.status = @status")
  .fetchAll();
```

## Authentication

### Check user session (Server)
```typescript
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

const session = await getServerSession(req, res, authOptions);
if (!session) return res.status(401).json({ error: "Unauthorized" });
const userEmail = session.user?.email || "";
```

### Check user session (Client)
```typescript
import { useSession } from "next-auth/react";

const { data: session, status } = useSession();
if (status === "unauthenticated") {
  return <button onClick={() => signIn()}>Sign In</button>;
}
```

## Forms

### Standard form pattern
```typescript
const [formData, setFormData] = useState({ field: "" });

const handleSubmit = async (e) => {
  e.preventDefault();
  const { data } = await axios.post("/api/endpoint", formData);
  setFormData({ field: "" });
};

return (
  <form onSubmit={handleSubmit}>
    <input
      value={formData.field}
      onChange={(e) => setFormData({ ...formData, field: e.target.value })}
    />
    <button type="submit">Submit</button>
  </form>
);
```

## API Patterns

### Error handling
```typescript
// 401 - Not authenticated
// 403 - Not authorized
// 404 - Not found
// 405 - Wrong method
// 500 - Server error
```

### Response format
```typescript
// Success
res.status(200).json(data);
res.status(201).json(newItem);

// Error
res.status(400).json({ error: "Bad request" });
res.status(401).json({ error: "Unauthorized" });
```

## Tailwind Utilities

### Buttons
```tsx
<button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
  Click me
</button>
```

### Cards
```tsx
<div className="bg-white p-6 rounded-lg shadow hover:shadow-lg">
  Content
</div>
```

### Forms
```tsx
<input className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500" />
<textarea className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500" />
```

### Grid
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  Items
</div>
```

## Environment Variables

### Add new variable
1. Edit `.env.example` (documentation)
2. Edit `.env.local` (your local copy)
3. Use in code: `process.env.VARIABLE_NAME`

## Debugging

### Type errors
```bash
npm run type-check
```

### Linting errors
```bash
npm run lint
```

### Check dev server logs
Watch terminal where `npm run dev` is running

### Browser Console
Open DevTools (F12) → Console tab

## Common Issues

| Error | Solution |
|-------|----------|
| `ENOTFOUND cosmosdb` | Check Cosmos DB connection string |
| `GitHubError: OAuth` | Verify GitHub OAuth credentials |
| `Port 3000 in use` | Kill process: `lsof -ti:3000 \| xargs kill -9` |
| `TypeScript errors` | Run `npm run type-check` |

## Useful Links

- [Next.js Docs](https://nextjs.org/docs)
- [NextAuth.js Docs](https://next-auth.js.org)
- [TypeScript Docs](https://www.typescriptlang.org)
- [Tailwind CSS](https://tailwindcss.com)
- [Zod Docs](https://zod.dev)
- [Azure Cosmos DB](https://learn.microsoft.com/en-us/azure/cosmos-db/)
- [Vercel Blob](https://vercel.com/docs/storage/vercel-blob)

See [DEVELOPMENT.md](./DEVELOPMENT.md) for comprehensive development guide.
