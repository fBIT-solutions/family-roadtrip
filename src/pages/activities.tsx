import React, { useState, useCallback, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import { getServerSession } from "next-auth/next";
import { useRouter } from "next/router";
import { authOptions } from "./api/auth/[...nextauth]";
import type { GetServerSideProps } from "next";
import Link from "next/link";
import axios from "axios";
import { Activity, Destination, FileMetadata, Trip } from "@/types/schema";
import * as activitiesApi from "@/api/activities";
import * as destinationApi from "@/api/destinations";
import * as tripsApi from "@/api/trips";
import { ActivityRecommendations } from "@/components/ActivityRecommendations";
import { QuickFileLinks } from "@/components/QuickFileLinks";

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
  initialTrip = null,
  allTrips: initialAllTrips = [],
}: {
  initialActivities?: Activity[];
  initialDestinations?: Destination[];
  initialTrip?: Trip | null;
  allTrips?: Trip[];
}) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { tripId: queryTripId } = router.query;
  
  const [tripId, setTripId] = useState<string | null>(initialTrip?.id || null);
  const [trip, setTrip] = useState<Trip | null>(initialTrip);
  const [availableTrips, setAvailableTrips] = useState<Trip[]>(initialAllTrips);
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
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [activityDestination, setActivityDestination] = useState<string>(""); // For editing/creating activities

  const fetchActivities = useCallback(async () => {
    try {
      // Build URL with trip and destination filters
      const params = new URLSearchParams();
      if (tripId) params.append("tripId", tripId);
      if (selectedDestination) params.append("destinationId", selectedDestination);
      
      const url = `/api/activities${params.toString() ? "?" + params.toString() : ""}`;
      const [activitiesRes, filesRes] = await Promise.all([
        axios.get(url),
        axios.get("/api/files", { withCredentials: true }),
      ]);
      setActivities(activitiesRes.data);
      setFiles(filesRes.data);
    } catch (err) {
      console.error("Error fetching activities:", err);
      setError("Failed to fetch activities");
    }
  }, [selectedDestination, tripId]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Handle trip selection from URL or dropdown
  useEffect(() => {
    if (queryTripId && typeof queryTripId === "string" && queryTripId !== tripId) {
      setTripId(queryTripId);
      // Fetch trip data and its destinations
      const fetchTripData = async () => {
        try {
          const tripResponse = await axios.get(`/api/trips/${queryTripId}`);
          setTrip(tripResponse.data.trip);
        } catch (err) {
          console.error("Error fetching trip:", err);
        }
      };
      fetchTripData();
    }
  }, [queryTripId]);

  const getDestinationName = (destId: string): string => {
    const dest = destinations.find((d) => d.id === destId);
    return dest?.name || destId;
  };

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name) {
      setError("Activity name is required");
      return;
    }

    if (!activityDestination && !tripId) {
      setError("Please select either a trip or a destination");
      return;
    }

    setLoading(true);

    try {
      if (editingId) {
        // Update existing activity - include destination if provided
        await axios.put(`/api/activities/${editingId}`, {
          name,
          description: description || undefined,
          category,
          url: url || undefined,
          estimatedCost: estimatedCost ? parseFloat(estimatedCost) : undefined,
          duration: duration || undefined,
          destinationId: activityDestination || undefined, // Allow updating destination
        });
        fetchActivities();
        setEditingId(null);
      } else {
        // Create new activity
        const response = await axios.post("/api/activities", {
          name,
          destinationId: activityDestination || undefined,
          tripId: tripId || undefined,
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
      setActivityDestination("");
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
    setActivityDestination(activity.destinationId || ""); // Include destination in edit
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

  // Filter activities based on selected destination, or show all if none selected
  const filteredActivities = selectedDestination
    ? activities.filter((a) => a.destinationId === selectedDestination)
    : activities;

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

        {/* Trip Selector */}
        {availableTrips.length > 0 && (
          <div className="mb-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📍 Select Trip
            </label>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => {
                  setTripId(null);
                  setTrip(null);
                  setDestinations([]);
                  setSelectedDestination("");
                  router.push("/activities");
                }}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  !tripId
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                }`}
              >
                All Trips
              </button>
              {availableTrips.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setTripId(t.id);
                    setTrip(t);
                    router.push(`/activities?tripId=${t.id}`);
                  }}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    tripId === t.id
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Destination Filter */}
        {destinations.length > 0 && (
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Destination (optional - filter activities)
            </label>
            <select
              value={selectedDestination}
              onChange={(e) => setSelectedDestination(e.target.value)}
              className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- All destinations --</option>
              {destinations.map((dest) => (
                <option key={dest.id} value={dest.id}>
                  {dest.name} {dest.country ? `(${dest.country})` : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Activity Form */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            {editingId ? "✏️ Edit Activity" : "➕ Add New Activity"}
          </h2>

          {trip && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>Trip:</strong> {trip.name} • Adding activities to this trip
              </p>
            </div>
          )}

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
                  Destination {trip ? "(optional)" : "(optional - required when no trip selected)"}
                </label>
                <select
                  value={activityDestination}
                  onChange={(e) => setActivityDestination(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- No destination --</option>
                  {destinations.length > 0 ? (
                    destinations.map((dest) => (
                      <option key={dest.id} value={dest.id}>
                        {dest.name} {dest.country ? `(${dest.country})` : ""}
                      </option>
                    ))
                  ) : (
                    <option disabled>No destinations in this trip</option>
                  )}
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
                    setActivityDestination("");
                  }}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

            {/* AI Recommendations - Only show when a destination is selected */}
            {selectedDestination && (
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
                      tripId: tripId || undefined,
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
            )}

            {/* Activities List */}
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">
                  {selectedDestination 
                    ? `Activities in ${getDestinationName(selectedDestination)}`
                    : tripId
                    ? `Activities for ${trip?.name || "this trip"}`
                    : "All Activities"}
                </h2>
                <span className="text-gray-600 text-sm">
                  {filteredActivities.length} activity{filteredActivities.length !== 1 ? "ies" : ""}
                </span>
              </div>

              {filteredActivities.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-6 text-center text-gray-600">
                  <p className="mb-2">No activities added yet.</p>
                  <p className="text-sm">Add one using the form above!</p>
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
                          <div className="flex items-center gap-2">
                            <h3 className="text-xl font-bold text-gray-900">{activity.name}</h3>
                            {activity.destinationId && (
                              <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                @ {getDestinationName(activity.destinationId)}
                              </span>
                            )}
                          </div>
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

                      <QuickFileLinks 
                        files={files.filter(f => f.activityId === activity.id)} 
                      />

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

  const { tripId } = context.query;

  try {
    const promises: Promise<any>[] = [
      activitiesApi.getActivities(),
      destinationApi.getDestinations(),
      tripsApi.getTrips(),
    ];

    const [allActivities, destinationsList, allTrips] = await Promise.all(promises);

    let selectedTrip = null;
    let tripDestinations = destinationsList;

    // If tripId is provided, filter to that trip
    if (tripId && typeof tripId === "string") {
      try {
        selectedTrip = allTrips.find((t: Trip) => t.id === tripId) || null;
        if (selectedTrip) {
          // Filter destinations to only this trip's destinations
          tripDestinations = destinationsList.filter((d: Destination) => d.tripId === tripId);
        }
      } catch (err) {
        console.error("Error fetching trip:", err);
      }
    }

    // Serialize dates to ISO strings for JSON
    const serializedActivities = allActivities.map((activity: Activity) => ({
      ...activity,
      createdAt: activity.createdAt?.toISOString?.() || activity.createdAt,
      updatedAt: activity.updatedAt?.toISOString?.() || activity.updatedAt,
    }));

    const serializedDestinations = tripDestinations.map((dest: Destination) => ({
      ...dest,
      createdAt: dest.createdAt?.toISOString?.() || dest.createdAt,
      updatedAt: dest.updatedAt?.toISOString?.() || dest.updatedAt,
    }));

    const serializedTrips = allTrips.map((trip: Trip) => ({
      ...trip,
      startDate: trip.startDate?.toISOString?.() || trip.startDate,
      endDate: trip.endDate?.toISOString?.() || trip.endDate,
      createdAt: trip.createdAt?.toISOString?.() || trip.createdAt,
      updatedAt: trip.updatedAt?.toISOString?.() || trip.updatedAt,
    }));

    const serializedTrip = selectedTrip ? {
      ...selectedTrip,
      startDate: selectedTrip.startDate?.toISOString?.() || selectedTrip.startDate,
      endDate: selectedTrip.endDate?.toISOString?.() || selectedTrip.endDate,
      createdAt: selectedTrip.createdAt?.toISOString?.() || selectedTrip.createdAt,
      updatedAt: selectedTrip.updatedAt?.toISOString?.() || selectedTrip.updatedAt,
    } : null;

    return {
      props: {
        initialActivities: serializedActivities,
        initialDestinations: serializedDestinations,
        initialTrip: serializedTrip,
        allTrips: serializedTrips,
      },
    };
  } catch (error) {
    console.error("Error fetching data in getServerSideProps:", error);
    return {
      props: {
        initialActivities: [],
        initialDestinations: [],
        initialTrip: null,
        allTrips: [],
      },
    };
  }
};
