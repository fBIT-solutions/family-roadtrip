import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import * as budgetApi from "@/api/budgets";
import { TripBudget } from "@/types/schema";

type ResponseData = TripBudget | { error: string; details?: string } | { message: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    console.error("No session found - Authorization required");
    return res.status(401).json({ error: "Unauthorized", details: "No valid session" });
  }

  const { destinationId, action } = req.query;

  if (typeof destinationId !== "string") {
    return res.status(400).json({ error: "Invalid destination ID" });
  }

  try {
    // Add or update destination budget
    if (req.method === "POST" && action === "add-budget") {
      const { totalBudget } = req.body;

      if (!totalBudget) {
        return res.status(400).json({ error: "Missing required field: totalBudget" });
      }

      const tripBudget = await budgetApi.addDestinationBudget(
        destinationId,
        parseFloat(totalBudget)
      );
      return res.status(201).json(tripBudget);
    }

    // Update destination budget amount
    if (req.method === "PUT" && action === "update-budget") {
      const { totalBudget } = req.body;

      if (!totalBudget) {
        return res.status(400).json({ error: "Missing required field: totalBudget" });
      }

      const tripBudget = await budgetApi.updateDestinationBudget(
        destinationId,
        parseFloat(totalBudget)
      );
      return res.status(200).json(tripBudget);
    }

    // Add budget line
    if (req.method === "POST" && action === "add-line") {
      const { category, budgetAmount, notes } = req.body;

      if (!category || budgetAmount === undefined) {
        return res.status(400).json({ error: "Missing required fields: category, budgetAmount" });
      }

      const tripBudget = await budgetApi.addBudgetLine(
        destinationId,
        category,
        parseFloat(budgetAmount),
        notes
      );
      return res.status(201).json(tripBudget);
    }

    // Update budget line actual amount
    if (req.method === "PUT" && action === "update-line") {
      const { lineId, actualAmount } = req.body;

      if (!lineId || actualAmount === undefined) {
        return res.status(400).json({ error: "Missing required fields: lineId, actualAmount" });
      }

      const tripBudget = await budgetApi.updateBudgetLineActual(
        destinationId,
        lineId,
        parseFloat(actualAmount)
      );
      return res.status(200).json(tripBudget);
    }

    // Delete budget line
    if (req.method === "DELETE" && action === "delete-line") {
      const { lineId } = req.query;

      if (typeof lineId !== "string") {
        return res.status(400).json({ error: "Invalid line ID" });
      }

      const tripBudget = await budgetApi.deleteBudgetLine(destinationId, lineId);
      return res.status(200).json(tripBudget);
    }

    return res.status(400).json({ error: "Invalid action" });
  } catch (error) {
    console.error("Error in destination budget API:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
