import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import * as expenseApi from "@/api/expenses";
import * as tripsApi from "@/api/trips";
import { Expense } from "@/types/schema";
import { canViewTripExpenses } from "@/lib/auth-helpers";

type ResponseData = Expense | Expense[] | { error: string; details?: string } | { message: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    console.error("No session found - Authorization required");
    return res.status(401).json({ error: "Unauthorized", details: "No valid session" });
  }

  const userEmail = session.user?.email;
  console.log(`Expenses API called by: ${userEmail}`);

  try {
    if (req.method === "GET") {
      const { tripId } = req.query;

      // If tripId is provided, filter expenses for that trip and check access
      if (tripId && typeof tripId === "string") {
        const trip = await tripsApi.getTrip(tripId);
        if (!trip) {
          return res.status(404).json({ error: "Trip not found" });
        }

        // Check if user has access to view expenses in this trip
        if (!canViewTripExpenses(trip, userEmail)) {
          return res.status(403).json({ error: "You do not have access to this trip's expenses" });
        }

        const expenses = await expenseApi.getExpensesByTripId(tripId);
        console.log(`Retrieved ${expenses.length} expenses for trip ${tripId}`);
        return res.status(200).json(expenses);
      }

      // Legacy behavior: get all expenses
      const expenses = await expenseApi.getExpenses();
      console.log(`Retrieved ${expenses.length} expenses`);
      return res.status(200).json(expenses);
    }

    if (req.method === "POST") {
      const { title, amount, currency, category, date, paidBy, splitWith, destinationId, tripId, notes, receiptUrl } = req.body;

      if (!title || amount === undefined || !paidBy) {
        return res.status(400).json({ error: "Missing required fields: title, amount, paidBy" });
      }

      const newExpense = await expenseApi.createExpense({
        title,
        amount: parseFloat(amount),
        currency: currency || "EUR",
        category: category || "other",
        date: new Date(date),
        paidBy,
        splitWith: splitWith || [],
        destinationId: destinationId || undefined,
        tripId: tripId || undefined,
        notes: notes || undefined,
        receiptUrl: receiptUrl || undefined,
      });

      return res.status(201).json(newExpense);
    }

    if (req.method === "DELETE") {
      const { id } = req.query;

      if (typeof id !== "string") {
        return res.status(400).json({ error: "Invalid expense ID" });
      }

      await expenseApi.deleteExpense(id);
      return res.status(200).json({ message: "Expense deleted successfully" });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Error in expenses API:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
