# Project File Structure

## Complete Directory Tree

```
family-roadtrip-2028/
│
├── 📁 src/
│   ├── 📁 pages/                          # Next.js pages and API routes
│   │   ├── 📁 api/
│   │   │   ├── 📁 auth/
│   │   │   │   └── [...nextauth].ts      # NextAuth configuration
│   │   │   ├── 📁 destinations/
│   │   │   │   ├── index.ts              # List/create destinations
│   │   │   │   └── [id].ts               # Get/update/delete/vote
│   │   │   ├── 📁 reservations/
│   │   │   │   ├── index.ts              # List/create reservations
│   │   │   │   └── [id].ts               # Get/update/delete
│   │   │   ├── 📁 timeline/
│   │   │   │   ├── index.ts              # List/create events
│   │   │   │   └── [id].ts               # Get/update/delete
│   │   │   └── 📁 files/
│   │   │       ├── index.ts              # List/upload files
│   │   │       └── [id].ts               # Delete files
│   │   │
│   │   ├── index.tsx                     # 🏠 Home dashboard
│   │   ├── destinations.tsx              # 🌍 Destinations page
│   │   ├── reservations.tsx              # 🏨 Reservations page
│   │   ├── timeline.tsx                  # 📅 Timeline page
│   │   ├── files.tsx                     # 📁 Files page
│   │   ├── login.tsx                     # 🔐 Login page
│   │   ├── auth-error.tsx                # ⚠️ Auth error page
│   │   └── _app.tsx                      # App wrapper with providers
│   │
│   ├── 📁 api/                           # Business logic
│   │   ├── destinations.ts               # Destination operations
│   │   ├── reservations.ts               # Reservation operations
│   │   ├── timeline.ts                   # Timeline operations
│   │   └── storage.ts                    # File operations
│   │
│   ├── 📁 lib/                           # Utilities & integrations
│   │   └── cosmosdb.ts                   # Cosmos DB client
│   │
│   ├── 📁 types/                         # TypeScript types
│   │   └── schema.ts                     # Zod schemas & types
│   │
│   └── globals.css                       # Global styles
│
├── 📁 public/                            # Static files (if added)
│
├── 📄 Configuration Files
│   ├── package.json                      # Dependencies & scripts
│   ├── tsconfig.json                     # TypeScript config
│   ├── next.config.js                    # Next.js config
│   ├── tailwind.config.js                # Tailwind CSS config
│   ├── postcss.config.js                 # PostCSS config
│   └── .eslintrc.json                    # ESLint config (if added)
│
├── 📄 Environment & Git
│   ├── .env.example                      # Environment variables template
│   ├── .env.local                        # Your local config (git ignored)
│   └── .gitignore                        # Git ignore rules
│
├── 📄 Documentation
│   ├── README.md                         # Project overview
│   ├── SETUP.md                          # Setup instructions
│   ├── DEVELOPMENT.md                    # Development guide
│   ├── PROJECT_SUMMARY.md                # What was created
│   └── QUICK_REFERENCE.md                # Quick reference
│
└── 📄 Project Files
    ├── package-lock.json                 # Locked dependencies
    └── node_modules/                     # Installed packages (git ignored)
```

## File Purpose Overview

### Pages (User Interfaces)
| File | Purpose | Features |
|------|---------|----------|
| `index.tsx` | Dashboard | Navigation, user status, feature cards |
| `destinations.tsx` | Destinations | Suggest, vote, view destinations |
| `reservations.tsx` | Bookings | Create, manage reservations |
| `timeline.tsx` | Timeline | Create events, track milestones |
| `files.tsx` | File storage | Upload, organize, delete files |
| `login.tsx` | Authentication | GitHub OAuth login |
| `_app.tsx` | App wrapper | NextAuth provider, global config |

### API Routes (Backend Endpoints)
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/auth/[...nextauth]` | - | Authentication handler |
| `/api/destinations` | GET/POST | List & create |
| `/api/destinations/[id]` | GET/PUT/DELETE/POST | Single item ops & voting |
| `/api/reservations` | GET/POST | List & create |
| `/api/reservations/[id]` | GET/PUT/DELETE | Single item operations |
| `/api/timeline` | GET/POST | List & create |
| `/api/timeline/[id]` | GET/PUT/DELETE | Single item operations |
| `/api/files` | GET/POST | List & upload |
| `/api/files/[id]` | DELETE | Delete file |

### Business Logic (Core Functions)
| File | Contains |
|------|----------|
| `destinations.ts` | CRUD, voting logic |
| `reservations.ts` | CRUD operations |
| `timeline.ts` | CRUD operations |
| `storage.ts` | Upload, delete, list |

### Libraries & Types
| File | Purpose |
|------|---------|
| `cosmosdb.ts` | Database client initialization |
| `schema.ts` | Data validation & types |

### Configuration
| File | Purpose |
|------|---------|
| `package.json` | NPM dependencies & build scripts |
| `tsconfig.json` | TypeScript compiler options |
| `next.config.js` | Next.js settings |
| `tailwind.config.js` | Tailwind CSS customization |
| `postcss.config.js` | PostCSS plugin config |

## Data Flow Diagram

```
User Browser
    ↓
Next.js Pages (src/pages/)
    ↓
React Components + Forms
    ↓
API Routes (src/pages/api/)
    ↓
Business Logic (src/api/)
    ├─→ Cosmos DB (Queries, CRUD)
    └─→ Vercel Blob (File upload/download)
```

## Authentication Flow

```
1. User clicks "Sign In"
2. → /pages/login.tsx
3. → /api/auth/[...nextauth].ts
4. → GitHub OAuth
5. → NextAuth Session
6. → /pages/index.tsx (authenticated)
```

## File Upload Flow

```
1. User selects file in /files.tsx
2. → Converts to base64
3. → POST /api/files/index.ts
4. → /api/storage.ts uploadFile()
5. → Vercel Blob (stores file)
6. → Cosmos DB files collection (stores metadata)
7. → Response with file metadata
```

## Database Schema Visualization

```
Cosmos DB (roadtrip-db)
├── users (partition: /email)
│   ├── id
│   ├── email
│   ├── name
│   ├── role
│   └── timestamps
│
├── destinations (partition: /addedBy)
│   ├── id
│   ├── name
│   ├── location
│   ├── addedBy
│   ├── votes
│   └── votedBy[]
│
├── trips (partition: /createdBy)
│   ├── id
│   ├── title
│   ├── type (hotel|restaurant|activity|transport|other)
│   ├── startDate
│   ├── endDate
│   ├── cost
│   └── confirmationNumber
│
├── timeline (partition: /createdBy)
│   ├── id
│   ├── title
│   ├── date
│   ├── type (milestone|event|deadline)
│   ├── category
│   └── completed
│
└── files (partition: /uploadedBy)
    ├── id
    ├── filename
    ├── blobUrl
    ├── fileType
    ├── fileSize
    ├── category (picture|document|ticket|other)
    └── uploadedBy
```

## Type System Flow

```
Zod Schemas (schema.ts)
    ↓
TypeScript Types
    ↓
API Functions (api/*.ts)
    ↓
API Routes (pages/api/*.ts)
    ↓
Frontend Pages (pages/*.tsx)
    ↓
React Components
    ↓
Type-safe props & state
```

## Key Files for Different Tasks

### Want to add a new feature?
- Edit `src/types/schema.ts` (add data model)
- Create `src/api/myfeature.ts` (add logic)
- Create `/pages/api/myfeature/` routes (add endpoints)
- Create `src/pages/myfeature.tsx` (add UI)

### Want to modify authentication?
- Edit `src/pages/api/auth/[...nextauth].ts`
- Add providers, callbacks, or options

### Want to style components?
- Use Tailwind classes in JSX
- Or edit `src/globals.css` for global styles
- Or create component-specific `.css` files

### Want to connect to database?
- Use `import { containers } from "@/lib/cosmosdb"`
- Call `containers.yourContainer.items.create/read/query/replace/delete`

### Want to upload files?
- Call `uploadFile()` from `src/api/storage.ts`
- Files go to Vercel Blob
- Metadata goes to Cosmos DB

### Want to add API endpoint?
- Create files in `src/pages/api/`
- Next.js automatically creates routes
- Use `getServerSession` to check auth
- Follow the pattern in existing routes

## Import Paths

The `tsconfig.json` provides these path aliases:

```typescript
"@/*" → "src/*"
"@/components/*" → "src/components/*"
"@/pages/*" → "src/pages/*"
"@/utils/*" → "src/utils/*"
"@/api/*" → "src/api/*"
"@/lib/*" → "src/lib/*"
"@/types/*" → "src/types/*"
```

## Environment Variables Organization

```
.env.local
├── NextAuth
│   ├── NEXTAUTH_URL
│   └── NEXTAUTH_SECRET
├── Azure Cosmos DB
│   ├── AZURE_COSMOS_ENDPOINT
│   ├── AZURE_COSMOS_KEY
│   ├── AZURE_COSMOS_DB_NAME
│   └── AZURE_COSMOS_CONTAINERS_*
├── Vercel Blob
│   └── BLOB_READ_WRITE_TOKEN
└── GitHub OAuth
    ├── GITHUB_ID
    └── GITHUB_SECRET
```

## Hot Reload & Development

```
Code Change
    ↓
Detected by Next.js
    ↓
TypeScript Compilation
    ↓
Hot Module Replacement (HMR)
    ↓
Browser Auto-Refresh
```

In development (`npm run dev`):
- Pages auto-reload on changes
- API routes auto-reload on changes
- Styles update without refresh (HMR)
- Type errors shown in terminal

## Build Output

```
npm run build
    ↓
Creates: .next/
    ├── standalone/    # Standalone server
    ├── static/        # Static files
    └── ... (optimized output)
```

Production URL: Will be provided by hosting platform (Vercel, Azure, etc.)

---

For detailed information about specific files, see the relevant documentation:
- [README.md](./README.md) - Project overview
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Development patterns
- [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - Common tasks
