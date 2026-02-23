# Setup Guide - Family Road Trip 2028

This guide will walk you through setting up the Family Road Trip 2028 application from scratch.

## Prerequisites

Before you start, make sure you have:

1. **Node.js 18 or higher** - Download from [nodejs.org](https://nodejs.org/)
2. **Git** - For version control
3. **An Azure Account** - For Cosmos DB (sign up at [azure.microsoft.com](https://azure.microsoft.com))
4. **A Vercel Account** - For Blob Storage (sign up at [vercel.com](https://vercel.com))
5. **A GitHub Account** - For OAuth authentication

## Step 1: Install Node.js

Download and install Node.js from [nodejs.org](https://nodejs.org/). Verify installation:

```bash
node --version  # Should be v18.0.0 or higher
npm --version   # Should be 9.0.0 or higher
```

## Step 2: Clone the Repository

```bash
git clone https://github.com/jo-anb/family-roadtrip-2028.git
cd family-roadtrip-2028
```

## Step 3: Install Dependencies

```bash
npm install
```

This will install all required packages including Next.js, React, TypeScript, and more.

## Step 4: Set Up Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

Now edit `.env.local` with your actual credentials.

### 4.1 NextAuth Configuration

Generate a secret key:

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
NEXTAUTH_SECRET=<paste-your-generated-secret-here>
```

### 4.2 Azure Cosmos DB Setup

1. Go to [Azure Portal](https://portal.azure.com)
2. Click **Create a resource** → search for **Azure Cosmos DB**
3. Select **Azure Cosmos DB** → **Create**
4. Choose **NoSQL** as the API
5. Fill in the required fields:
   - **Subscription**: Select your subscription
   - **Resource Group**: Create a new one (e.g., `roadtrip-rg`)
   - **Account Name**: Choose a unique name (e.g., `familyroadtrip2028`)
   - **Region**: Select closest to you
   - **Capacity mode**: Select **Provisioned throughput**
6. Click **Review + create** → **Create**

#### Creating the Database

Once the Cosmos DB account is created:

1. Go to your Cosmos DB account in Azure Portal
2. Click **Data Explorer**
3. Click **New Container**
4. Fill in:
   - **Database ID**: `roadtrip-db`
   - **Container ID**: `users`
   - **Partition key**: `/email`
5. Click **OK**

#### Creating Collections/Containers

Create these additional containers in the same database:

| Container | Partition Key | Purpose |
|-----------|--------------|---------|
| `destinations` | `/addedBy` | Destination suggestions |
| `trips` | `/createdBy` | Reservations and bookings |
| `timeline` | `/createdBy` | Timeline events |
| `files` | `/uploadedBy` | File metadata |

#### Getting Credentials

1. Click **Keys** in the left sidebar
2. Copy your credentials to `.env.local`:
   ```
   AZURE_COSMOS_ENDPOINT=<Copy "URI">
   AZURE_COSMOS_KEY=<Copy "PRIMARY KEY">
   AZURE_COSMOS_DB_NAME=roadtrip-db
   ```

### 4.3 Vercel Blob Storage Setup

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select or create a project
3. Go to **Settings** → **Storage**
4. Click **Connect Database** → **Create New** → **Blob**
5. Name it `road-trip-files`
6. Once created, click on it → **Tokens**
7. Click **Create Token**
8. Copy the token and add to `.env.local`:
   ```
   BLOB_READ_WRITE_TOKEN=<your-token>
   ```

### 4.4 GitHub OAuth Setup

1. Go to [GitHub Settings](https://github.com/settings/developers) → **OAuth Apps** → **New OAuth App**
2. Fill in:
   - **Application name**: Family Road Trip 2028
   - **Homepage URL**: http://localhost:3000
   - **Authorization callback URL**: http://localhost:3000/api/auth/callback/github
3. Click **Register Application**
4. Copy your credentials to `.env.local`:
   ```
   GITHUB_ID=<Copy "Client ID">
   GITHUB_SECRET=<Copy "Client secrets">
   ```

## Step 5: Verify Environment Configuration

Check that your `.env.local` has all these variables:

```
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<your-secret>

AZURE_COSMOS_ENDPOINT=https://your-account.documents.azure.com:443/
AZURE_COSMOS_KEY=<your-key>
AZURE_COSMOS_DB_NAME=roadtrip-db
AZURE_COSMOS_CONTAINERS_USERS=users
AZURE_COSMOS_CONTAINERS_DESTINATIONS=destinations
AZURE_COSMOS_CONTAINERS_TRIPS=trips
AZURE_COSMOS_CONTAINERS_TIMELINE=timeline
AZURE_COSMOS_CONTAINERS_FILES=files

BLOB_READ_WRITE_TOKEN=<your-token>

GITHUB_ID=<your-id>
GITHUB_SECRET=<your-secret>
```

## Step 6: Run Development Server

```bash
npm run dev
```

The application will start at [http://localhost:3000](http://localhost:3000)

Open this URL in your browser. You should see the Family Road Trip 2028 home page with a "Sign In" button.

## Step 7: Test Authentication

1. Click **Sign In to Get Started**
2. Click **Sign in with GitHub**
3. Authorize the application
4. You should be redirected back to the home page logged in

## Step 8: Test Features

### 🌍 Test Destinations
1. Go to **Destinations** section
2. Add a destination (e.g., "Paris, France")
3. Upvote it with the 👍 button

### 🏨 Test Reservations
1. Go to **Reservations** section
2. Add a hotel reservation
3. Fill in the details and save

### 📅 Test Timeline
1. Go to **Timeline** section
2. Add an event (e.g., "Book flights")
3. Mark it as complete

### 📁 Test Files
1. Go to **Files** section
2. Select "Picture" category
3. Upload a test image
4. View and delete it

## Troubleshooting

### Database Connection Error
```
Error: connect ENOTFOUND your-account.documents.azure.com
```

**Solution:**
- Verify Cosmos DB connection string in `.env.local`
- Make sure your IP is not blocked by Cosmos DB firewall
- Check that the database `roadtrip-db` exists

### Authentication Error
```
Error: GitHubError: OAuth Callback
```

**Solution:**
- Verify GitHub OAuth credentials in `.env.local`
- Check that redirect URL is exactly: `http://localhost:3000/api/auth/callback/github`
- Clear browser cookies and try again

### File Upload Error
```
Error: Invalid Vercel Blob Token
```

**Solution:**
- Verify `BLOB_READ_WRITE_TOKEN` is correct
- Generate a new token from Vercel dashboard
- Make sure token is valid and not expired

### Port 3000 Already in Use
```
Error: listen EADDRINUSE :::3000
```

**Solution:**
```bash
# Kill the process on port 3000
# On Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# On macOS/Linux:
lsof -ti:3000 | xargs kill -9
```

Then try `npm run dev` again.

## Production Deployment

### Deploy to Vercel

1. Push code to GitHub:
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. Click **Add New** → **Project**
4. Import your GitHub repository
5. Add environment variables in **Settings** → **Environment Variables**
6. Click **Deploy**

Your application will be live at `https://<your-project>.vercel.app`

### Deploy to Other Platforms

The app can also be deployed to:
- **Azure App Service** - [Guide](https://learn.microsoft.com/en-us/azure/app-service/quickstart-nodejs)
- **AWS Amplify** - [Guide](https://aws.amazon.com/blogs/mobile/category/amplify/)
- **DigitalOcean** - [Guide](https://www.digitalocean.com/community/tutorials/how-to-deploy-a-next-js-application-to-app-platform)

## Next Steps

1. Read [DEVELOPMENT.md](./DEVELOPMENT.md) for development guidelines
2. Check out the API documentation in [README.md](./README.md)
3. Start adding features or customizing the app
4. Invite family members to collaborate

## Getting Help

- **Next.js Docs**: https://nextjs.org/docs
- **NextAuth.js Docs**: https://next-auth.js.org
- **Azure Cosmos DB**: https://learn.microsoft.com/en-us/azure/cosmos-db/
- **Vercel Blob**: https://vercel.com/docs/storage/vercel-blob

---

Happy Planning! 🚗🗺️
