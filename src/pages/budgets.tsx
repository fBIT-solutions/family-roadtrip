import React, { useState, useEffect, useCallback } from "react";
import { useSession, signIn } from "next-auth/react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./api/auth/[...nextauth]";
import type { GetServerSideProps } from "next";
import Link from "next/link";
import axios from "axios";
import { TripBudget, Destination } from "@/types/schema";
import * as budgetApi from "@/api/budgets";
import * as destinationApi from "@/api/destinations";

const categoryColors: Record<string, string> = {
  accommodation: "bg-blue-100 text-blue-800",
  food: "bg-orange-100 text-orange-800",
  transport: "bg-purple-100 text-purple-800",
  activity: "bg-green-100 text-green-800",
  shopping: "bg-pink-100 text-pink-800",
  other: "bg-gray-100 text-gray-800",
};

export default function Budgets({
  initialTripBudget = null,
  initialDestinations = [],
}: {
  initialTripBudget?: TripBudget | null;
  initialDestinations?: Destination[];
}) {
  const { data: session, status } = useSession();
  const [tripBudget, setTripBudget] = useState<TripBudget | null>(initialTripBudget);
  const [destinations, setDestinations] = useState<Destination[]>(initialDestinations);
  const [totalBudget, setTotalBudget] = useState(initialTripBudget?.totalBudget.toString() || "");
  const [currency, setCurrency] = useState(initialTripBudget?.currency || "USD");
  const [notes, setNotes] = useState(initialTripBudget?.notes || "");
  const [budgetStats, setBudgetStats] = useState<any>({
    totalBudget: 0,
    totalAllocated: 0,
    unallocated: 0,
    totalActual: 0,
    percentageUsed: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingDestId, setEditingDestId] = useState<string | null>(null);
  const [destBudgetAmount, setDestBudgetAmount] = useState("");
  const [showAddLine, setShowAddLine] = useState<string | null>(null);
  const [newLineCategory, setNewLineCategory] = useState("accommodation");
  const [newLineBudget, setNewLineBudget] = useState("");
  const [newLineNotes, setNewLineNotes] = useState("");
  const [destinationActuals, setDestinationActuals] = useState<
    Record<
      string,
      {
        expenseLines: Record<string, number>;
        activityLines: Record<string, number>;
        totalActualSpent: number;
      }
    >
  >({});

  const fetchBudget = useCallback(async () => {
    try {
      const response = await axios.get("/api/budgets/trip", { withCredentials: true });
      setTripBudget(response.data);
      setTotalBudget(response.data.totalBudget.toString());
      setCurrency(response.data.currency);
      setNotes(response.data.notes || "");
    } catch (err) {
      console.error("Error fetching budget:", err);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const response = await axios.get("/api/budgets/trip?stats=true", { withCredentials: true });
      if (response.data) {
        setBudgetStats({
          totalBudget: response.data.totalBudget || 0,
          totalAllocated: response.data.totalAllocated || 0,
          unallocated: response.data.unallocated || 0,
          totalActual: response.data.totalActual || 0,
          percentageUsed: response.data.percentageUsed || 0,
        });
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
      // Keep default values
      setBudgetStats({
        totalBudget: 0,
        totalAllocated: 0,
        unallocated: 0,
        totalActual: 0,
        percentageUsed: 0,
      });
    }
  }, []);

  const fetchDestinationActuals = useCallback(
    async (destIds: string[]) => {
      const actuals: typeof destinationActuals = {};
      try {
        for (const destId of destIds) {
          const response = await axios.get(`/api/budgets/destination/${destId}/actuals`, {
            withCredentials: true,
          });
          if (response.data) {
            actuals[destId] = {
              expenseLines: response.data.expenseLines || {},
              activityLines: response.data.activityLines || {},
              totalActualSpent: response.data.totalActualSpent || 0,
            };
          }
        }
        setDestinationActuals(actuals);
      } catch (err) {
        console.error("Error fetching destination actuals:", err);
      }
    },
    []
  );

  useEffect(() => {
    fetchBudget();
    fetchStats();
  }, [fetchBudget, fetchStats]);

  useEffect(() => {
    if (destinations.length > 0) {
      fetchDestinationActuals(destinations.map((d) => d.id));
    }
  }, [destinations, fetchDestinationActuals]);

  const handleSaveTripBudget = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!totalBudget) {
      setError("Please enter a total budget");
      return;
    }

    try {
      setLoading(true);
      if (tripBudget) {
        // Update existing
        const response = await axios.put("/api/budgets/trip", {
          totalBudget: parseFloat(totalBudget),
          currency,
          notes,
        });
        setTripBudget(response.data);
      } else {
        // Create new
        const response = await axios.post("/api/budgets/trip", {
          totalBudget: parseFloat(totalBudget),
          currency,
          notes,
        });
        setTripBudget(response.data);
      }
      setError(null);
      fetchStats();
    } catch (err) {
      console.error("Error saving trip budget:", err);
      setError("Failed to save budget");
    } finally {
      setLoading(false);
    }
  };

  const handleAddDestinationBudget = async (destinationId: string) => {
    if (!destBudgetAmount || !tripBudget) return;

    try {
      const response = await axios.post(
        `/api/budgets/destination/${destinationId}?action=add-budget`,
        { totalBudget: parseFloat(destBudgetAmount) },
        { withCredentials: true }
      );
      setTripBudget(response.data);
      setDestBudgetAmount("");
      setEditingDestId(null);
      fetchStats();
    } catch (err) {
      console.error("Error adding destination budget:", err);
      setError("Failed to add destination budget");
    }
  };

  const handleAddBudgetLine = async (destinationId: string) => {
    if (!newLineBudget) return;

    try {
      const response = await axios.post(
        `/api/budgets/destination/${destinationId}?action=add-line`,
        {
          category: newLineCategory,
          budgetAmount: parseFloat(newLineBudget),
          notes: newLineNotes || undefined,
        },
        { withCredentials: true }
      );
      setTripBudget(response.data);
      setNewLineCategory("accommodation");
      setNewLineBudget("");
      setNewLineNotes("");
      setShowAddLine(null);
      fetchStats();
    } catch (err) {
      console.error("Error adding budget line:", err);
      setError("Failed to add budget line");
    }
  };

  const handleDeleteBudgetLine = async (destinationId: string, lineId: string) => {
    if (!confirm("Delete this budget line?")) return;

    try {
      const response = await axios.delete(
        `/api/budgets/destination/${destinationId}?action=delete-line&lineId=${lineId}`,
        { withCredentials: true }
      );
      setTripBudget(response.data);
      fetchStats();
    } catch (err) {
      console.error("Error deleting budget line:", err);
      setError("Failed to delete budget line");
    }
  };

  if (status === "loading") {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <button
          onClick={() => signIn()}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Sign in
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Link href="/">
          <button className="mb-4 px-4 py-2 text-gray-600 hover:text-gray-900">← Back</button>
        </Link>

        <h1 className="text-3xl font-bold text-gray-800 mb-8">💰 Trip Budget & Allocation</h1>

        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* Trip Budget Overview */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Overall Trip Budget</h2>

          {budgetStats && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded">
                <p className="text-gray-600 text-sm font-medium">Total Budget</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">
                  {currency} {(budgetStats?.totalBudget || 0).toFixed(2)}
                </p>
              </div>
              <div className="bg-green-50 p-4 rounded">
                <p className="text-gray-600 text-sm font-medium">Allocated</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {currency} {(budgetStats?.totalAllocated || 0).toFixed(2)}
                </p>
              </div>
              <div className={`p-4 rounded ${(budgetStats?.unallocated || 0) >= 0 ? "bg-orange-50" : "bg-red-50"}`}>
                <p className="text-gray-600 text-sm font-medium">Unallocated</p>
                <p className={`text-2xl font-bold mt-1 ${(budgetStats?.unallocated || 0) >= 0 ? "text-orange-600" : "text-red-600"}`}>
                  {currency} {Math.abs(budgetStats?.unallocated || 0).toFixed(2)}
                </p>
              </div>
              <div className="bg-purple-50 p-4 rounded">
                <p className="text-gray-600 text-sm font-medium">Actual Spent</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">
                  {currency} {(budgetStats?.totalActual || 0).toFixed(2)}
                </p>
              </div>
              <div className="bg-indigo-50 p-4 rounded">
                <p className="text-gray-600 text-sm font-medium">Usage %</p>
                <p className="text-2xl font-bold text-indigo-600 mt-1">
                  {(budgetStats?.percentageUsed || 0).toFixed(1)}%
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSaveTripBudget} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Budget
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={totalBudget}
                  onChange={(e) => setTotalBudget(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option>EUR</option>
                  <option>EUR</option>
                  <option>GBP</option>
                  <option>AUD</option>
                  <option>CAD</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any budget notes..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? "Saving..." : tripBudget ? "Update Budget" : "Create Budget"}
            </button>
          </form>
        </div>

        {tripBudget && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">Destination Budgets</h2>

            {destinations.map((destination) => {
              const destBudget = tripBudget.destinationBudgets.find(
                (db) => db.destinationId === destination.id
              );
              const destActuals = destinationActuals[destination.id] || {
                expenseLines: {},
                activityLines: {},
                totalActualSpent: 0,
              };
              const manualActual = destBudget?.lines.reduce((sum, line) => sum + line.actualAmount, 0) || 0;
              const totalActual = manualActual + destActuals.totalActualSpent;
              const totalAllocated = destBudget?.totalBudget || 0;

              return (
                <div key={destination.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">
                        📍 {destination.name}
                      </h3>
                      <p className="text-gray-600">
                        {destination.place}, {destination.country}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Budget</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {currency} {totalAllocated.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {destBudget ? (
                    <div className="space-y-4">
                      {/* Budget Lines */}
                      <div className="bg-gray-50 rounded p-4">
                        <h4 className="font-semibold text-gray-800 mb-3">Cost Breakdown:</h4>
                        {destBudget.lines.length === 0 ? (
                          <p className="text-gray-600 text-sm">No budget lines added yet</p>
                        ) : (
                          <div className="space-y-2">
                            {destBudget.lines.map((line) => (
                              <div
                                key={line.id}
                                className="flex justify-between items-center bg-white p-3 rounded"
                              >
                                <div className="flex-1">
                                  <span
                                    className={`inline-block px-2 py-1 rounded text-xs font-medium capitalize mr-2 ${
                                      categoryColors[line.category]
                                    }`}
                                  >
                                    {line.category}
                                  </span>
                                  {line.notes && (
                                    <span className="text-gray-600 text-sm">{line.notes}</span>
                                  )}
                                </div>
                                <div className="text-right mr-2">
                                  <p className="text-sm text-gray-600">
                                    Budget: {currency} {line.budgetAmount.toFixed(2)}
                                  </p>
                                  <p className="text-sm font-semibold text-gray-900">
                                    Spent: {currency} {line.actualAmount.toFixed(2)}
                                  </p>
                                </div>
                                <button
                                  onClick={() => handleDeleteBudgetLine(destination.id, line.id)}
                                  className="text-red-500 hover:text-red-600 font-medium text-sm"
                                >
                                  Delete
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Expenses by Category */}
                      {Object.keys(destActuals.expenseLines).length > 0 && (
                        <div className="bg-orange-50 rounded p-4 border border-orange-200">
                          <h4 className="font-semibold text-gray-800 mb-3">💰 Expenses by Category:</h4>
                          <div className="space-y-2">
                            {Object.entries(destActuals.expenseLines).map(
                              ([category, amount]) => (
                                <div
                                  key={`expense-${category}`}
                                  className="flex justify-between items-center bg-white p-3 rounded"
                                >
                                  <span
                                    className={`inline-block px-2 py-1 rounded text-xs font-medium capitalize ${
                                      categoryColors[category]
                                    }`}
                                  >
                                    {category}
                                  </span>
                                  <p className="text-sm font-semibold text-gray-900">
                                    {currency} {amount.toFixed(2)}
                                  </p>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}

                      {/* Activities by Category */}
                      {Object.keys(destActuals.activityLines).length > 0 && (
                        <div className="bg-green-50 rounded p-4 border border-green-200">
                          <h4 className="font-semibold text-gray-800 mb-3">🎯 Activities (Estimated Cost) by Category:</h4>
                          <div className="space-y-2">
                            {Object.entries(destActuals.activityLines).map(
                              ([category, amount]) => (
                                <div
                                  key={`activity-${category}`}
                                  className="flex justify-between items-center bg-white p-3 rounded"
                                >
                                  <span
                                    className={`inline-block px-2 py-1 rounded text-xs font-medium capitalize ${
                                      categoryColors[category]
                                    }`}
                                  >
                                    {category}
                                  </span>
                                  <p className="text-sm font-semibold text-gray-900">
                                    {currency} {amount.toFixed(2)}
                                  </p>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}

                      {/* Add Budget Line Button */}
                      {showAddLine === destination.id ? (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleAddBudgetLine(destination.id);
                          }}
                          className="bg-blue-50 p-4 rounded space-y-3"
                        >
                          <div className="grid grid-cols-3 gap-2">
                            <select
                              value={newLineCategory}
                              onChange={(e) => setNewLineCategory(e.target.value)}
                              className="px-2 py-1 border border-gray-300 rounded text-sm"
                            >
                              <option value="accommodation">Accommodation</option>
                              <option value="food">Food</option>
                              <option value="transport">Transport</option>
                              <option value="activity">Activity</option>
                              <option value="shopping">Shopping</option>
                              <option value="other">Other</option>
                            </select>
                            <input
                              type="number"
                              step="0.01"
                              value={newLineBudget}
                              onChange={(e) => setNewLineBudget(e.target.value)}
                              placeholder="Amount"
                              className="px-2 py-1 border border-gray-300 rounded text-sm"
                              required
                            />
                            <input
                              type="text"
                              value={newLineNotes}
                              onChange={(e) => setNewLineNotes(e.target.value)}
                              placeholder="Notes (optional)"
                              className="px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="submit"
                              className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600"
                            >
                              Add
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowAddLine(null)}
                              className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        <button
                          onClick={() => setShowAddLine(destination.id)}
                          className="w-full px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                        >
                          + Add Cost Line
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-gray-600 mb-3">No budget allocated for this destination</p>
                      {editingDestId === destination.id ? (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleAddDestinationBudget(destination.id);
                          }}
                          className="flex gap-2 justify-center"
                        >
                          <input
                            type="number"
                            step="0.01"
                            value={destBudgetAmount}
                            onChange={(e) => setDestBudgetAmount(e.target.value)}
                            placeholder="Budget amount"
                            className="px-3 py-1 border border-gray-300 rounded"
                            required
                          />
                          <button
                            type="submit"
                            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                          >
                            Add
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingDestId(null);
                              setDestBudgetAmount("");
                            }}
                            className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
                          >
                            Cancel
                          </button>
                        </form>
                      ) : (
                        <button
                          onClick={() => setEditingDestId(destination.id)}
                          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                        >
                          Allocate Budget
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!tripBudget && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-600 mb-4">Create a trip budget to get started!</p>
            <button
              onClick={() => setTotalBudget("1000")}
              className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Create Budget
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session) {
    return {
      redirect: {
        destination: `/login?callbackUrl=${encodeURIComponent(context.req.url || "/budgets")}`,
        permanent: false,
      },
    };
  }

  // Skip data fetching if Cosmos DB env vars are not available (build time)
  if (!process.env.AZURE_COSMOS_ENDPOINT || !process.env.AZURE_COSMOS_KEY) {
    return {
      props: {
        initialTripBudget: null,
        initialDestinations: [],
      },
    };
  }

  try {
    const [tripBudget, allDestinations] = await Promise.all([
      budgetApi.getTripBudget(),
      destinationApi.getDestinations(),
    ]);

    const serializedTripBudget = tripBudget
      ? {
          ...tripBudget,
          createdAt: tripBudget.createdAt?.toISOString?.() || tripBudget.createdAt,
          updatedAt: tripBudget.updatedAt?.toISOString?.() || tripBudget.updatedAt,
          destinationBudgets: tripBudget.destinationBudgets.map((db) => ({
            ...db,
            createdAt: db.createdAt?.toISOString?.() || db.createdAt,
            updatedAt: db.updatedAt?.toISOString?.() || db.updatedAt,
          })),
        }
      : null;

    const serializedDestinations = allDestinations.map((dest) => ({
      ...dest,
      createdAt: dest.createdAt?.toISOString?.() || dest.createdAt,
      updatedAt: dest.updatedAt?.toISOString?.() || dest.updatedAt,
    }));

    return {
      props: {
        initialTripBudget: serializedTripBudget,
        initialDestinations: serializedDestinations,
      },
    };
  } catch (error) {
    console.error("Error fetching budget data:", error);
    return {
      props: {
        initialTripBudget: null,
        initialDestinations: [],
      },
    };
  }
};
