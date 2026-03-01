import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/authConfig";
import * as budgetApi from "@/api/budgets";
import * as tripsApi from "@/api/trips";
import { canViewTripBudget } from "@/lib/auth-helpers";
import { TripBudget } from "@/types/schema";

type ResponseData = TripBudget | { error: string; details?: string } | { message: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData | any>
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    console.error("No session found - Authorization required");
    return res.status(401).json({ error: "Unauthorized", details: "No valid session" });
  }

  console.log(`Trip Budget API called by: ${session.user?.email}`);

  const userEmail = session.user?.email;

  try {
    // Get budget stats
    if (req.method === "GET") {
      const stats = req.query.stats;
      const tripId = req.query.tripId as string;

      if (!tripId) {
        return res.status(400).json({ error: "Missing required parameter: tripId" });
      }

      // Check if user has permission to view budget
      const trip = await tripsApi.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ error: "Trip not found" });
      }

      if (!canViewTripBudget(trip, userEmail)) {
        return res.status(403).json({ error: "You do not have permission to view this trip's budget" });
      }
      
      if (stats) {
        const budgetStats = await budgetApi.calculateBudgetStats(tripId);
        return res.status(200).json(budgetStats);
      }

      // Get trip budget (return null if not found instead of 404)
      const tripBudget = await budgetApi.getTripBudget(tripId);
      return res.status(200).json(tripBudget || null);
    }

    if (req.method === "POST") {
      const { totalBudget, currency, notes, tripId: bodyTripId } = req.body;
      const tripId = bodyTripId || (req.query.tripId as string);

      if (!tripId) {
        return res.status(400).json({ error: "Missing required field: tripId" });
      }

      if (!totalBudget) {
        return res.status(400).json({ error: "Missing required field: totalBudget" });
      }

      // Check if user has permission to edit budget
      const trip = await tripsApi.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ error: "Trip not found" });
      }

      if (!canViewTripBudget(trip, userEmail)) {
        return res.status(403).json({ error: "You do not have permission to edit this trip's budget" });
      }

      const tripBudget = await budgetApi.createTripBudget(
        tripId,
        parseFloat(totalBudget),
        currency || "EUR",
        notes
      );

      return res.status(201).json(tripBudget);
    }

    if (req.method === "PUT") {
      const { totalBudget, currency, notes } = req.body;
      const tripId = req.query.tripId as string;

      if (!tripId) {
        return res.status(400).json({ error: "Missing required parameter: tripId" });
      }

      const trip = await tripsApi.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ error: "Trip not found" });
      }

      if (!canViewTripBudget(trip, userEmail)) {
        return res.status(403).json({ error: "You do not have permission to edit this trip's budget" });
      }

      const updates: Partial<TripBudget> = {};
      if (totalBudget !== undefined) updates.totalBudget = parseFloat(totalBudget);
      if (currency !== undefined) updates.currency = currency;
      if (notes !== undefined) updates.notes = notes;

      const tripBudget = await budgetApi.updateTripBudget(tripId, updates);
      return res.status(200).json(tripBudget);
    }

    if (req.method === "DELETE") {
      const tripId = req.query.tripId as string;

      if (!tripId) {
        return res.status(400).json({ error: "Missing required parameter: tripId" });
      }

      const trip = await tripsApi.getTrip(tripId);
      if (!trip) {
        return res.status(404).json({ error: "Trip not found" });
      }

      if (!canViewTripBudget(trip, userEmail)) {
        return res.status(403).json({ error: "You do not have permission to delete this trip's budget" });
      }

      // For demo purposes, we'll just clear the budget
      const tripBudget = await budgetApi.getTripBudget(tripId);
      if (!tripBudget) {
        return res.status(404).json({ error: "Trip budget not found" });
      }
      await budgetApi.updateTripBudget(tripId, { totalBudget: 0, destinationBudgets: [] });
      return res.status(200).json({ message: "Trip budget cleared" });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Error in trip budget API:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
