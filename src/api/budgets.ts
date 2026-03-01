import { containers } from "@/lib/cosmosdb";
import { TripBudget, DestinationBudget, BudgetLine } from "@/types/schema";
import { v4 as uuidv4 } from "uuid";
import * as expenseApi from "@/api/expenses";
import * as activitiesApi from "@/api/activities";

export async function getTripBudget(tripId?: string): Promise<TripBudget | null> {
  try {
    if (tripId) {
      // If tripId is provided, fetch the budget for that specific trip
      const { resources } = await containers.budgets.items
        .query({
          query: "SELECT * FROM c WHERE c.tripId = @tripId",
          parameters: [{ name: "@tripId", value: tripId }],
        })
        .fetchAll();
      
      if (resources.length === 0) return null;
      return resources[0] as TripBudget;
    } else {
      // Fallback to first budget if no tripId provided (for backward compatibility)
      const { resources } = await containers.budgets.items
        .query("SELECT * FROM c WHERE c.id != null")
        .fetchAll();
      
      if (resources.length === 0) return null;
      return resources[0] as TripBudget;
    }
  } catch (error) {
    console.error("Error fetching trip budget:", error);
    return null;
  }
}

export async function createTripBudget(tripId: string, totalBudget: number, currency: string = "EUR", notes?: string): Promise<TripBudget> {
  const tripBudget: TripBudget = {
    id: uuidv4(),
    tripId,
    totalBudget,
    currency,
    destinationBudgets: [],
    notes,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await containers.budgets.items.create(tripBudget);
  console.log(`Created trip budget: ${tripBudget.id}`);
  return tripBudget;
}

export async function updateTripBudget(tripId: string, updates: Partial<TripBudget>): Promise<TripBudget> {
  const existing = await getTripBudget(tripId);
  
  if (!existing) {
    throw new Error("Trip budget not found");
  }

  const updated: TripBudget = {
    ...existing,
    ...updates,
    id: existing.id,
    tripId: existing.tripId,
    createdAt: existing.createdAt,
    updatedAt: new Date(),
  };

  await containers.budgets.item(existing.id, existing.id).replace(updated);
  console.log(`Updated trip budget: ${existing.id}`);
  return updated;
}

export async function addDestinationBudget(
  tripId: string,
  destinationId: string,
  totalBudget: number
): Promise<TripBudget> {
  const tripBudget = await getTripBudget(tripId);
  
  if (!tripBudget) {
    throw new Error("Trip budget not found. Create one first.");
  }

  const destinationBudget: DestinationBudget = {
    id: uuidv4(),
    destinationId,
    totalBudget,
    lines: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const updated = await updateTripBudget(tripId, {
    destinationBudgets: [...tripBudget.destinationBudgets, destinationBudget],
  });

  console.log(`Added destination budget: ${destinationId}`);
  return updated;
}

export async function updateDestinationBudget(
  tripId: string,
  destinationId: string,
  totalBudget: number
): Promise<TripBudget> {
  const tripBudget = await getTripBudget(tripId);
  
  if (!tripBudget) {
    throw new Error("Trip budget not found");
  }

  const updated = await updateTripBudget(tripId, {
    destinationBudgets: tripBudget.destinationBudgets.map((db) =>
      db.destinationId === destinationId
        ? { ...db, totalBudget, updatedAt: new Date() }
        : db
    ),
  });

  return updated;
}

export async function getDestinationBudgetWithActuals(
  tripId: string,
  destinationId: string
): Promise<{
  budget: DestinationBudget | null;
  manualLines: BudgetLine[];
  expenseLines: Record<string, number>; // category -> total amount
  activityLines: Record<string, number>; // category -> total estimated cost
  totalActualSpent: number;
} | null> {
  const budget = await getDestinationBudget(tripId, destinationId);
  
  if (!budget) return null;

  // Get manual budget lines
  const manualLines = budget.lines;
  
  // Get expenses for this destination by category
  const expenseLines: Record<string, number> = {};
  try {
    const expenses = await expenseApi.getExpenses();
    expenses
      .filter((e) => e.destinationId === destinationId)
      .forEach((e) => {
        expenseLines[e.category] = (expenseLines[e.category] || 0) + e.amount;
      });
  } catch (error) {
    console.error("Error fetching expenses for destination budget:", error);
  }

  // Get activities with estimated costs for this destination by category
  const activityLines: Record<string, number> = {};
  try {
    const activities = await activitiesApi.getActivitiesByDestination(destinationId);
    activities
      .filter((a) => a.estimatedCost && a.estimatedCost > 0)
      .forEach((a) => {
        activityLines[a.category] = (activityLines[a.category] || 0) + a.estimatedCost!;
      });
  } catch (error) {
    console.error("Error fetching activities for destination budget:", error);
  }

  // Calculate total actual spent
  const manualActual = manualLines.reduce((sum, line) => sum + line.actualAmount, 0);
  const expenseActual = Object.values(expenseLines).reduce((sum, amount) => sum + amount, 0);
  const activityActual = Object.values(activityLines).reduce((sum, amount) => sum + amount, 0);
  const totalActualSpent = manualActual + expenseActual + activityActual;

  return {
    budget,
    manualLines,
    expenseLines,
    activityLines,
    totalActualSpent,
  };
}

export async function getDestinationBudget(tripId: string, destinationId: string): Promise<DestinationBudget | null> {
  const tripBudget = await getTripBudget(tripId);
  
  if (!tripBudget) return null;
  
  return (
    tripBudget.destinationBudgets.find((db) => db.destinationId === destinationId) || null
  );
}

export async function addBudgetLine(
  tripId: string,
  destinationId: string,
  category: string,
  budgetAmount: number,
  notes?: string
): Promise<TripBudget> {
  const tripBudget = await getTripBudget(tripId);
  
  if (!tripBudget) {
    throw new Error("Trip budget not found");
  }

  const budgetLine: BudgetLine = {
    id: uuidv4(),
    category: category as any,
    budgetAmount,
    actualAmount: 0,
    notes,
  };

  const updated = await updateTripBudget(tripId, {
    destinationBudgets: tripBudget.destinationBudgets.map((db) =>
      db.destinationId === destinationId
        ? { ...db, lines: [...db.lines, budgetLine], updatedAt: new Date() }
        : db
    ),
  });

  console.log(`Added budget line for ${destinationId}: ${category}`);
  return updated;
}

export async function updateBudgetLineActual(
  tripId: string,
  destinationId: string,
  lineId: string,
  actualAmount: number
): Promise<TripBudget> {
  const tripBudget = await getTripBudget(tripId);
  
  if (!tripBudget) {
    throw new Error("Trip budget not found");
  }

  const updated = await updateTripBudget(tripId, {
    destinationBudgets: tripBudget.destinationBudgets.map((db) =>
      db.destinationId === destinationId
        ? {
            ...db,
            lines: db.lines.map((line) =>
              line.id === lineId ? { ...line, actualAmount } : line
            ),
            updatedAt: new Date(),
          }
        : db
    ),
  });

  return updated;
}

export async function deleteBudgetLine(
  tripId: string,
  destinationId: string,
  lineId: string
): Promise<TripBudget> {
  const tripBudget = await getTripBudget(tripId);
  
  if (!tripBudget) {
    throw new Error("Trip budget not found");
  }

  const updated = await updateTripBudget(tripId, {
    destinationBudgets: tripBudget.destinationBudgets.map((db) =>
      db.destinationId === destinationId
        ? {
            ...db,
            lines: db.lines.filter((line) => line.id !== lineId),
            updatedAt: new Date(),
          }
        : db
    ),
  });

  console.log(`Deleted budget line: ${lineId}`);
  return updated;
}

export async function calculateBudgetStats(tripId?: string) {
  const tripBudget = await getTripBudget(tripId);
  
  if (!tripBudget) {
    return {
      totalBudget: 0,
      totalAllocated: 0,
      unallocated: 0,
      totalActual: 0,
      percentageUsed: 0,
    };
  }

  const totalAllocated = tripBudget.destinationBudgets.reduce(
    (sum, db) => sum + db.totalBudget,
    0
  );

  // Calculate actual from budget lines
  let totalActual = tripBudget.destinationBudgets.reduce(
    (sum, db) => sum + db.lines.reduce((lineSum, line) => lineSum + line.actualAmount, 0),
    0
  );

  // Add expenses linked to destinations
  try {
    const expenses = await expenseApi.getExpenses();
    const expensesByDestination = expenses
      .filter((e) => e.destinationId) // Only count expenses linked to destinations
      .reduce((sum, e) => sum + e.amount, 0);
    totalActual += expensesByDestination;
  } catch (error) {
    console.error("Error fetching expenses for budget stats:", error);
  }

  return {
    totalBudget: tripBudget.totalBudget,
    totalAllocated,
    unallocated: tripBudget.totalBudget - totalAllocated,
    totalActual,
    percentageUsed: (totalActual / tripBudget.totalBudget) * 100,
  };
}
