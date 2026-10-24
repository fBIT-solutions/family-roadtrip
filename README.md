# 🚗 Family Road Trip 2028

A collaborative web application for planning and managing family road trips. Plan destinations, track expenses, manage reservations, and coordinate with family members in real-time.

**Live Demo:** [Family Roadtrip](https://holiday-tracker.fbit.dev)

## Status

PRODUCTION
[![Build Verification](https://github.com/fBIT-solutions/family-roadtrip/actions/workflows/build.yml/badge.svg)](https://github.com/fBIT-solutions/family-roadtrip/actions/workflows/build.yml)
[![CodeQL](https://github.com/fBIT-solutions/family-roadtrip/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/fBIT-solutions/family-roadtrip/actions/workflows/github-code-scanning/codeql)
[![ESLint](https://github.com/fBIT-solutions/family-roadtrip/actions/workflows/lint.yml/badge.svg)](https://github.com/fBIT-solutions/family-roadtrip/actions/workflows/lint.yml)
[![Unit Tests](https://github.com/fBIT-solutions/family-roadtrip/actions/workflows/tests.yml/badge.svg)](https://github.com/fBIT-solutions/family-roadtrip/actions/workflows/tests.yml)
[![TypeScript Type Check](https://github.com/fBIT-solutions/family-roadtrip/actions/workflows/type-check.yml/badge.svg)](https://github.com/fBIT-solutions/family-roadtrip/actions/workflows/type-check.yml)

PREVIEW
[![Build Verification](https://github.com/fBIT-solutions/family-roadtrip/actions/workflows/build.yml/badge.svg?branch=preview)](https://github.com/fBIT-solutions/family-roadtrip/actions/workflows/build.yml)
[![CodeQL](https://github.com/fBIT-solutions/family-roadtrip/actions/workflows/github-code-scanning/codeql/badge.svg?branch=preview)](https://github.com/fBIT-solutions/family-roadtrip/actions/workflows/github-code-scanning/codeql)
[![ESLint](https://github.com/fBIT-solutions/family-roadtrip/actions/workflows/lint.yml/badge.svg?branch=preview)](https://github.com/fBIT-solutions/family-roadtrip/actions/workflows/lint.yml)
[![Unit Tests](https://github.com/fBIT-solutions/family-roadtrip/actions/workflows/tests.yml/badge.svg?branch=preview)](https://github.com/fBIT-solutions/family-roadtrip/actions/workflows/tests.yml)
[![TypeScript Type Check](https://github.com/fBIT-solutions/family-roadtrip/actions/workflows/type-check.yml/badge.svg?branch=preview)](https://github.com/fBIT-solutions/family-roadtrip/actions/workflows/type-check.yml)


## 🌟 Features

### Core Features
- **🌍 Destination Planning** - Suggest destinations and vote collaboratively
- **🏨 Activity Management** - Plan activities for each destination
- **💰 Budget & Expenses** - Track trip costs and manage budgets
- **📅 Timeline & Milestones** - Track preparation deadlines and milestones
- **📁 File Management** - Upload and organize trip documents and photos
- **👥 Collaboration** - Invite family members and manage permissions
- **✉️ Notifications** - Get email updates on trip activities
- **🤖 AI Recommendations** - Get personalized destination and activity suggestions

See [docs/FEATURES.md](docs/FEATURES.md) for complete feature list.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- GitHub account (for authentication)
- Azure account (for database)
- Vercel account (for file storage)

### Installation

```bash
# Clone repository
git clone https://github.com/jo-anb/family-roadtrip-2028.git
cd family-roadtrip-2028

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local

# Fill in environment variables (see docs/DEVELOPMENT.md)
# Start development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | Setup, development guide, architecture patterns |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Project structure, data models, system design |
| [docs/FEATURES.md](docs/FEATURES.md) | Complete feature list and roadmap |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Production deployment to Vercel/Azure/AWS |
| [docs/EMAIL_NOTIFICATIONS.md](docs/EMAIL_NOTIFICATIONS.md) | Email notification system configuration |
| [docs/QUICK_REFERENCE.md](docs/QUICK_REFERENCE.md) | Quick commands and common patterns |
| [docs/permissions/PERMISSIONS.md](docs/permissions/PERMISSIONS.md) | Permission system documentation |

## 🛠 Tech Stack

### Frontend
- **Next.js 15** - React framework with server-side rendering
- **React 19** - UI component library
- **TypeScript 5** - Type safety
- **Tailwind CSS** - Utility-first styling
- **NextAuth.js** - Authentication

### Backend & Services
- **Next.js API Routes** - Serverless backend
- **Azure Cosmos DB** - NoSQL database
- **Vercel Blob** - File storage
- **Resend** - Email notifications
- **OpenAI/Claude** - AI recommendations

### Development
- **Zod** - Schema validation
- **Axios** - HTTP client
- **ESLint** - Code linting

## 🎮 Available Scripts

```bash
npm run dev          # Start development server (localhost:3000)
npm run build        # Build for production
npm start            # Start production server
npm run lint         # Run ESLint
npm run type-check   # Type-check entire project
```

## 📋 Project Structure

```
src/
├── pages/              # Next.js pages and API routes
├── api/                # Business logic and database operations
├── components/         # Reusable React components
├── lib/                # Utilities (auth, email, database)
├── types/              # TypeScript types and Zod schemas
└── globals.css         # Global styles

docs/                   # Documentation
├── DEVELOPMENT.md      # Development guide
├── ARCHITECTURE.md     # System architecture
├── DEPLOYMENT.md       # Deployment instructions
└── ...
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed architecture.

## 🔐 Authentication

Uses **GitHub OAuth 2.0** via NextAuth.js:

1. Click "Sign In"
2. Authorize with GitHub account
3. Securely logged in

User data is isolated by email and never shared.

## 🗄 Database

Uses **Azure Cosmos DB** NoSQL with 9 collections:

- `trips` - Trip management
- `destinations` - Suggested destinations
- `activities` - Activities per destination
- `expenses` - Trip expenses
- `budgets` - Budget tracking
- `files` - File metadata
- `timeline` - Timeline events
- `itemPermissions` - Permission management
- `itemReferences` - User item references

See [docs/ARCHITECTURE.md#database-schema](docs/ARCHITECTURE.md#database-schema) for schema details.

## 👥 User Roles & Permissions

### Trip Roles

| Role | Permissions |
|------|-------------|
| **Creator** | Full control over trip and all items |
| **Traveler** | Create/edit items, vote, manage budgets |
| **Viewer** | Read-only access, cannot vote or edit |

See [docs/permissions/PERMISSIONS.md](docs/permissions/PERMISSIONS.md) for detailed permission matrix.

## 📧 Email Notifications

Automated emails sent for:
- User added/removed from trip
- Destination/activity created
- Items voted on
- Status changes

Configure in `.env.local` with Resend API key.

See [docs/EMAIL_NOTIFICATIONS.md](docs/EMAIL_NOTIFICATIONS.md) for setup.

## 🚀 Deployment

### Vercel (Recommended)
```bash
vercel --env-file .env.local
```

### Azure App Service
```bash
az webapp create --resource-group ... --plan ...
```

### AWS Amplify
Use AWS Console → Amplify → Import GitHub repo

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed instructions.

## 🧪 Development Workflow

### Adding a New Feature

1. **Define schema** in `src/types/schema.ts`
2. **Create API layer** in `src/api/`
3. **Create API routes** in `src/pages/api/`
4. **Create UI page** in `src/pages/`
5. **Add navigation** in `src/pages/index.tsx`
6. **Test** with `npm run dev`

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for detailed guide.

### Code Quality

```bash
npm run type-check    # TypeScript type checking
npm run lint          # ESLint linting
npm run build         # Production build
```

## 🤝 Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📝 Environment Variables

Required environment variables (see `.env.example`):

```
NEXTAUTH_URL                    # App URL
NEXTAUTH_SECRET                 # NextAuth secret
AZURE_COSMOS_ENDPOINT           # Cosmos DB endpoint
AZURE_COSMOS_KEY                # Cosmos DB key
AZURE_COSMOS_DB_NAME            # Database name
BLOB_READ_WRITE_TOKEN           # Vercel Blob token
GITHUB_ID                       # GitHub OAuth ID
GITHUB_SECRET                   # GitHub OAuth secret
RESEND_API_KEY                  # Resend API key
SENDER_EMAIL                    # Email sender address
```

## 🐛 Troubleshooting

### Common Issues

**Database connection failed**
- Verify Cosmos DB credentials in `.env.local`
- Check your IP isn't blocked by firewall
- Ensure all collections exist

**Authentication not working**
- Verify GitHub OAuth credentials
- Check `NEXTAUTH_URL` matches your app URL
- Clear browser cookies and try again

**Port 3000 already in use**
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9  # macOS/Linux
netstat -ano | findstr :3000   # Windows
```

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for more troubleshooting.

## 📞 Support

- 📖 **Documentation**: [docs/](docs/)
- 🐛 **Issues**: [GitHub Issues](https://github.com/jo-anb/family-roadtrip-2028/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/jo-anb/family-roadtrip-2028/discussions)

## 📊 Project Status

- ✅ Core MVP complete
- ✅ Collaboration features implemented
- ✅ Email notifications working
- ✅ AI recommendations active
- 🚧 Mobile app (planned)
- 🚧 Real-time sync (planned)

See [docs/FEATURES.md](docs/FEATURES.md) for roadmap.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

## 🎉 Acknowledgments

Built with:
- [Next.js](https://nextjs.org/) - React framework
- [NextAuth.js](https://next-auth.js.org/) - Authentication
- [Azure Cosmos DB](https://azure.microsoft.com/services/cosmos-db/) - Database
- [Vercel](https://vercel.com/) - Hosting & storage
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Resend](https://resend.com/) - Email service

---

**Happy Planning! 🗺️✈️**

*Made with ❤️ for family adventures*
