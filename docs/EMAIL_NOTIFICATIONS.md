# Email Notifications

The application uses Resend for transactional email notifications. This document covers configuration and implementation.

## Installation

Resend is installed via npm:

```bash
npm install resend
```

## Configuration

Add these environment variables to `.env.local`:

```bash
# Resend API Key (get from https://resend.com)
RESEND_API_KEY=re_your_api_key_here

# Sender email address (must be verified in Resend)
SENDER_EMAIL=noreply@familyroadtrip.dev

# Base URL for email links
NEXTAUTH_URL=http://localhost:3000  # or production URL
```

## Architecture

### Email Service (`src/lib/email.ts`)

Low-level email sending and HTML templates.

**Core Function:**
```typescript
sendEmail({ to, subject, html }): Promise<void>
```

**Features:**
- Lazy-loaded Resend client
- Detailed logging for debugging
- Error handling and retries
- HTML email templates for 6 notification types

### Notifications Service (`src/lib/notifications.ts`)

High-level notification orchestration.

**Functions:**
- `notifyUserAddedToTrip()` - User invited to trip
- `notifyUserRemovedFromTrip()` - User removed from trip
- `notifyNewDestinationAdded()` - Destination created
- `notifyNewActivityAdded()` - Activity created
- `notifyVoteOnItem()` - Item voted on
- `notifyStatusChanged()` - Item status updated

## Notification Types

### 1. User Added to Trip
**Trigger:** `POST /api/trips/[id]/members`  
**Recipients:** Newly added user  
**Email Contains:**
- Welcome message
- Trip name and dates
- Link to trip

**Implementation:**
```typescript
await notifyUserAddedToTrip(
  [newUserEmail],
  tripName,
  tripStartDate,
  tripEndDate,
  tripUrl
);
```

### 2. User Removed from Trip  
**Trigger:** `DELETE /api/trips/[id]/members?email=...`  
**Recipients:** Removed user  
**Email Contains:**
- Removal notification
- Trip name
- Contact info for organizer

**Implementation:**
```typescript
await notifyUserRemovedFromTrip(
  [userEmail],
  tripName,
  removerEmail,
  tripUrl
);
```

### 3. New Destination Added to Trip
**Trigger:** `POST /api/destinations`  
**Recipients:** All trip members except creator  
**Email Contains:**
- Destination name
- Trip name
- Creator's email
- Link to destination

**Implementation:**
```typescript
await notifyNewDestinationAdded(
  recipients,
  destinationName,
  tripName,
  creatorEmail,
  destinationUrl
);
```

### 4. New Activity Added to Trip
**Trigger:** `POST /api/activities`  
**Recipients:** All trip members except creator  
**Email Contains:**
- Activity name
- Destination name
- Trip name  
- Creator's email
- Link to activity

**Implementation:**
```typescript
await notifyNewActivityAdded(
  recipients,
  activityName,
  destinationName,
  tripName,
  creatorEmail,
  activityUrl
);
```

### 5. Item Voted On
**Trigger:** 
- `POST /api/destinations/[id]/vote`
- `PUT /api/activities/[id]?action=vote`

**Recipients:** Item creator  
**Email Contains:**
- Item name
- Voter's email
- Vote emoji (👍)
- Link to item

### 6. Item Status Changed
**Trigger:** 
- `PUT /api/destinations/[id]`
- `PUT /api/activities/[id]?action=status`

**Recipients:** All trip members except who made change  
**Email Contains:**
- Item name
- Previous status
- New status
- Who changed it
- Link to item

## Integration Points

### API Endpoints Sending Notifications

**Trip Member Management** (`src/pages/api/trips/[id]/members.ts`)
```typescript
// When adding member
await notifyUserAddedToTrip(...)

// When removing member
await notifyUserRemovedFromTrip(...)
```

**Destination Operations** (`src/pages/api/destinations/index.ts`)
```typescript
// When new destination added to trip
await notifyNewDestinationAdded(...)
```

**Activity Operations** (`src/pages/api/activities/index.ts`)
```typescript
// When new activity added to trip
await notifyNewActivityAdded(...)
```

**Trip Update** (`src/pages/api/trips/[id].ts`)
```typescript
// When travelers added/removed
await notifyUserAddedToTrip(...)
await notifyUserRemovedFromTrip(...)
```

## Error Handling

Email failures don't block operations:

```typescript
try {
  await notifyUserAddedToTrip([email], ...);
} catch (emailError) {
  console.error("Failed to send email:", emailError);
  // Request continues even if email fails
}
```

## Testing

### Local Development

1. Use Resend test email (onboarding@resend.dev):
   ```bash
   SENDER_EMAIL=onboarding@resend.dev
   ```

2. Get test API key from [Resend dashboard](https://resend.com)

3. Perform actions to trigger notifications:
   - Add user to trip
   - Create destination/activity
   - Vote on items
   - Change status

4. Check [Resend dashboard](https://resend.com/dashboard) to see sent emails

### Production

1. Verify your sender domain in Resend
2. Use production API key
3. Update SENDER_EMAIL to verified address
4. Deploy with environment variables

## Debugging

### Enable Logging

Logs appear in dev server console:

```
[DESTINATION NOTIFICATION] tripId: abc-123, userEmail: user@example.com
[DESTINATION NOTIFICATION] Trip found: "Summer 2025"
[DESTINATION NOTIFICATION] trippeople: ["user1@example.com", "user2@example.com"]
[DESTINATION NOTIFICATION] Final recipients: ["user1@example.com"]
[DESTINATION NOTIFICATION] Sending notifications to 1 recipients
```

### Check Resend Status

1. Visit [Resend Dashboard](https://resend.com/dashboard)
2. See all sent emails
3. Check delivery status
4. View failure reasons
5. Check email logs

### Common Issues

**"Invalid API Key"**
- Verify RESEND_API_KEY in .env.local
- Ensure key is not expired
- Check Resend account has credits

**"Sender email not verified"**
- Add verified domain or email in Resend
- Update SENDER_EMAIL to verified address

**Emails not received**
- Check spam/junk folder
- Verify recipient email is correct
- Check Resend dashboard for delivery status
- Review email logs for bounce reasons

## Email Templates

Templates are in `src/lib/email.ts`:

```typescript
export function getNewDestinationAddedEmailTemplate(
  recipientName: string,
  destinationName: string,
  tripName: string,
  adderEmail: string,
  destinationUrl: string
): string {
  // Returns HTML string
}
```

### Customize Templates

Edit template functions to change:
- Colors
- Text content
- Layout
- Branding
- Links

All emails use inline CSS for email client compatibility.

## Security Notes

- Email addresses come from authenticated sessions only
- Only trip members receive trip notifications
- Viewers and Travelers have different notification sets
- API keys never logged or exposed
- Emails sent only for authenticated users

## Monitoring

### Server Logs

Check console where dev server is running:

```bash
npm run dev
```

Look for `[DESTINATION NOTIFICATION]`, `[ACTIVITY NOTIFICATION]` logs.

### Resend Dashboard

Visit https://resend.com/dashboard to:
- See sent emails
- Check delivery status
- View failed deliveries
- Monitor bounce rates

### Alerts

Set up monitoring for:
- Failed email sends
- High bounce rates
- API key near limit
- Delivery delays

## Future Enhancements

1. **Email Digests** - Combine multiple notifications
2. **Preferences** - Let users opt-out of notification types
3. **Unsubscribe** - Add unsubscribe links
4. **Rich Templates** - Add images and custom branding
5. **Double Opt-In** - Verify email addresses
6. **A/B Testing** - Test email subject lines

## References

- [Resend Documentation](https://resend.com/docs)
- [Email Best Practices](https://resend.com/blog)
- [HTML Email Guides](https://www.campaignmonitor.com/resources/guides/)

See [DEVELOPMENT.md](./DEVELOPMENT.md) for general development setup.
