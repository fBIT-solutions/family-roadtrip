import { Resend } from "resend";

const SENDER_EMAIL = process.env.SENDER_EMAIL || "noreply@familyroadtrip.dev";

// Lazy-load Resend client to ensure environment variables are available
function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY environment variable is not set");
  }
  return new Resend(apiKey);
}

export interface EmailNotification {
  to: string;
  subject: string;
  html: string;
}

/**
 * Send email notification
 */
export async function sendEmail({
  to,
  subject,
  html,
}: EmailNotification): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  
  if (!apiKey) {
    console.warn(
      "RESEND_API_KEY not configured. Email would be sent to:",
      to,
      "with subject:",
      subject
    );
    return;
  }

  try {
    const resend = getResendClient();
    console.log(`Sending email to ${to} with subject: ${subject}`);
    
    const result = await resend.emails.send({
      from: SENDER_EMAIL,
      to,
      subject,
      html,
    });
    
    console.log(`Email sent successfully to ${to}:`, result);
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error);
    throw error;
  }
}

/**
 * Generate email template for user added to trip
 */
export function getAddedToTripEmailTemplate(
  userName: string,
  tripName: string,
  inviterEmail: string,
  tripUrl: string
): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4CAF50; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
          .button { display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #999; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to the Trip! 🚗</h1>
          </div>
          <div class="content">
            <p>Hi ${userName},</p>
            <p>Great news! <strong>${inviterEmail}</strong> has added you to the trip <strong>"${tripName}"</strong>.</p>
            <p>You can now view, plan, and collaborate on destinations and activities for this trip.</p>
            <a href="${tripUrl}" class="button">View Trip Details</a>
            <p>Happy travels!</p>
          </div>
          <div class="footer">
            <p>Family Roadtrip 2028 • Planning adventures together</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Generate email template for destination/activity voted
 */
export function getVotedNotificationEmailTemplate(
  userName: string,
  itemName: string,
  itemType: "destination" | "activity",
  voteType: "upvoted" | "downvoted",
  voterEmail: string,
  itemUrl: string
): string {
  const emoji = voteType === "upvoted" ? "👍" : "👎";
  const action = voteType === "upvoted" ? "upvoted" : "downvoted";
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2196F3; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
          .button { display: inline-block; background-color: #2196F3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #999; }
          .highlight { background-color: #fff3cd; padding: 10px; border-left: 4px solid #ffc107; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${emoji} Your ${itemType} Got ${voteType.charAt(0).toUpperCase() + voteType.slice(1)}!</h1>
          </div>
          <div class="content">
            <p>Hi ${userName},</p>
            <p><strong>${voterEmail}</strong> has ${action} your ${itemType.toLowerCase()} <strong>"${itemName}"</strong>.</p>
            <div class="highlight">
              <p>Keep getting feedback from other travelers to find the best experiences!</p>
            </div>
            <a href="${itemUrl}" class="button">View ${itemType.charAt(0).toUpperCase() + itemType.slice(1)}</a>
          </div>
          <div class="footer">
            <p>Family Roadtrip 2028 • Planning adventures together</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Generate email template for user removed from trip
 */
export function getRemovedFromTripEmailTemplate(
  userName: string,
  tripName: string
): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f44336; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
          .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #999; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Trip Access Changed</h1>
          </div>
          <div class="content">
            <p>Hi ${userName},</p>
            <p>You have been removed from the trip <strong>"${tripName}"</strong>.</p>
            <p>You no longer have access to view or edit this trip's details, destinations, activities, and related information.</p>
            <p>If you believe this was done in error, please contact the trip organizer.</p>
          </div>
          <div class="footer">
            <p>Family Roadtrip 2028 • Planning adventures together</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Generate email template for new destination added
 */
export function getNewDestinationAddedEmailTemplate(
  userName: string,
  destinationName: string,
  tripName: string,
  adderEmail: string,
  destinationUrl: string
): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #FF9800; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
          .button { display: inline-block; background-color: #FF9800; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #999; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Destination Added 📍</h1>
          </div>
          <div class="content">
            <p>Hi ${userName},</p>
            <p><strong>${adderEmail}</strong> has added a new destination <strong>"${destinationName}"</strong> to the trip <strong>"${tripName}"</strong>.</p>
            <p>Check it out and vote on whether you'd like to visit this destination!</p>
            <a href="${destinationUrl}" class="button">View Destination</a>
          </div>
          <div class="footer">
            <p>Family Roadtrip 2028 • Planning adventures together</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Generate email template for new activity added
 */
export function getNewActivityAddedEmailTemplate(
  userName: string,
  activityName: string,
  destinationName: string,
  tripName: string,
  adderEmail: string,
  activityUrl: string
): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #9C27B0; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
          .button { display: inline-block; background-color: #9C27B0; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #999; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Activity Added 🎯</h1>
          </div>
          <div class="content">
            <p>Hi ${userName},</p>
            <p><strong>${adderEmail}</strong> has added a new activity <strong>"${activityName}"</strong> at <strong>"${destinationName}"</strong> in the trip <strong>"${tripName}"</strong>.</p>
            <p>Check it out and vote to share your thoughts!</p>
            <a href="${activityUrl}" class="button">View Activity</a>
          </div>
          <div class="footer">
            <p>Family Roadtrip 2028 • Planning adventures together</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Generate email template for status change
 */
export function getStatusChangedEmailTemplate(
  userName: string,
  itemName: string,
  itemType: "trip" | "destination" | "activity",
  oldStatus: string,
  newStatus: string,
  changerEmail: string,
  itemUrl: string
): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #673AB7; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
          .button { display: inline-block; background-color: #673AB7; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #999; }
          .status-box { background-color: #f0f0f0; padding: 15px; border-radius: 5px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Status Updated 🔄</h1>
          </div>
          <div class="content">
            <p>Hi ${userName},</p>
            <p><strong>${changerEmail}</strong> has updated the status of ${itemType.toLowerCase()} <strong>"${itemName}"</strong>.</p>
            <div class="status-box">
              <p><strong>Previous Status:</strong> ${oldStatus}</p>
              <p><strong>New Status:</strong> ${newStatus}</p>
            </div>
            <a href="${itemUrl}" class="button">View ${itemType.charAt(0).toUpperCase() + itemType.slice(1)}</a>
          </div>
          <div class="footer">
            <p>Family Roadtrip 2028 • Planning adventures together</p>
          </div>
        </div>
      </body>
    </html>
  `;
}
