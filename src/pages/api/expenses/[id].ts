import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import * as expenseApi from "@/api/expenses";
import { Expense } from "@/types/schema";

type ResponseData = Expense | { error: string; details?: string } | { message: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    console.error("No session found - Authorization required");
    return res.status(401).json({ error: "Unauthorized", details: "No valid session" });
  }

  const { id } = req.query;

  if (typeof id !== "string") {
    return res.status(400).json({ error: "Invalid expense ID" });
  }

  try {
    if (req.method === "GET") {
      const expense = await expenseApi.getExpenseById(id);

      if (!expense) {
        return res.status(404).json({ error: "Expense not found" });
      }

      return res.status(200).json(expense);
    }

    if (req.method === "PUT") {
      const { title, amount, currency, category, date, paidBy, splitWith, destinationId, notes, receiptUrl } = req.body;

      const updates: Partial<Expense> = {};
      if (title !== undefined) updates.title = title;
      if (amount !== undefined) updates.amount = parseFloat(amount);
      if (currency !== undefined) updates.currency = currency;
      if (category !== undefined) updates.category = category;
      if (date !== undefined) updates.date = new Date(date);
      if (paidBy !== undefined) updates.paidBy = paidBy;
      if (splitWith !== undefined) updates.splitWith = splitWith;
      if (destinationId !== undefined) updates.destinationId = destinationId;
      if (notes !== undefined) updates.notes = notes;
      if (receiptUrl !== undefined) updates.receiptUrl = receiptUrl;

      const updated = await expenseApi.updateExpense(id, updates);
      return res.status(200).json(updated);
    }

    if (req.method === "DELETE") {
      await expenseApi.deleteExpense(id);
      return res.status(200).json({ message: "Expense deleted successfully" });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error(`Error in expense ${id} API:`, error);
    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
