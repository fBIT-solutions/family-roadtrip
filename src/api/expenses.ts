import { Container } from "@azure/cosmos";
import { Expense, ExpenseSchema } from "@/types/schema";
import { containers } from "@/lib/cosmosdb";
import { v4 as uuidv4 } from "uuid";

export async function getExpenses(): Promise<Expense[]> {
  const { resources } = await containers.expenses.items
    .query("SELECT * FROM c ORDER BY c.date DESC")
    .fetchAll();
  console.log(`Fetched ${resources.length} expenses from database`);
  return resources as Expense[];
}

export async function getExpenseById(id: string): Promise<Expense | null> {
  try {
    const { resource } = await containers.expenses.item(id, id).read();
    return resource as Expense;
  } catch (error) {
    console.error(`Error fetching expense ${id}:`, error);
    return null;
  }
}

export async function createExpense(expense: Omit<Expense, "id" | "createdAt" | "updatedAt">): Promise<Expense> {
  const newExpense: Expense = {
    ...expense,
    id: uuidv4(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  await containers.expenses.items.create(newExpense);
  console.log(`Created expense: ${newExpense.id}`);
  return newExpense;
}

export async function updateExpense(id: string, updates: Partial<Expense>): Promise<Expense> {
  const existing = await getExpenseById(id);
  
  if (!existing) {
    throw new Error(`Expense ${id} not found`);
  }

  const updated: Expense = {
    ...existing,
    ...updates,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: new Date(),
  };

  await containers.expenses.item(id, id).replace(updated);
  console.log(`Updated expense: ${id}`);
  return updated;
}

export async function deleteExpense(id: string): Promise<void> {
  await containers.expenses.item(id, id).delete();
  console.log(`Deleted expense: ${id}`);
}

export async function getExpensesByTripId(tripId: string): Promise<Expense[]> {
  const { resources } = await containers.expenses.items
    .query({
      query: `SELECT * FROM c WHERE c.tripId = @tripId ORDER BY c.date DESC`,
      parameters: [{ name: "@tripId", value: tripId }],
    })
    .fetchAll();
  return resources as Expense[];
}

export async function getExpensesByDestination(destinationId: string): Promise<Expense[]> {
  const { resources } = await containers.expenses.items
    .query({
      query: `SELECT * FROM c WHERE c.destinationId = @destinationId ORDER BY c.date DESC`,
      parameters: [{ name: "@destinationId", value: destinationId }],
    })
    .fetchAll();
  return resources as Expense[];
}

export async function getTotalExpenses(currency: string = "EUR"): Promise<number> {
  const expenses = await getExpenses();
  return expenses
    .filter((e) => e.currency === currency)
    .reduce((sum, e) => sum + e.amount, 0);
}

export async function getExpensesByCategory(): Promise<Record<string, number>> {
  const expenses = await getExpenses();
  const byCategory: Record<string, number> = {};
  
  expenses.forEach((expense) => {
    byCategory[expense.category] = (byCategory[expense.category] || 0) + expense.amount;
  });
  
  return byCategory;
}

export async function getPersonExpenses(userId: string): Promise<Expense[]> {
  const { resources } = await containers.expenses.items
    .query(`SELECT * FROM c WHERE c.paidBy = "${userId}" ORDER BY c.date DESC`)
    .fetchAll();
  return resources as Expense[];
}
