# Deployment Guide

Complete instructions for deploying Family Road Trip 2028 to production.

## Choose Deployment Platform

### Recommended: Vercel
- Built specifically for Next.js
- One-click deployment from GitHub
- Automatic CI/CD
- Excellent performance
- [Instructions below](#vercel-deployment)

### Alternative: Azure App Service
- Enterprise-grade infrastructure
- Integrated with Azure Cosmos DB
- Scaling options
- [Instructions](#azure-app-service-deployment)

### Alternative: AWS Amplify
- AWS ecosystem integration
- Easy GitHub import
- Automatic deployments
- [Instructions](#aws-amplify-deployment)

---

## Pre-Deployment Checklist

### Code Quality
- [ ] `npm run type-check` passes
- [ ] `npm run lint` passes
- [ ] No console.log() statements left in production code
- [ ] No hardcoded credentials
- [ ] All tests pass (if applicable)

### Functionality Testing
- [ ] Home page loads
- [ ] Authentication works (try sign in/out)
- [ ] Can create destination
- [ ] Can vote on destination
- [ ] Can create activity
- [ ] Can manage trip members
- [ ] Can upload file
- [ ] Budget tracking works
- [ ] Email notifications work

### Database/Storage Testing
- [ ] Cosmos DB connection works
- [ ] All collections created
- [ ] Data persists on page refresh
- [ ] Vercel Blob upload works
- [ ] Files download correctly

### Security Review
- [ ] No secrets in code
- [ ] All env vars in .env.local
- [ ] HTTPS will be enforced
- [ ] API keys are valid
- [ ] GitHub OAuth app configured

### Performance Testing
- [ ] Page load time < 2 seconds
- [ ] No console errors
- [ ] Images optimized
- [ ] API responses reasonable

---

## Vercel Deployment

### Prerequisites

- GitHub account with code pushed
- Vercel account (free tier available)
- Internet connection

### Step 1: Push to GitHub

```bash
git add .
git commit -m "Ready for production deployment"
git push origin main
```

### Step 2: Create Vercel Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Add New** → **Project**
3. Select **Import Git Repository**
4. Authorize GitHub
5. Select your repository
6. Click **Import**

### Step 3: Configure Environment Variables

Vercel will auto-detect it's a Next.js project. Now add environment variables:

1. In project settings, go to **Environment Variables**
2. Add all variables from `.env.local`:

```
NEXTAUTH_URL=https://your-project.vercel.app
NEXTAUTH_SECRET=<your-secret>

AZURE_COSMOS_ENDPOINT=<your-endpoint>
AZURE_COSMOS_KEY=<your-key>
AZURE_COSMOS_DB_NAME=roadtrip-db
AZURE_COSMOS_CONTAINERS_TRIPS=trips
AZURE_COSMOS_CONTAINERS_DESTINATIONS=destinations
AZURE_COSMOS_CONTAINERS_ACTIVITIES=activities
AZURE_COSMOS_CONTAINERS_EXPENSES=expenses
AZURE_COSMOS_CONTAINERS_FILES=files
AZURE_COSMOS_CONTAINERS_TIMELINE=timeline
AZURE_COSMOS_CONTAINERS_BUDGETS=budgets
AZURE_COSMOS_CONTAINERS_ITEMPERMISSIONS=itemPermissions
AZURE_COSMOS_CONTAINERS_ITEMREFERENCES=itemReferences

BLOB_READ_WRITE_TOKEN=<your-token>

GITHUB_ID=<your-github-id>
GITHUB_SECRET=<your-github-secret>

RESEND_API_KEY=<your-resend-key>
SENDER_EMAIL=<your-sender-email>
```

3. Click **Save**

### Step 4: Deploy

Option A (Automatic):
- Click **Deploy**
- Vercel builds and deploys automatically
- Deployment takes 2-5 minutes

Option B (Manual):
- Any push to main branch triggers auto-deploy
- Check Deployments tab to see progress

### Step 5: Configure Custom Domain (Optional)

1. In project settings, go to **Domains**
2. Add your custom domain
3. Update DNS records (instructions provided)
4. Wait for DNS propagation (5-30 minutes)

### Step 6: Verify Deployment

1. Visit your deployed URL
2. Test all features
3. Check Vercel logs if issues
4. Monitor Vercel Analytics

### Rollback

If something goes wrong:

1. Go to **Deployments** tab
2. Find previous working deployment
3. Click **Promote to Production**

---

## Azure App Service Deployment

### Prerequisites

- Azure subscription ([free trial available](https://azure.microsoft.com/free/))
- Azure CLI installed ([download](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli))
- Local code ready to deploy

### Step 1: Create Resource Group

```bash
az group create \
  --name roadtrip-rg \
  --location eastus
```

### Step 2: Create App Service Plan

```bash
az appservice plan create \
  --name roadtrip-plan \
  --resource-group roadtrip-rg \
  --sku B1 \
  --is-linux
```

### Step 3: Create Web App

```bash
az webapp create \
  --resource-group roadtrip-rg \
  --plan roadtrip-plan \
  --name family-road-trip \
  --runtime "NODE|18"
```

### Step 4: Set Environment Variables

Create `app-settings.json`:

```json
[
  { "name": "NEXTAUTH_URL", "value": "https://family-road-trip.azurewebsites.net" },
  { "name": "NEXTAUTH_SECRET", "value": "your-secret" },
  { "name": "AZURE_COSMOS_ENDPOINT", "value": "your-endpoint" },
  { "name": "AZURE_COSMOS_KEY", "value": "your-key" },
  { "name": "AZURE_COSMOS_DB_NAME", "value": "roadtrip-db" },
  { "name": "BLOB_READ_WRITE_TOKEN", "value": "your-token" },
  { "name": "GITHUB_ID", "value": "your-github-id" },
  { "name": "GITHUB_SECRET", "value": "your-secret" },
  { "name": "RESEND_API_KEY", "value": "your-key" },
  { "name": "SENDER_EMAIL", "value": "your-email" }
]
```

Deploy settings:

```bash
az webapp config appsettings set \
  --resource-group roadtrip-rg \
  --name family-road-trip \
  --settings @app-settings.json
```

### Step 5: Deploy Code

Option A (Git deployment):

```bash
az webapp deployment source config-zip \
  --resource-group roadtrip-rg \
  --name family-road-trip \
  --src <path-to-zip>
```

Option B (Azure DevOps CI/CD):
- See [Azure DevOps integration](https://learn.microsoft.com/en-us/azure/app-service/deploy-ci-cd)

### Step 6: Verify

```bash
az webapp show \
  --resource-group roadtrip-rg \
  --name family-road-trip \
  --query hostNames
```

Visit the URL provided.

### Monitor & Scale

```bash
# View logs
az webapp log tail --resource-group roadtrip-rg --name family-road-trip

# Scale up
az appservice plan update \
  --name roadtrip-plan \
  --resource-group roadtrip-rg \
  --sku P1V2
```

---

## AWS Amplify Deployment

### Prerequisites

- AWS account
- Code on GitHub
- AWS CLI installed (optional)

### Step 1: Go to AWS Amplify

1. Go to [AWS Amplify Console](https://amplify.aws)
2. Sign in to your AWS account
3. Click **Create app** → **Host web app**

### Step 2: Connect GitHub

1. Choose **GitHub** as provider
2. Authorize AWS Amplify with GitHub
3. Select repository and branch

### Step 3: Configure Build

Amplify auto-detects Next.js. Verify build settings:

```yaml
version: 1
frontend:
  phases:
    install:
      commands:
        - npm install
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
```

### Step 4: Set Environment Variables

1. Go to **Environment variables**
2. Add all variables from `.env.local`
3. Click **Redeploy**

### Step 5: Deploy

1. Review settings
2. Click **Deploy**
3. Wait for build to complete (5-10 minutes)
4. Visit provided URL

---

## Post-Deployment Tasks

### Verify Everything Works

- [ ] Site loads from production URL
- [ ] HTTPS works (no warnings)
- [ ] Sign in with GitHub works
- [ ] All features functional
- [ ] Files upload successfully
- [ ] Emails send (if applicable)
- [ ] Database connection works

### Set Up Monitoring

### Vercel
- Check Vercel Analytics
- Set up error tracking (Sentry optional)
- Monitor performance metrics

### Azure
```bash
# Enable application insights
az webapp config set \
  --resource-group roadtrip-rg \
  --name family-road-trip \
  --use-32bit-worker-process false
```

### AWS
- Enable CloudWatch logs
- Set up SNS alerts
- Monitor CloudFront cache

### Configure Custom Domain

Use your own domain instead of default URL. Provider-specific instructions in regional documentation.

### Enable Auto-Scaling

- Vercel: Automatic
- Azure: Adjust App Service Plan
- AWS: Set up scaling policies

### Set Up CI/CD

Future updates deploy automatically when you push to main branch.

### Update GitHub OAuth Redirect

Update GitHub OAuth app to use production URL:

1. Go to GitHub Settings
2. Edit OAuth app
3. Set Authorization callback URL to: `https://your-production-url/api/auth/callback/github`

## Performance Optimization

### CDN Configuration

- Vercel: Automatic
- Azure: Configure Azure CDN
- AWS: CloudFront automatic

### Database Optimization

```typescript
// Ensure all queries use partition keys
// Create indexes for frequently-filtered fields
// Monitor query performance
```

### Image Optimization

- Use Next.js Image component
- Optimize all uploads
- Set appropriate cache headers

## Scaling Plan

### As users grow:

1. **0-100 users**: Current setup adequate
2. **100-1,000 users**: 
   - Increase Cosmos DB throughput
   - Enable read replicas
3. **1,000+ users**:
   - Spread to multiple regions
   - Implement caching layer
   - Use CDN

## Disaster Recovery

### Backups

- Cosmos DB: Automatic daily backups
- Blob Storage: Redundant storage
- Code: In GitHub

### Rollback Procedure

Each platform has one-click rollback to previous deployment.

### Emergency Contact

Document who can deploy in emergencies:
- [ ] Primary contact: ___________
- [ ] Secondary contact: ___________
- [ ] On-call schedule: ___________

## Post-Launch Communication

- [ ] Notify family members
- [ ] Share production URL
- [ ] Send GitHub link (if open source)
- [ ] Update documentation
- [ ] Set support email

## Success Criteria

Deployment is successful when:

✅ Application accessible  
✅ All core features work  
✅ Users can authenticate  
✅ Data persists  
✅ Performance acceptable  
✅ Monitoring configured  
✅ Team trained  

---

## Support & Troubleshooting

### Common Issues

**"Cannot find module"**
- Run `npm install` locally
- Commit `package-lock.json`
- Redeploy

**"Database connection failed"**
- Verify Cosmos DB credentials
- Check firewall allows deployment IP
- Verify database and collections exist

**"Authentication not working"**
- Verify GitHub OAuth credentials
- Check redirect URL matches
- Verify NEXTAUTH_SECRET set

**"File upload fails"**
- Check Vercel Blob token valid
- Verify storage limits
- Check file size under 50MB

### Get Help

- [Vercel Support](https://create-next-app.vercel.app/learn)
- [Azure Documentation](https://docs.microsoft.com/azure/)
- [AWS Documentation](https://aws.amazon.com/documentation/)
- [NextAuth.js Docs](https://next-auth.js.org)

---

**Last Updated:** March 2025
