# 🚗 Family Road Trip 2028

A comprehensive web application for planning and managing a family road trip. Users can collaborate on destination suggestions, manage reservations, track timelines, and store important documents and photos.

## Features

### 🌍 Destinations
- Suggest destination ideas for the trip
- Vote on destinations you'd like to visit most
- View all proposed locations with descriptions and voting status
- Automatic ranking by popularity (vote count)

### 🏨 Reservations & Bookings
- Store hotel reservations
- Track restaurant bookings
- Plan activities and attractions
- Record transportation bookings
- Include confirmation numbers, costs, and dates
- Add detailed notes for each reservation

### 📅 Timeline & Milestones
- Create a visual timeline of trip preparation
- Add milestones, events, and deadlines
- Track completion status of planning items
- View events in chronological order
- Categorize events (preparation, during trip, etc.)

### 📁 File Management
- Upload and store trip documents (passports, insurance, etc.)
- Share trip photos and memories
- Store digital tickets and confirmations
- Organize files by category (pictures, documents, tickets)
- Files stored securely in Vercel Blob Storage

### 👥 Authentication
- Secure login with NextAuth.js
- GitHub OAuth integration
- User-specific data and access control
- Session management

## Tech Stack

### Frontend
- **Next.js 14** - React framework
- **React 18** - UI Library
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Axios** - HTTP Client

### Backend
- **Next.js API Routes** - Backend server
- **NextAuth.js** - Authentication
- **Azure Cosmos DB** - NoSQL database
- **Vercel Blob** - File storage
- **Zod** - Schema validation

## Quick Start

### Prerequisites
- Node.js 18+ and npm/yarn
- Azure subscription for Cosmos DB
- Vercel account for Blob Storage
- GitHub OAuth App

### Setup
```bash
npm install
cp .env.example .env.local
# Fill in your environment variables
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Environment Configuration

See `.env.example` for all required environment variables:
- NextAuth configuration
- Azure Cosmos DB credentials
- Vercel Blob token
- GitHub OAuth credentials

## Documentation

- [README.md](./README.md) - Project overview and setup
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Development guide and architecture

## Deployment

Deploy to Vercel:
```bash
vercel --env-file .env.local
```

## Future Enhancements

- [ ] User roles and permissions
- [ ] Real-time collaboration
- [ ] Map integration
- [ ] Budget tracking
- [ ] Mobile app
- [ ] Email notifications

## License

MIT

---

**Happy Road Tripping! 🚗🗺️** 🎉
