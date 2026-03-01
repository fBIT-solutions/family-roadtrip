import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import * as destinationApi from "@/api/destinations";
import * as tripsApi from "@/api/trips";
import * as itemReferencesApi from "@/api/itemReferences";
import * as permissionsApi from "@/api/itemPermissions";
import { notifyNewDestinationAdded } from "@/lib/notifications";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  const userEmail = session?.user?.email || "";
  console.log(`Destinations API called by: ${userEmail || "anonymous"}`);

  if (req.method === "GET") {
    try {
      const { tripId } = req.query;

      // If tripId is provided, require authentication
      if (tripId && typeof tripId === "string") {
        if (!session) {
          return res.status(401).json({ error: "Unauthorized" });
        }

        const trip = await tripsApi.getTrip(tripId);
        if (!trip) {
          return res.status(404).json({ error: "Trip not found" });
        }

        // Check if user has permission to view trip
        const canView = await permissionsApi.canViewItem(tripId, userEmail);
        if (!canView) {
          return res.status(403).json({ error: "You do not have access to this trip's destinations" });
        }

        const destinations = await destinationApi.getDestinationsByTrip(tripId);
        return res.status(200).json(destinations);
      }

      // If authenticated, get all destinations visible to user (their own + from their trips + public)
      if (session) {
        const userTrips = await tripsApi.getTrips(userEmail);
        const userTripIds = userTrips.map((t) => t.id);
        
        const destinations = await destinationApi.getDestinationsForUser(userEmail, userTripIds);
        const itemReferences = await itemReferencesApi.getItemReferencesByUser(userEmail);
        
        console.log(`Returning ${destinations.length} destinations and ${itemReferences.length} item references for authenticated user`);
        return res.status(200).json({ destinations, itemReferences });
      }

      // If unauthenticated, return only public destinations
      const publicDestinations = await destinationApi.getPublicDestinations();
      console.log(`Returning ${publicDestinations.length} public destinations for anonymous user`);
      res.status(200).json({ destinations: publicDestinations, itemReferences: [] });
    } catch (error) {
      console.error("API Error fetching destinations:", error);
      res.status(500).json({ error: "Failed to fetch destinations", details: String(error) });
    }
  } else if (req.method === "POST") {
    // POST requires authentication
    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const { tripId, ...destinationData } = req.body;
      const destination = await destinationApi.createDestination(
        {
          ...destinationData,
          addedBy: userEmail,
        },
        userEmail,
        tripId
      );

      // Send notification to trip members/contributors if this destination is added to a trip
      if (tripId && userEmail) {
        console.log(`[DESTINATION NOTIFICATION] tripId: ${tripId}, userEmail: ${userEmail}`);
        const trip = await tripsApi.getTrip(tripId);
        if (trip) {
          console.log(`[DESTINATION NOTIFICATION] Trip found: "${trip.name}"`);
          console.log(`[DESTINATION NOTIFICATION] trip.people: ${JSON.stringify(trip.people)}`);
          console.log(`[DESTINATION NOTIFICATION] trip.viewers: ${JSON.stringify(trip.viewers)}`);
          
          // Get all trip members (people + viewers) except the person who added it
          const recipients = [
            ...trip.people.filter((p) => p !== userEmail),
            ...trip.viewers.filter((v) => v !== userEmail),
          ];

          console.log(`[DESTINATION NOTIFICATION] Final recipients: ${JSON.stringify(recipients)}`);

          if (recipients.length > 0) {
            const destinationUrl = `${process.env.NEXTAUTH_URL}/destinations/${destination.id}`;
            console.log(`[DESTINATION NOTIFICATION] Sending notifications to ${recipients.length} recipients`);
            try {
              await notifyNewDestinationAdded(
                recipients,
                destination.name,
                trip.name,
                userEmail,
                destinationUrl
              );
              console.log(`[DESTINATION NOTIFICATION] Notifications sent successfully`);
            } catch (emailError) {
              console.error("Failed to send destination notification emails:", emailError);
              // Don't fail the request if email fails to send
            }
          } else {
            console.log(`[DESTINATION NOTIFICATION] No recipients found (creators don't receive notifications)`);
          }
        } else {
          console.log(`[DESTINATION NOTIFICATION] Trip not found: ${tripId}`);
        }
      } else {
        console.log(`[DESTINATION NOTIFICATION] Missing tripId or userEmail - tripId: ${tripId}, userEmail: ${userEmail}`);
      }

      res.status(201).json(destination);
    } catch (error) {
      res.status(500).json({ error: "Failed to create destination" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
