import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
import * as travelerRequestsApi from "../../../../api/travelerRequests";
import * as tripsApi from "../../../../api/trips";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    try {
      const session = await getServerSession(req, res, authOptions);
      if (!session?.user?.email) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: "Missing trip ID" });
      }

      // Verify user is trip owner
      const trip = await tripsApi.getTrip(id as string);
      if (!trip) {
        return res.status(404).json({ error: "Trip not found" });
      }

      if (trip.createdBy !== session.user.email) {
        return res.status(403).json({ error: "Only trip owner can view requests" });
      }

      const requests = await travelerRequestsApi.getTravelerRequestsByTrip(id as string);
      return res.status(200).json(requests);
    } catch (error) {
      console.error("Error fetching traveler requests:", error);
      return res.status(500).json({ error: "Failed to fetch requests" });
    }
  }

  if (req.method === "POST") {
    try {
      const session = await getServerSession(req, res, authOptions);
      if (!session?.user?.email) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: "Missing trip ID" });
      }

      // Verify trip exists
      const trip = await tripsApi.getTrip(id as string);
      if (!trip) {
        return res.status(404).json({ error: "Trip not found" });
      }

      // Check if user is already a traveler
      if (trip.people.includes(session.user.email)) {
        return res.status(400).json({ error: "You are already a traveler on this trip" });
      }

      // Check if pending request already exists
      const hasPending = await travelerRequestsApi.hasPendingRequest(id as string, session.user.email);
      if (hasPending) {
        return res.status(400).json({ error: "You have already submitted a request" });
      }

      const request = await travelerRequestsApi.createTravelerRequest(
        id as string,
        session.user.email,
        session.user.name || undefined
      );

      return res.status(201).json(request);
    } catch (error) {
      console.error("Error creating traveler request:", error);
      return res.status(500).json({ error: "Failed to create request" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
