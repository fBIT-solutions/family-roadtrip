import React, { useState, useEffect, useCallback } from "react";
import { useSession, signIn } from "next-auth/react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./api/auth/[...nextauth]";
import type { GetServerSideProps } from "next";
import Link from "next/link";
import axios from "axios";
import { Expense, Destination } from "@/types/schema";
import * as expenseApi from "@/api/expenses";
import * as destinationApi from "@/api/destinations";

const categoryColors: Record<string, string> = {
  accommodation: "bg-blue-100 text-blue-800",
  food: "bg-orange-100 text-orange-800",
  transport: "bg-purple-100 text-purple-800",
  activity: "bg-green-100 text-green-800",
  shopping: "bg-pink-100 text-pink-800",
  other: "bg-gray-100 text-gray-800",
};

export default function Expenses({
  initialExpenses = [],
  initialDestinations = [],
}: {
  initialExpenses?: Expense[];
  initialDestinations?: Destination[];
}) {
  const { data: session, status } = useSession();
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [destinations, setDestinations] = useState<Destination[]>(initialDestinations);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [category, setCategory] = useState<"accommodation" | "food" | "transport" | "activity" | "shopping" | "other">("other");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [selectedDestination, setSelectedDestination] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchExpenses = useCallback(async () => {
    try {
      const response = await axios.get("/api/expenses", {
        withCredentials: true,
      });
      setExpenses(response.data);
      setError(null);
    } catch (err) {
      console.error("Error fetching expenses:", err);
      setError("Failed to load expenses");
    }
  }, []);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !amount) {
      setError("Please fill in all required fields");
      return;
    }

    try {
      setLoading(true);
      if (editingId) {
        // Update existing expense
        await axios.put(`/api/expenses/${editingId}`, {
          title,
          amount: parseFloat(amount),
          currency,
          category,
          date: new Date(date),
          paidBy: session?.user?.email,
          destination: selectedDestination || undefined,
          notes: notes || undefined,
        });
        fetchExpenses();
        setEditingId(null);
      } else {
        // Create new expense
        const response = await axios.post("/api/expenses", {
          title,
          amount: parseFloat(amount),
          currency,
          category,
          date: new Date(date),
          paidBy: session?.user?.email,
          destination: selectedDestination || undefined,
          notes: notes || undefined,
        });
        setExpenses([response.data, ...expenses]);
      }

      // Reset form
      setTitle("");
      setAmount("");
      setCurrency("EUR");
      setCategory("other");
      setDate(new Date().toISOString().split("T")[0]);
      setNotes("");
      setSelectedDestination("");
      setError(null);
    } catch (err) {
      console.error("Error saving expense:", err);
      setError("Failed to save expense");
    } finally {
      setLoading(false);
    }
  };

  const getDestinationName = (destId?: string): string => {
    if (!destId) return "-";
    const dest = destinations.find((d) => d.id === destId);
    return dest ? dest.name : "-";
  };

  const handleEdit = (expense: Expense) => {
    setTitle(expense.title);
    setAmount(expense.amount.toString());
    setCurrency(expense.currency);
    setCategory(expense.category);
    setDate(new Date(expense.date).toISOString().split("T")[0]);
    setNotes(expense.notes || "");
    setSelectedDestination(expense.destinationId || "");
    setEditingId(expense.id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this expense?")) return;

    try {
      await axios.delete(`/api/expenses/${id}`);
      setExpenses(expenses.filter((e) => e.id !== id));
    } catch (err) {
      console.error("Error deleting expense:", err);
      setError("Failed to delete expense");
    }
  };

  const calculateTotals = () => {
    const byCategory: Record<string, number> = {};
    let total = 0;

    expenses.forEach((expense) => {
      byCategory[expense.category] = (byCategory[expense.category] || 0) + expense.amount;
      total += expense.amount;
    });

    return { byCategory, total };
  };

  const { byCategory, total } = calculateTotals();

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

        <h1 className="text-3xl font-bold text-gray-800 mb-8">💰 Expense & Budget Tracker</h1>

        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm font-medium">Total Expenses</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {currency} {total.toFixed(2)}
            </p>
          </div>

          {Object.entries(byCategory).map(([cat, amount]) => (
            <div key={cat} className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600 text-sm font-medium capitalize">{cat}</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {currency} {amount.toFixed(2)}
              </p>
            </div>
          ))}
        </div>

        {/* Add Expense Form */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            {editingId ? "Edit Expense" : "Add New Expense"}
          </h2>

          <form onSubmit={handleAddExpense} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Hotel booking"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
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
                  <option>JPY</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="accommodation">Accommodation</option>
                  <option value="food">Food & Dining</option>
                  <option value="transport">Transport</option>
                  <option value="activity">Activity</option>
                  <option value="shopping">Shopping</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Destination (optional)
                </label>
                <select
                  value={selectedDestination}
                  onChange={(e) => setSelectedDestination(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Not linked to destination --</option>
                  {destinations.map((dest) => (
                    <option key={dest.id} value={dest.id}>
                      {dest.name}
                      {dest.country ? ` (${dest.country})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {loading ? "Saving..." : editingId ? "Update Expense" : "Add Expense"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setTitle("");
                    setAmount("");
                    setNotes("");
                    setSelectedDestination("");
                  }}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Expenses List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-800">
              Recent Expenses ({expenses.length})
            </h2>
          </div>

          {expenses.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-600">
              No expenses yet. Add one above to get started!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Destination
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Paid By
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense) => (
                    <tr key={expense.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {new Date(expense.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div>
                          <p className="font-medium">{expense.title}</p>
                          {expense.notes && (
                            <p className="text-gray-600 text-xs mt-1">{expense.notes}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-medium capitalize ${
                            categoryColors[expense.category]
                          }`}
                        >
                          {expense.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {getDestinationName(expense.destinationId)}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                        {expense.currency} {expense.amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {expense.paidBy}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(expense)}
                            className="text-blue-500 hover:text-blue-600 font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(expense.id)}
                            className="text-red-500 hover:text-red-600 font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session) {
    return {
      redirect: {
        destination: `/login?callbackUrl=${encodeURIComponent(context.req.url || "/expenses")}`,
        permanent: false,
      },
    };
  }

  // Skip data fetching if Cosmos DB env vars are not available (build time)
  if (!process.env.AZURE_COSMOS_ENDPOINT || !process.env.AZURE_COSMOS_KEY) {
    return {
      props: {
        initialExpenses: [],
        initialDestinations: [],
      },
    };
  }

  try {
    const [initialExpenses, destinationsList] = await Promise.all([
      expenseApi.getExpenses(),
      destinationApi.getDestinations(),
    ]);

    // Convert Date objects to ISO strings for serialization
    const serializedExpenses = initialExpenses.map((expense) => ({
      ...expense,
      date: expense.date?.toISOString?.() || expense.date,
      createdAt: expense.createdAt?.toISOString?.() || expense.createdAt,
      updatedAt: expense.updatedAt?.toISOString?.() || expense.updatedAt,
    }));

    const serializedDestinations = destinationsList.map((dest) => ({
      ...dest,
      createdAt: dest.createdAt?.toISOString?.() || dest.createdAt,
      updatedAt: dest.updatedAt?.toISOString?.() || dest.updatedAt,
    }));

    return {
      props: {
        initialExpenses: serializedExpenses,
        initialDestinations: serializedDestinations,
      },
    };
  } catch (error) {
    console.error("Error fetching expenses in getServerSideProps:", error);
    return {
      props: {
        initialExpenses: [],
        initialDestinations: [],
      },
    };
  }
};
