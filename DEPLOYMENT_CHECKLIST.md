# Deployment Checklist

Use this checklist to ensure your application is ready for production deployment.

## Pre-Deployment (Local Testing)

### Code Quality
- [ ] No TypeScript errors: `npm run type-check`
- [ ] No linting errors: `npm run lint`
- [ ] Code is formatted properly
- [ ] All imports are correct
- [ ] No console.logs or debug code left

### Functionality Testing
- [ ] Page loads without errors
- [ ] All navigation links work
- [ ] Authentication flow works (sign in/out)
- [ ] Can create destinations
- [ ] Can vote on destinations
- [ ] Can create reservations
- [ ] Can create timeline events
- [ ] Can upload files
- [ ] Can delete items
- [ ] Error handling works (try invalid inputs)

### Database Testing
- [ ] Cosmos DB connection works
- [ ] All 5 collections created
- [ ] Data persists after page refresh
- [ ] CRUD operations work
- [ ] Queries return correct data

### File Upload Testing
- [ ] Files upload to Vercel Blob
- [ ] File metadata stored in Cosmos DB
- [ ] File preview works
- [ ] File deletion works
- [ ] Large files rejected (>50MB)

### Authentication Testing
- [ ] GitHub OAuth works
- [ ] Session persists
- [ ] Sign out works
- [ ] Unauthenticated users redirected to login
- [ ] Protected API routes require auth
- [ ] User data is isolated by login

### Responsive Design
- [ ] Looks good on desktop (1920px)
- [ ] Looks good on tablet (768px)
- [ ] Looks good on mobile (375px)
- [ ] Touch interactions work
- [ ] Forms are usable on mobile

### Performance
- [ ] Page load time is acceptable
- [ ] No console errors
- [ ] No memory leaks (check DevTools)
- [ ] Images load quickly
- [ ] API responses are fast

## Environment Setup

### Azure Cosmos DB Production
- [ ] Production Cosmos DB account created
- [ ] All 5 collections exist
- [ ] Proper indexing configured
- [ ] Throughput settings appropriate
- [ ] Backup enabled
- [ ] Credentials secure

### Vercel Blob Production
- [ ] Production Vercel project created
- [ ] Blob Storage configured
- [ ] Token generated and secure
- [ ] Storage limits understood

### GitHub OAuth Production
- [ ] GitHub OAuth app created (if different from dev)
- [ ] Production URL added to authorized URLs
- [ ] Client ID and Secret secured
- [ ] Redirect URL set correctly

### Security
- [ ] No secrets in code
- [ ] All secrets in environment variables
- [ ] `.env.local` in `.gitignore`
- [ ] API keys never logged
- [ ] CORS configured correctly (if needed)
- [ ] HTTPS enforced

## Deployment Platform (Choose One)

### Option 1: Vercel (Recommended)

#### Pre-Deployment
- [ ] Code pushed to GitHub main/master branch
- [ ] GitHub repository is public (or Vercel has access)
- [ ] Vercel account created
- [ ] Node.js version compatible

#### Deployment Steps
- [ ] Create new Vercel project
- [ ] Connect GitHub repository
- [ ] Import project (auto-configures Next.js)
- [ ] Add environment variables in Vercel dashboard
- [ ] Verify all env vars set correctly
- [ ] Deploy

#### Post-Deployment Vercel
- [ ] Check Vercel deployment logs
- [ ] Production URL accessible
- [ ] All pages working
- [ ] API routes working
- [ ] Database connection working
- [ ] File upload working
- [ ] Authentication working

### Option 2: Azure App Service

#### Pre-Deployment
- [ ] Azure subscription active
- [ ] Resource group created
- [ ] Azure CLI installed
- [ ] Node.js buildpack available

#### Deployment Steps
```bash
# Create App Service
az appservice plan create --name road-trip-plan --resource-group my-rg --sku B1 --is-linux
az webapp create --resource-group my-rg --plan road-trip-plan --name family-road-trip --runtime "NODE|18"

# Configure environment variables
az webapp config appsettings set --resource-group my-rg --name family-road-trip --settings @app-settings.json

# Deploy code
git push azure main  # or use deployment center

# Verify
az webapp show --resource-group my-rg --name family-road-trip
```

#### Post-Deployment Azure
- [ ] Azure Portal shows app as running
- [ ] Application URL accessible
- [ ] Logs show app started successfully
- [ ] No error messages in logs
- [ ] All pages working
- [ ] Database connected
- [ ] File upload working

### Option 3: AWS Amplify

#### Pre-Deployment
- [ ] AWS account created
- [ ] Code in GitHub
- [ ] Amplify CLI installed (optional)

#### Deployment Steps
1. Go to AWS Amplify Console
2. Click "Create app" → "Host web app"
3. Choose GitHub and authorize
4. Select repository and branch
5. Add environment variables
6. Click "Save and deploy"

#### Post-Deployment AWS
- [ ] Build succeeded
- [ ] App deployed
- [ ] All URLs working
- [ ] Features functional

## Post-Deployment Validation

### Access & Availability
- [ ] Production URL works
- [ ] Can reach from different network
- [ ] SSL certificate valid (HTTPS)
- [ ] No mixed content warnings
- [ ] Custom domain works (if configured)

### Full Feature Test (Production)
- [ ] Home page loads
- [ ] Can sign in with GitHub
- [ ] Can create destinations
- [ ] Can vote
- [ ] Can create reservations
- [ ] Can create timeline events
- [ ] Can upload files
- [ ] Can access all features
- [ ] Can sign out

### Error Handling
- [ ] Error pages display properly
- [ ] Database errors handled gracefully
- [ ] Network errors don't crash app
- [ ] Invalid inputs show error messages
- [ ] 404 page works
- [ ] 500 page works

### Monitoring
- [ ] Set up error logging (e.g., Sentry)
- [ ] Set up performance monitoring
- [ ] Set up uptime monitoring
- [ ] Set up database monitoring
- [ ] Set up storage monitoring
- [ ] Alerts configured

### Security Review
- [ ] No sensitive data in logs
- [ ] SSL/TLS working
- [ ] CORS headers correct
- [ ] API keys not exposed
- [ ] Environment variables not logged
- [ ] Rate limiting considered
- [ ] Input validation working

### Performance Review
- [ ] Page load time < 2 seconds
- [ ] API response time < 500ms
- [ ] Database queries optimized
- [ ] Images optimized
- [ ] Caching configured
- [ ] CDN configured (if applicable)

### Documentation
- [ ] README updated with production URL
- [ ] Deployment instructions documented
- [ ] Emergency contact info documented
- [ ] Rollback procedure documented
- [ ] Scaling plan documented

## Ongoing Maintenance

### Daily
- [ ] Monitor error logs
- [ ] Monitor uptime
- [ ] Check for user-reported issues

### Weekly
- [ ] Review performance metrics
- [ ] Check database usage
- [ ] Check storage usage
- [ ] Review security logs

### Monthly
- [ ] Update dependencies
- [ ] Review cost/billing
- [ ] Database maintenance
- [ ] Backup verification
- [ ] Security patches

### Quarterly
- [ ] Major updates
- [ ] Feature reviews
- [ ] Performance optimization
- [ ] Security audit
- [ ] Capacity planning

## Rollback Plan

If something goes wrong:

### Vercel Rollback
1. Go to Vercel Deployments
2. Click the previous successful deployment
3. Click "Promote to Production"

### Azure Rollback
```bash
# Check deployment history
az webapp deployment list --resource-group my-rg --name family-road-trip

# Swap to previous version if in slots
az webapp deployment slot swap --resource-group my-rg --name family-road-trip --slot staging
```

### GitHub Rollback
```bash
# Revert to previous commit
git revert <commit-hash>
git push origin main

# Re-deploy will happen automatically
```

## Sign-Off Checklist

Before declaring deployment complete:

- [ ] All tests passed
- [ ] All features working
- [ ] No critical bugs
- [ ] Performance acceptable
- [ ] Security reviewed
- [ ] Documentation updated
- [ ] Team notified
- [ ] Monitoring configured
- [ ] Backup verified
- [ ] Support/escalation plan ready

## Post-Launch Communication

- [ ] Notify family members
- [ ] Share production URL
- [ ] Send setup instructions
- [ ] Share login credentials
- [ ] Provide support contact info
- [ ] Set expectations for response time

## Incident Response

If there's an issue in production:

1. **Assess** - What's broken? How many users affected?
2. **Communicate** - Notify team and users if needed
3. **Mitigate** - Quick fix or rollback?
4. **Fix** - Deploy fix if rollback not enough
5. **Verify** - Confirm fix works
6. **Document** - Log what happened and why
7. **Prevent** - Add monitoring/tests to prevent recurrence

## Success Criteria

✅ Deployment is successful when:

- Application is accessible from production URL
- All core features work
- Users can authenticate
- Data persists correctly
- No critical errors
- Performance is acceptable
- Monitoring is configured
- Team is trained on platform

---

## Deployment Timeline

- **1 week before**: Run full test suite
- **3 days before**: Final security review
- **1 day before**: Prepare rollback plan
- **Morning of**: Final checks
- **During**: Monitor deployment
- **After**: Validate all features
- **Following days**: Monitor closely

## Contacts

| Role | Name | Email | Phone |
|------|------|-------|-------|
| Dev Lead | | | |
| DevOps | | | |
| Support | | | |
| Escalation | | | |

---

**Last Updated**: [Date]
**Next Review Date**: [Date 1 month from now]
