import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import * as budgetApi from "@/api/budgets";
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

  try {
    // Get budget stats
    if (req.method === "GET") {
      const stats = req.query.stats;
      if (stats) {
        const budgetStats = await budgetApi.calculateBudgetStats();
        return res.status(200).json(budgetStats);
      }

      // Get trip budget
      const tripBudget = await budgetApi.getTripBudget();
      if (!tripBudget) {
        return res.status(404).json({ error: "Trip budget not found" });
      }
      return res.status(200).json(tripBudget);
    }

    if (req.method === "POST") {
      const { totalBudget, currency, notes } = req.body;

      if (!totalBudget) {
        return res.status(400).json({ error: "Missing required field: totalBudget" });
      }

      const tripBudget = await budgetApi.createTripBudget(
        parseFloat(totalBudget),
        currency || "EUR",
        notes
      );

      return res.status(201).json(tripBudget);
    }

    if (req.method === "PUT") {
      const { totalBudget, currency, notes } = req.body;
      const updates: Partial<TripBudget> = {};

      if (totalBudget !== undefined) updates.totalBudget = parseFloat(totalBudget);
      if (currency !== undefined) updates.currency = currency;
      if (notes !== undefined) updates.notes = notes;

      const tripBudget = await budgetApi.updateTripBudget(updates);
      return res.status(200).json(tripBudget);
    }

    if (req.method === "DELETE") {
      // For demo purposes, we'll just clear the budget
      const tripBudget = await budgetApi.getTripBudget();
      if (!tripBudget) {
        return res.status(404).json({ error: "Trip budget not found" });
      }
      await budgetApi.updateTripBudget({ totalBudget: 0, destinationBudgets: [] });
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
