import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import type { NextApiRequest, NextApiResponse } from "next";
import * as activitiesApi from "@/api/activities";
import * as tripsApi from "@/api/trips";
import * as destinationsApi from "@/api/destinations";
import * as itemReferencesApi from "@/api/itemReferences";
import * as permissionsApi from "@/api/itemPermissions";
import { notifyNewActivityAdded } from "@/lib/notifications";

type ResponseData = any;

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseData>) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const userEmail = session.user?.email;

  if (req.method === "GET") {
    const { destinationId, tripId } = req.query;

    try {
      // If tripId is provided, get all activities for destinations in that trip
      if (tripId && typeof tripId === "string") {
        const trip = await tripsApi.getTrip(tripId);
        if (!trip) {
          return res.status(404).json({ error: "Trip not found" });
        }

        // Check if user has permission to view trip
        const canView = await permissionsApi.canViewItem(tripId, userEmail || "");
        if (!canView) {
          return res.status(403).json({ error: "You do not have access to this trip's activities" });
        }

        // Get all destinations for this trip
        const destinations = await destinationsApi.getDestinationsByTrip(tripId);
        const destinationIds = destinations.map((d) => d.id);

        // Get activities for all these destinations
        let allActivities: any[] = [];
        for (const destId of destinationIds) {
          const activities = await activitiesApi.getActivitiesByDestination(destId);
          allActivities = allActivities.concat(activities);
        }

        return res.status(200).json(allActivities);
      }

      // If destinationId is provided, get activities for that destination
      if (destinationId) {
        const activities = await activitiesApi.getActivitiesByDestination(destinationId as string);
        return res.status(200).json(activities);
      }

      // If no filters, return activities visible to the user (their own + from their trips + public)
      const userTrips = await tripsApi.getTrips(userEmail || "");
      const userTripIds = userTrips.map((t) => t.id);
      
      const activities = await activitiesApi.getActivitiesForUser(userEmail || "", userTripIds);
      const itemReferences = await itemReferencesApi.getItemReferencesByUser(userEmail || "");
      
      console.log(`Returning ${activities.length} activities and ${itemReferences.length} item references`);
      return res.status(200).json({ activities, itemReferences });
    } catch (error) {
      console.error("Error fetching activities:", error);
      return res.status(500).json({ error: "Failed to fetch activities" });
    }
  }

  if (req.method === "POST") {
    const { name, destinationId, category, description, location, latitude, longitude, mainPhotoUrl, url, estimatedCost, duration, status } = req.body;

    if (!name || !destinationId) {
      return res.status(400).json({ error: "Missing required fields: name, destinationId" });
    }

    try {
      const destination = await destinationsApi.getDestination(destinationId as string);
      const activity = await activitiesApi.createActivity(
        name,
        destinationId,
        session.user?.email || "",
        {
          category,
          description,
          location,
          latitude,
          longitude,
          mainPhotoUrl,
          url,
          estimatedCost,
          duration,
          status,
        },
        destination?.tripId
      );

      // Send notification to trip members/contributors if this activity is added to a trip
      if (destination?.tripId && userEmail) {
        console.log(`[ACTIVITY NOTIFICATION] tripId: ${destination.tripId}, userEmail: ${userEmail}`);
        const trip = await tripsApi.getTrip(destination.tripId);
        if (trip) {
          console.log(`[ACTIVITY NOTIFICATION] Trip found: "${trip.name}"`);
          console.log(`[ACTIVITY NOTIFICATION] trip.people: ${JSON.stringify(trip.people)}`);
          console.log(`[ACTIVITY NOTIFICATION] trip.viewers: ${JSON.stringify(trip.viewers)}`);
          
          // Get all trip members (people + viewers) except the person who added it
          const recipients = [
            ...trip.people.filter((p) => p !== userEmail),
            ...trip.viewers.filter((v) => v !== userEmail),
          ];

          console.log(`[ACTIVITY NOTIFICATION] Final recipients: ${JSON.stringify(recipients)}`);

          if (recipients.length > 0) {
            const activityUrl = `${process.env.NEXTAUTH_URL}/activities/${activity.id}`;
            console.log(`[ACTIVITY NOTIFICATION] Sending notifications to ${recipients.length} recipients`);
            try {
              await notifyNewActivityAdded(
                recipients,
                activity.name,
                destination.name,
                trip.name,
                userEmail,
                activityUrl
              );
              console.log(`[ACTIVITY NOTIFICATION] Notifications sent successfully`);
            } catch (emailError) {
              console.error("Failed to send activity notification emails:", emailError);
              // Don't fail the request if email fails to send
            }
          } else {
            console.log(`[ACTIVITY NOTIFICATION] No recipients found (creators don't receive notifications)`);
          }
        } else {
          console.log(`[ACTIVITY NOTIFICATION] Trip not found: ${destination.tripId}`);
        }
      } else {
        console.log(`[ACTIVITY NOTIFICATION] Missing tripId or userEmail - tripId: ${destination?.tripId}, userEmail: ${userEmail}`);
      }

      return res.status(201).json(activity);
    } catch (error) {
      console.error("Error creating activity:", error);
      return res.status(500).json({ error: "Failed to create activity" });
    }
  }

  if (req.method === "DELETE") {
    const { id } = req.query;

    try {
      // Check ownership before deletion
      const isOwner = await permissionsApi.isOwner(id as string, userEmail || "");
      if (!isOwner) {
        return res.status(403).json({ error: "Only owner can delete this activity" });
      }

      await activitiesApi.deleteActivity(id as string);
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error deleting activity:", error);
      return res.status(500).json({ error: "Failed to delete activity" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
