# Email Notifications with Resend

## Overview

This document describes the email notification system implemented for the Family Roadtrip 2028 application using Resend. The system sends transactional emails for various trip-related activities.

## Installation

Resend has been installed via npm:

```bash
npm install resend
```

## Environment Configuration

Add the following environment variables to your `.env.local` file:

```bash
# Resend API Key (get from https://resend.com)
RESEND_API_KEY=your_resend_api_key_here

# Sender email address (customize as needed)
SENDER_EMAIL=noreply@familyroadtrip.dev

# Base URL for email links
NEXTAUTH_URL=http://localhost:3000  # or your production URL
```

## Architecture

### Email Service (`src/lib/email.ts`)

Contains low-level email sending functionality and HTML email templates:

**Core Functions:**
- `sendEmail()` - Sends an email via Resend
- Template generators for each notification type:
  - `getAddedToTripEmailTemplate()` - User added to trip
  - `getVotedNotificationEmailTemplate()` - Destination/activity voted
  - `getRemovedFromTripEmailTemplate()` - User removed from trip
  - `getNewDestinationAddedEmailTemplate()` - Destination created
  - `getNewActivityAddedEmailTemplate()` - Activity created
  - `getStatusChangedEmailTemplate()` - Status updated

### Notifications Service (`src/lib/notifications.ts`)

High-level notification logic that handles business logic and recipient management:

**Core Functions:**
- `notifyUserAddedToTrip()` - Notify when user is added
- `notifyVoteOnItem()` - Notify on votes
- `notifyUserRemovedFromTrip()` - Notify on removal
- `notifyNewDestinationAdded()` - Notify on destination creation
- `notifyNewActivityAdded()` - Notify on activity creation
- `notifyStatusChanged()` - Notify on status changes

## Notification Types

### 1. User Added to Trip
**Triggered:** When a trip owner adds a member
**Recipients:** The newly added user
**Endpoint:** `POST /api/trips/[id]/members`
**Email Contains:**
- Welcome message
- Trip name
- Invitation details
- Link to trip

### 2. User Removed from Trip
**Triggered:** When a trip owner removes a member
**Recipients:** The removed user
**Endpoint:** `DELETE /api/trips/[id]/members?email=...`
**Email Contains:**
- Notification of removal
- Trip name
- Contact information for trip organizer

### 3. Destination/Activity Upvoted
**Triggered:** When another user votes on an item they created
**Recipients:** Item creator
**Endpoint:** `POST /api/destinations/[id]/vote` or `PUT /api/activities/[id]?action=vote`
**Email Contains:**
- Voter's email
- Item name and type
- Vote emoji (👍)
- Link to item

### 4. New Destination Added
**Triggered:** When a destination is added to a trip
**Recipients:** All trip members except the creator
**Endpoint:** `POST /api/destinations`
**Email Contains:**
- Destination name
- Trip name
- Creator's email
- Link to destination details

### 5. New Activity Added
**Triggered:** When an activity is added to a destination in a trip
**Recipients:** All trip members except the creator
**Endpoint:** `POST /api/activities`
**Email Contains:**
- Activity name
- Destination name
- Trip name
- Creator's email
- Link to activity details

### 6. Status Changed
**Triggered:** When status is updated for a trip item
**Recipients:** All trip members except the person who made the change
**Endpoint:** `PUT /api/destinations/[id]` or `PUT /api/activities/[id]?action=status`
**Email Contains:**
- Item name and type
- Previous status
- New status
- Changer's email
- Link to item

## Integration Points

### Trip Members Management
- **File:** `src/pages/api/trips/[id]/members.ts`
- **Notifications Sent:**
  - When user is added to trip (POST)
  - When user is removed from trip (DELETE)

### Destination Operations
- **File:** `src/pages/api/destinations/index.ts`
- **Notifications Sent:**
  - When new destination is added to a trip (POST)
- **File:** `src/pages/api/destinations/[id].ts`
- **Notifications Sent:**
  - When destination status changes (PUT)

### Activity Operations
- **File:** `src/pages/api/activities/index.ts`
- **Notifications Sent:**
  - When new activity is added to a trip (POST)
- **File:** `src/pages/api/activities/[id].ts`
- **Notifications Sent:**
  - When activity is voted on (PUT with action=vote)
  - When activity status changes (PUT with action=status)

### Destination/Activity Voting
- **File:** `src/pages/api/destinations/[id]/vote.ts`
- **Notifications Sent:**
  - When destination is voted on (POST)

## Error Handling

Email sending is wrapped in try-catch blocks and does not block API responses:

```typescript
try {
  await notifyUserAddedToTrip([email], name, tripName, inviterEmail, tripUrl);
} catch (emailError) {
  console.error("Failed to send notification email:", emailError);
  // Request continues even if email fails
}
```

This ensures that failed email delivery doesn't break the core functionality.

## Testing Email Notifications

### Local Development

1. Add valid Resend API key to `.env.local`:
   ```bash
   RESEND_API_KEY=re_test_...
   ```

2. Set up your Sender Email:
   ```bash
   SENDER_EMAIL=onboarding@resend.dev  # Use Resend test email
   ```

3. Create a test activity and perform actions:
   - Add a member to a trip
   - Create a destination
   - Create an activity
   - Vote on an item
   - Change status of an item

4. Check Resend dashboard to see sent emails

### Production Deployment

1. Get a real Resend API key from https://resend.com
2. Verify your sender domain
3. Update environment variables in deployment platform
4. Emails will be sent to real addresses

## Email Template Customization

To customize email templates, edit the template generator functions in `src/lib/email.ts`:

```typescript
export function getAddedToTripEmailTemplate(
  userName: string,
  tripName: string,
  inviterEmail: string,
  tripUrl: string
): string {
  // Customize HTML here
  return `...`;
}
```

All emails use HTML format with inline CSS styling for consistency.

## Status Field Consideration

When tracking status changes, the system compares old and new values. Make sure status field exists on all trackable entities:
- `Trip.status`
- `Destination.status`
- `Activity.status`

## Security Notes

- Email addresses are taken from authenticated sessions only
- Voters cannot receive vote notification if they haven't registered
- Only trip members receive notifications
- Viewers receive different notification set than travelers (can see new items but not all notifications)

## Monitoring & Debugging

Enable Resend logging by checking:

1. **API Response Logs:** Check server console for `console.error` messages
2. **Resend Dashboard:** Visit https://resend.com/dashboard to see all sent emails
3. **Failed Deliveries:** Resend automatically retries failed deliveries

## Future Enhancements

1. **Email Digest:** Combine multiple notifications into a daily digest
2. **Notification Preferences:** Allow users to opt-out of specific notification types
3. **Email Templates:** Add signature images and custom branding
4. **Unsubscribe:** Implement unsubscribe functionality
5. **Double Opt-In:** Verify email addresses before sending
