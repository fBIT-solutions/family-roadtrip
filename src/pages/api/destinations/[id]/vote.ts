import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
import * as destinationApi from "@/api/destinations";
import * as tripsApi from "@/api/trips";
import { canVoteOnItems } from "@/lib/auth-helpers";
import { notifyVoteOnItem } from "@/lib/notifications";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.email) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { id } = req.query;

  if (req.method === "POST") {
    try {
      // Get the destination to find its trip
      const destination = await destinationApi.getDestination(id as string);
      if (!destination) {
        return res.status(404).json({ error: "Destination not found" });
      }

      // If destination has a tripId, check voting permissions
      if (destination.tripId) {
        const trip = await tripsApi.getTrip(destination.tripId);
        if (!trip) {
          return res.status(404).json({ error: "Trip not found" });
        }

        // Check if user can vote (travelers only, not viewers)
        if (!canVoteOnItems(trip, session?.user?.email || "")) {
          return res.status(403).json({
            error: "You do not have permission to vote",
            reason: "GUEST_NOT_TRAVELER",
            tripId: trip.id,
            tripName: trip.name,
            tripOwnerEmail: trip.createdBy,
          });
        }
      }

      // Check if this is a new vote (user wasn't already voting)
      const wasAlreadyVoting = destination.votedBy.includes(session.user?.email || "");

      // Toggle vote
      const success = await destinationApi.voteForDestination(
        id as string,
        session.user?.email || ""
      );

      if (!success) {
        return res.status(404).json({ error: "Destination not found" });
      }

      // Send notification if this is a new vote (not removal)
      if (!wasAlreadyVoting && destination.addedBy && session.user?.email) {
        const destinationUrl = `${process.env.NEXTAUTH_URL}/destinations/${id}`;
        try {
          await notifyVoteOnItem(
            destination.addedBy,
            destination.addedBy.split("@")[0], // Use email prefix as name
            destination.name,
            "destination",
            "upvoted",
            session.user.email,
            destinationUrl
          );
        } catch (emailError) {
          console.error("Failed to send vote notification email:", emailError);
          // Don't fail the request if email fails to send
        }
      }

      // Fetch and return updated destination
      const updatedDestination = await destinationApi.getDestination(id as string);
      if (!updatedDestination) {
        return res.status(404).json({ error: "Destination not found" });
      }

      return res.status(200).json(updatedDestination);
    } catch (error) {
      console.error("Vote error:", error);
      return res.status(500).json({ error: "Failed to vote" });
    }
  } else {
    return res.status(405).json({ error: "Method not allowed" });
  }
}
