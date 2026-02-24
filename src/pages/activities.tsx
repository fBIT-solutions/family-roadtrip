import React, { useState, useCallback, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./api/auth/[...nextauth]";
import type { GetServerSideProps } from "next";
import Link from "next/link";
import axios from "axios";
import { Activity, Destination } from "@/types/schema";
import * as activitiesApi from "@/api/activities";
import * as destinationApi from "@/api/destinations";
import { ActivityRecommendations } from "@/components/ActivityRecommendations";

const activityCategoryColors: Record<string, string> = {
  outdoor: "bg-green-100 text-green-800",
  cultural: "bg-purple-100 text-purple-800",
  food: "bg-orange-100 text-orange-800",
  nightlife: "bg-pink-100 text-pink-800",
  shopping: "bg-blue-100 text-blue-800",
  sports: "bg-red-100 text-red-800",
  relaxation: "bg-sky-100 text-sky-800",
  adventure: "bg-yellow-100 text-yellow-800",
  other: "bg-gray-100 text-gray-800",
};

const statusColors: Record<string, string> = {
  suggested: "bg-gray-200 text-gray-800",
  planned: "bg-blue-200 text-blue-800",
  completed: "bg-green-200 text-green-800",
  cancelled: "bg-red-200 text-red-800",
};

export default function Activities({
  initialActivities = [],
  initialDestinations = [],
}: {
  initialActivities?: Activity[];
  initialDestinations?: Destination[];
}) {
  const { data: session, status } = useSession();
  const [activities, setActivities] = useState<Activity[]>(initialActivities);
  const [destinations, setDestinations] = useState<Destination[]>(initialDestinations);
  const [selectedDestination, setSelectedDestination] = useState<string>(
    initialDestinations?.[0]?.id || ""
  );
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<"outdoor" | "cultural" | "food" | "nightlife" | "shopping" | "sports" | "relaxation" | "adventure" | "other">("outdoor");
  const [url, setUrl] = useState("");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [duration, setDuration] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchActivities = useCallback(async () => {
    if (!selectedDestination) return;
    try {
      const response = await axios.get(
        `/api/activities?destinationId=${selectedDestination}`
      );
      setActivities(response.data);
    } catch (err) {
      console.error("Error fetching activities:", err);
      setError("Failed to fetch activities");
    }
  }, [selectedDestination]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const getDestinationName = (destId: string): string => {
    const dest = destinations.find((d) => d.id === destId);
    return dest?.name || destId;
  };

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !selectedDestination) {
      setError("Activity name and destination are required");
      return;
    }

    setLoading(true);

    try {
      if (editingId) {
        // Update existing activity
        await axios.put(`/api/activities/${editingId}`, {
          name,
          description: description || undefined,
          category,
          url: url || undefined,
          estimatedCost: estimatedCost ? parseFloat(estimatedCost) : undefined,
          duration: duration || undefined,
        });
        fetchActivities();
        setEditingId(null);
      } else {
        // Create new activity
        const response = await axios.post("/api/activities", {
          name,
          destinationId: selectedDestination,
          description: description || undefined,
          category,
          url: url || undefined,
          estimatedCost: estimatedCost ? parseFloat(estimatedCost) : undefined,
          duration: duration || undefined,
        });
        setActivities([response.data, ...activities]);
      }

      // Reset form
      setName("");
      setDescription("");
      setCategory("outdoor");
      setUrl("");
      setEstimatedCost("");
      setDuration("");
      setError(null);
    } catch (err) {
      console.error("Error saving activity:", err);
      setError("Failed to save activity");
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (activity: Activity) => {
    try {
      const response = await axios.put(`/api/activities/${activity.id}?action=vote`);
      setActivities(
        activities.map((a) => (a.id === activity.id ? response.data : a))
      );
    } catch (err) {
      console.error("Error voting on activity:", err);
      setError("Failed to vote");
    }
  };

  const handleStatusChange = async (activity: Activity, newStatus: string) => {
    try {
      const response = await axios.put(
        `/api/activities/${activity.id}?action=status`,
        { status: newStatus }
      );
      setActivities(
        activities.map((a) => (a.id === activity.id ? response.data : a))
      );
    } catch (err) {
      console.error("Error updating activity status:", err);
      setError("Failed to update status");
    }
  };

  const handleEdit = (activity: Activity) => {
    setName(activity.name);
    setDescription(activity.description || "");
    setCategory(activity.category);
    setUrl(activity.url || "");
    setEstimatedCost(activity.estimatedCost?.toString() || "");
    setDuration(activity.duration || "");
    setEditingId(activity.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this activity?")) return;

    try {
      await axios.delete(`/api/activities/${id}`);
      setActivities(activities.filter((a) => a.id !== id));
    } catch (err) {
      console.error("Error deleting activity:", err);
      setError("Failed to delete activity");
    }
  };

  const filteredActivities = activities.filter(
    (a) => a.destinationId === selectedDestination
  );

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
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Link href="/">
          <button className="mb-4 px-4 py-2 text-gray-600 hover:text-gray-900">
            ← Back
          </button>
        </Link>

        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">🎯 Activities & Things to Do</h1>
          <Link href="/preferences">
            <button className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition">
              ⚙️ Preferences
            </button>
          </Link>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* Destination Filter */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Destination
          </label>
          <select
            value={selectedDestination}
            onChange={(e) => setSelectedDestination(e.target.value)}
            className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- Choose a destination --</option>
            {destinations.map((dest) => (
              <option key={dest.id} value={dest.id}>
                {dest.name} {dest.country ? `(${dest.country})` : ""}
              </option>
            ))}
          </select>
        </div>

        {selectedDestination && (
          <>
            {/* Activity Form */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                {editingId ? "Edit Activity" : "Add New Activity"}
              </h2>

              <form onSubmit={handleAddActivity}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Activity Name *
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g., Eiffel Tower Visit"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
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
                      <option value="outdoor">Outdoor</option>
                      <option value="cultural">Cultural</option>
                      <option value="food">Food & Dining</option>
                      <option value="nightlife">Nightlife</option>
                      <option value="shopping">Shopping</option>
                      <option value="sports">Sports</option>
                      <option value="relaxation">Relaxation</option>
                      <option value="adventure">Adventure</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Duration (optional)
                    </label>
                    <input
                      type="text"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      placeholder="e.g., 2 hours, half-day"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Estimated Cost (optional)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={estimatedCost}
                      onChange={(e) => setEstimatedCost(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      URL (optional, link to Google Maps, TripAdvisor, etc)
                    </label>
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (optional)
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What's this activity about?"
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
                    {loading ? "Saving..." : editingId ? "Update Activity" : "Add Activity"}
                  </button>
                  {editingId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(null);
                        setName("");
                        setDescription("");
                        setCategory("outdoor");
                        setUrl("");
                        setEstimatedCost("");
                        setDuration("");
                      }}
                      className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* AI Recommendations */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <ActivityRecommendations
                destinationId={selectedDestination}
                destinationName={getDestinationName(selectedDestination)}
                budget={50}
                currency="EUR"
                onAddActivity={async (activity) => {
                  try {
                    const response = await axios.post("/api/activities", {
                      name: activity.name,
                      destinationId: selectedDestination,
                      description: activity.description || undefined,
                      category: activity.category,
                      url: activity.url || undefined,
                      estimatedCost: activity.estimatedCost,
                      currency: activity.currency || "EUR",
                      duration: activity.duration || undefined,
                    });
                    setActivities([response.data, ...activities]);
                  } catch (err) {
                    console.error("Error adding recommended activity:", err);
                    throw err;
                  }
                }}
              />
            </div>

            {/* Activities List */}
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">
                  Activities in {getDestinationName(selectedDestination)}
                </h2>
                <span className="text-gray-600 text-sm">
                  {filteredActivities.length} activity{filteredActivities.length !== 1 ? "ies" : ""}
                </span>
              </div>

              {filteredActivities.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-6 text-center text-gray-600">
                  No activities added yet. Add one above!
                </div>
              ) : (
                filteredActivities
                  .sort((a, b) => b.votes - a.votes) // Sort by votes descending
                  .map((activity) => (
                    <div
                      key={activity.id}
                      className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-gray-900">{activity.name}</h3>
                          {activity.description && (
                            <p className="text-gray-600 mt-2">{activity.description}</p>
                          )}
                        </div>
                        <div className="text-right ml-4">
                          <select
                            value={activity.status}
                            onChange={(e) => handleStatusChange(activity, e.target.value)}
                            className={`px-3 py-1 rounded text-sm font-medium ${
                              statusColors[activity.status]
                            } border-0 focus:outline-none`}
                          >
                            <option value="suggested">Suggested</option>
                            <option value="planned">Planned</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-4">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-medium capitalize ${
                            activityCategoryColors[activity.category]
                          }`}
                        >
                          {activity.category}
                        </span>
                        {activity.duration && (
                          <span className="inline-block px-3 py-1 bg-gray-200 text-gray-800 rounded-full text-xs font-medium">
                            ⏱️ {activity.duration}
                          </span>
                        )}
                        {activity.estimatedCost && (
                          <span className="inline-block px-3 py-1 bg-green-200 text-green-800 rounded-full text-xs font-medium">
                            💰 {activity.currency} {activity.estimatedCost.toFixed(2)}
                          </span>
                        )}
                      </div>

                      {activity.url && (
                        <div className="mb-4">
                          <a
                            href={activity.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:text-blue-700 text-sm font-medium"
                          >
                            🔗 View on Maps/TripAdvisor →
                          </a>
                        </div>
                      )}

                      <div className="border-t border-gray-200 pt-4 flex items-center justify-between">
                        <div className="flex gap-4">
                          <button
                            onClick={() => handleVote(activity)}
                            className={`px-4 py-2 rounded font-medium transition-colors ${
                              activity.votedBy.includes(session?.user?.email || "")
                                ? "bg-blue-500 text-white hover:bg-blue-600"
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                          >
                            👍 {activity.votes} votes
                          </button>
                          <button
                            onClick={() => handleEdit(activity)}
                            className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(activity.id)}
                            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 font-medium"
                          >
                            Delete
                          </button>
                        </div>
                        <div className="text-sm text-gray-500">
                          Added by {activity.addedBy}
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </>
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
        destination: `/login?callbackUrl=${encodeURIComponent(context.req.url || "/activities")}`,
        permanent: false,
      },
    };
  }

  try {
    const [allActivities, destinationsList] = await Promise.all([
      activitiesApi.getActivities(),
      destinationApi.getDestinations(),
    ]);

    // Serialize dates to ISO strings for JSON
    const serializedActivities = allActivities.map((activity) => ({
      ...activity,
      createdAt: activity.createdAt?.toISOString?.() || activity.createdAt,
      updatedAt: activity.updatedAt?.toISOString?.() || activity.updatedAt,
    }));

    const serializedDestinations = destinationsList.map((dest) => ({
      ...dest,
      createdAt: dest.createdAt?.toISOString?.() || dest.createdAt,
      updatedAt: dest.updatedAt?.toISOString?.() || dest.updatedAt,
    }));

    return {
      props: {
        initialActivities: serializedActivities,
        initialDestinations: serializedDestinations,
      },
    };
  } catch (error) {
    console.error("Error fetching data in getServerSideProps:", error);
    return {
      props: {
        initialActivities: [],
        initialDestinations: [],
      },
    };
  }
};
