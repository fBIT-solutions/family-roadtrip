import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../auth/authConfig";
import * as budgetApi from "@/api/budgets";
import * as tripsApi from "@/api/trips";
import { canViewTripBudget } from "@/lib/auth-helpers";

type ResponseData = {
  expenseLines: Record<string, number>;
  activityLines: Record<string, number>;
  totalActualSpent: number;
} | { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const userEmail = session.user?.email || "";
  const { id: destinationId, tripId } = req.query;

  if (typeof destinationId !== "string") {
    return res.status(400).json({ error: "Invalid destination ID" });
  }

  if (typeof tripId !== "string") {
    return res.status(400).json({ error: "Missing required parameter: tripId" });
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Verify user has permission to view this trip's budget
    const trip = await tripsApi.getTrip(tripId);
    if (!trip) {
      return res.status(404).json({ error: "Trip not found" });
    }

    if (!canViewTripBudget(trip, userEmail)) {
      return res.status(403).json({ error: "You do not have permission to view this trip's budget" });
    }

    const budgetData = await budgetApi.getDestinationBudgetWithActuals(tripId, destinationId);

    if (!budgetData) {
      return res.status(200).json({
        expenseLines: {},
        activityLines: {},
        totalActualSpent: 0,
      });
    }

    return res.status(200).json({
      expenseLines: budgetData.expenseLines,
      activityLines: budgetData.activityLines,
      totalActualSpent: budgetData.totalActualSpent,
    });
  } catch (error) {
    console.error("Error fetching destination actuals:", error);
    return res.status(500).json({ error: "Failed to fetch destination actuals" });
  }
}
