import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
import { getTrip } from "@/api/trips";
import { getExpensesByTripId, createExpense } from "@/api/expenses";
import { ExpenseSchema } from "@/types/schema";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { id } = req.query;

  try {
    // Verify trip exists
    const trip = await getTrip(id as string);
    if (!trip) {
      return res.status(404).json({ error: "Trip not found" });
    }

    if (req.method === "GET") {
      // Get expenses for this trip
      const expenses = await getExpensesByTripId(id as string);
      return res.status(200).json(expenses);
    }

    if (req.method === "POST") {
      const { title, amount, currency, category, date, notes, destinationId, paidBy, splitWith } = req.body;

      if (!title || !amount || !date) {
        return res.status(400).json({
          error: "Missing required fields: title, amount, date",
        });
      }

      // Create expense
      const expense = await createExpense({
        title,
        amount: parseFloat(amount),
        currency: currency || trip.currency,
        category: category || "other",
        date: new Date(date),
        tripId: id as string,
        destinationId,
        paidBy: paidBy || session.user.email,
        splitWith: splitWith || [],
        notes: notes || undefined,
      });

      return res.status(201).json(expense);
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Expenses API error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
