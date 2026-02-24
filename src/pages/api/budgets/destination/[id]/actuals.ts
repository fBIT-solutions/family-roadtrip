import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../auth/[...nextauth]";
import * as budgetApi from "@/api/budgets";

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

  const { id: destinationId } = req.query;

  if (typeof destinationId !== "string") {
    return res.status(400).json({ error: "Invalid destination ID" });
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const budgetData = await budgetApi.getDestinationBudgetWithActuals(destinationId);

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
