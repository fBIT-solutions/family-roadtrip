import {
  sendEmail,
  getAddedToTripEmailTemplate,
  getVotedNotificationEmailTemplate,
  getRemovedFromTripEmailTemplate,
  getNewDestinationAddedEmailTemplate,
  getNewActivityAddedEmailTemplate,
  getStatusChangedEmailTemplate,
} from "./email";

/**
 * Notify all trip members that a user was added to the trip
 */
export async function notifyUserAddedToTrip(
  recipientEmails: string[],
  userName: string,
  tripName: string,
  inviterEmail: string,
  tripUrl: string
): Promise<void> {
  const templatePromises = recipientEmails.map((email) =>
    sendEmail({
      to: email,
      subject: `${inviterEmail} added ${userName} to "${tripName}"`,
      html: getAddedToTripEmailTemplate(
        userName,
        tripName,
        inviterEmail,
        tripUrl
      ),
    }).catch((error) => {
      console.error(`Failed to send email to ${email}:`, error);
    })
  );

  await Promise.all(templatePromises);
}

/**
 * Notify destination/activity creator of votes
 */
export async function notifyVoteOnItem(
  creatorEmail: string,
  creatorName: string,
  itemName: string,
  itemType: "destination" | "activity",
  voteType: "upvoted" | "downvoted",
  voterEmail: string,
  itemUrl: string
): Promise<void> {
  try {
    await sendEmail({
      to: creatorEmail,
      subject: `${voterEmail} ${voteType} your ${itemType}: "${itemName}"`,
      html: getVotedNotificationEmailTemplate(
        creatorName,
        itemName,
        itemType,
        voteType,
        voterEmail,
        itemUrl
      ),
    });
  } catch (error) {
    console.error(`Failed to notify user of vote:`, error);
  }
}

/**
 * Notify user they were removed from a trip
 */
export async function notifyUserRemovedFromTrip(
  userEmail: string,
  userName: string,
  tripName: string
): Promise<void> {
  try {
    await sendEmail({
      to: userEmail,
      subject: `You have been removed from "${tripName}"`,
      html: getRemovedFromTripEmailTemplate(userName, tripName),
    });
  } catch (error) {
    console.error(`Failed to notify user of removal:`, error);
  }
}

/**
 * Notify trip members/contributors that a new destination was added
 */
export async function notifyNewDestinationAdded(
  recipientEmails: string[],
  destinationName: string,
  tripName: string,
  adderEmail: string,
  destinationUrl: string
): Promise<void> {
  const templatePromises = recipientEmails.map((email) =>
    sendEmail({
      to: email,
      subject: `New destination added to "${tripName}": ${destinationName}`,
      html: getNewDestinationAddedEmailTemplate(
        email.split("@")[0], // Use email prefix as name
        destinationName,
        tripName,
        adderEmail,
        destinationUrl
      ),
    }).catch((error) => {
      console.error(`Failed to send email to ${email}:`, error);
    })
  );

  await Promise.all(templatePromises);
}

/**
 * Notify trip members/contributors that a new activity was added
 */
export async function notifyNewActivityAdded(
  recipientEmails: string[],
  activityName: string,
  destinationName: string,
  tripName: string,
  adderEmail: string,
  activityUrl: string
): Promise<void> {
  const templatePromises = recipientEmails.map((email) =>
    sendEmail({
      to: email,
      subject: `New activity added to "${tripName}": ${activityName}`,
      html: getNewActivityAddedEmailTemplate(
        email.split("@")[0], // Use email prefix as name
        activityName,
        destinationName,
        tripName,
        adderEmail,
        activityUrl
      ),
    }).catch((error) => {
      console.error(`Failed to send email to ${email}:`, error);
    })
  );

  await Promise.all(templatePromises);
}

/**
 * Notify relevant users that a trip/destination/activity status changed
 */
export async function notifyStatusChanged(
  recipientEmails: string[],
  itemName: string,
  itemType: "trip" | "destination" | "activity",
  oldStatus: string,
  newStatus: string,
  changerEmail: string,
  itemUrl: string
): Promise<void> {
  const templatePromises = recipientEmails.map((email) =>
    sendEmail({
      to: email,
      subject: `Status changed for ${itemType} "${itemName}"`,
      html: getStatusChangedEmailTemplate(
        email.split("@")[0], // Use email prefix as name
        itemName,
        itemType,
        oldStatus,
        newStatus,
        changerEmail,
        itemUrl
      ),
    }).catch((error) => {
      console.error(`Failed to send email to ${email}:`, error);
    })
  );

  await Promise.all(templatePromises);
}
