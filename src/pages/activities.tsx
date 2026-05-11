import React, { useState, useCallback, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import { getServerSession } from "next-auth/next";
import { useRouter } from "next/router";
import { authOptions } from "./api/auth/[...nextauth]";
import type { GetServerSideProps } from "next";
import Link from "next/link";
import axios from "axios";
import { Activity, Destination, FileMetadata, Trip, ItemReference } from "@/types/schema";
import { ACTIVITY_CATEGORY_COLORS, ACTIVITY_STATUS_COLORS, getActivityCategoryColor, getActivityStatusColor } from "@/lib/constants";
import { useCoordinateFetcher } from "@/hooks/useCoordinateFetcher";
import { canViewTrip } from "@/lib/auth-helpers";
import * as activitiesApi from "@/api/activities";
import * as destinationApi from "@/api/destinations";
import * as tripsApi from "@/api/trips";
import { isViewer } from "@/lib/auth-helpers";
import { toast } from "sonner";
import { ActivityRecommendations } from "@/components/ActivityRecommendations";
import { QuickFileLinks } from "@/components/QuickFileLinks";
import { Topbar } from "@/components/Topbar";

export default function Activities({
  initialActivities = [],
  initialDestinations = [],
  initialTrip = null,
  allTrips: initialAllTrips = [],
  initialItemReferences = [],
}: {
  initialActivities?: Activity[];
  initialDestinations?: Destination[];
  initialTrip?: Trip | null;
  allTrips?: Trip[];
  initialItemReferences?: ItemReference[];
}) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { tripId: queryTripId, destinationId: queryDestinationId } = router.query;
  
  const [tripId, setTripId] = useState<string | null>(initialTrip?.id || null);
  const [trip, setTrip] = useState<Trip | null>(initialTrip);
  const [availableTrips, setAvailableTrips] = useState<Trip[]>(initialAllTrips);
  const [activities, setActivities] = useState<Activity[]>(initialActivities);
  const [itemReferences, setItemReferences] = useState<ItemReference[]>(initialItemReferences);
  const [destinations, setDestinations] = useState<Destination[]>(initialDestinations);
  const [selectedDestination, setSelectedDestination] = useState<string>(
    initialDestinations?.[0]?.id || ""
  );
  const [activityDestinationFromUrl] = useState<string>(
    typeof queryDestinationId === "string" ? queryDestinationId : ""
  );
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState(""); // City, venue, or address
  const [latitude, setLatitude] = useState<number | null>(null); // Activity location coordinates
  const [longitude, setLongitude] = useState<number | null>(null);
  const [mainPhotoUrl, setMainPhotoUrl] = useState(""); // Main photo URL
  const [category, setCategory] = useState<"outdoor" | "cultural" | "food" | "nightlife" | "shopping" | "sports" | "relaxation" | "adventure" | "other">("outdoor");
  const [url, setUrl] = useState("");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [duration, setDuration] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [activityDestination, setActivityDestination] = useState<string>(activityDestinationFromUrl); // Prefilled from URL if navigating from destination
  const [showTravelerModal, setShowTravelerModal] = useState(false);
  const [failedTripId, setFailedTripId] = useState<string | null>(null);
  const [failedTripName, setFailedTripName] = useState<string | null>(null);
  const [requestingTraveler, setRequestingTraveler] = useState(false);

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
      const { activities: fetchedActivities, itemReferences: fetchedReferences } = activitiesRes.data;
      setActivities(fetchedActivities || activitiesRes.data);
      setItemReferences(fetchedReferences || []);
      setFiles(filesRes.data);
    } catch (err) {
      console.error("Error fetching activities:", err);
      setError("Failed to fetch activities");
    }
  }, [selectedDestination, tripId]);

  // Fetch coordinates from API when location is provided
  const fetchCoordinates = useCoordinateFetcher((lat, lon) => {
    setLatitude(lat);
    setLongitude(lon);
  });

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

    if (!activityDestination) {
      setError("Please select a destination");
      return;
    }

    setLoading(true);

    try {
      // Fetch coordinates if location provided
      let finalLatitude = latitude;
      let finalLongitude = longitude;
      if (location && !latitude) {
        const coords = await fetchCoordinates(location);
        if (coords) {
          finalLatitude = coords.latitude;
          finalLongitude = coords.longitude;
        }
      }

      if (editingId) {
        // Update existing activity - include destination if provided
        await axios.put(`/api/activities/${editingId}`, {
          name,
          description: description || undefined,
          location: location || undefined,
          latitude: finalLatitude || undefined,
          longitude: finalLongitude || undefined,
          mainPhotoUrl: mainPhotoUrl || undefined,
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
          location: location || undefined,
          latitude: finalLatitude || undefined,
          longitude: finalLongitude || undefined,
          mainPhotoUrl: mainPhotoUrl || undefined,
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
      setLocation("");
      setLatitude(null);
      setLongitude(null);
      setMainPhotoUrl("");
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
    } catch (err: any) {
      const errorData = err?.response?.data;
      
      if (errorData?.reason === "GUEST_NOT_TRAVELER") {
        setFailedTripId(errorData.tripId);
        setFailedTripName(errorData.tripName);
        setShowTravelerModal(true);
        toast.info("Request access to this trip to vote on activities");
      } else {
        console.error("Error voting on activity:", err);
        setError(errorData?.error || "Failed to vote");
        toast.error(errorData?.error || "Failed to vote");
      }
    }
  };

  const handleRequestTraveler = async () => {
    if (!failedTripId) return;
    setRequestingTraveler(true);
    try {
      const response = await axios.post(`/api/trips/${failedTripId}/traveler-requests`);
      toast.success("Request submitted! Waiting for trip owner approval.");
      setShowTravelerModal(false);
      setFailedTripId(null);
      setFailedTripName(null);
    } catch (err: any) {
      const errorMsg = err?.response?.data?.error || "Failed to submit request";
      toast.error(errorMsg);
      console.error("Error submitting traveler request:", err);
    } finally {
      setRequestingTraveler(false);
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
    setLocation(activity.location || "");
    setLatitude((activity as any).latitude || null);
    setLongitude((activity as any).longitude || null);
    setMainPhotoUrl(activity.mainPhotoUrl || "");
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

  const handleTogglePublic = async (id: string) => {
    try {
      const activity = activities.find(a => a.id === id);
      if (!activity) return;
      
      const newPublicStatus = !activity.public;
      await axios.patch(`/api/activities/${id}/make-public`, { isPublic: newPublicStatus });
      
      setActivities(activities.map(a => 
        a.id === id ? { ...a, public: newPublicStatus } : a
      ));
    } catch (error) {
      console.error("Error toggling public status:", error);
    }
  };

  const handleAddPublicItem = async (itemRef: ItemReference) => {
    try {
      await axios.post("/api/item-references", {
        type: "activity",
        originalItemId: itemRef.originalItemId,
      });
      
      // Refresh data
      fetchActivities();
    } catch (error) {
      console.error("Error adding public activity:", error);
    }
  };

  // Filter activities based on selected destination, or show all if none selected
  const filteredActivities = selectedDestination
    ? activities.filter((a) => a.destinationId === selectedDestination)
    : activities;

  // Combine activities with referenced activities for display
  const allActivitiesForDisplay = [
    ...filteredActivities,
    ...itemReferences.filter(ref => ref.type === "activity").map(ref => ({
      ...ref,
      isReference: true,
    })),
  ];

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
      <Topbar />
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <Link href="/">
          <button className="mb-4 px-3 sm:px-4 py-2 text-sm sm:text-base text-gray-600 hover:text-gray-900">
            ← Back
          </button>
        </Link>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">🎯 Activities</h1>
          <Link href="/my-space" className="w-full sm:w-auto">
            <button className="w-full sm:w-auto px-4 py-2 text-sm sm:text-base rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition">
              🏠 My Space
            </button>
          </Link>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* Activity Form */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            {editingId ? "✏️ Edit Activity" : "➕ Add New Activity"}
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Activities require a destination but are independent of trips. You can add activities to any destination.
          </p>

          {trip && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>Current Trip:</strong> {trip.name}
              </p>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleAddActivity}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Destination * {activityDestinationFromUrl && <span className="text-sm text-green-600">(Prefilled from destination)</span>}
                </label>
                <select
                  value={activityDestination}
                  onChange={(e) => setActivityDestination(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">-- Select a destination --</option>
                  {destinations.length > 0 ? (
                    destinations.map((dest) => (
                      <option key={dest.id} value={dest.id}>
                        {dest.name} {dest.country ? `(${dest.country})` : ""}
                      </option>
                    ))
                  ) : (
                    <option disabled>No destinations available</option>
                  )}
                </select>
              </div>

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
                  Location (optional)
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., Paris, France or Champs-Élysées"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {latitude && longitude && (
                  <p className="text-xs text-green-600 mt-1">
                    ✓ Coordinates found: {latitude.toFixed(4)}, {longitude.toFixed(4)}
                  </p>
                )}
                {location && !latitude && !longitude && (
                  <p className="text-xs text-gray-500 mt-1">
                    Fetching coordinates...
                  </p>
                )}
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

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Photo URL (optional, main image for this activity)
                </label>
                <input
                  type="url"
                  value={mainPhotoUrl}
                  onChange={(e) => setMainPhotoUrl(e.target.value)}
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
                    setLocation("");
                    setLatitude(null);
                    setLongitude(null);
                    setMainPhotoUrl("");
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
                      location: activity.location || undefined,
                      latitude: (activity as any).latitude || undefined,
                      longitude: (activity as any).longitude || undefined,
                      mainPhotoUrl: activity.mainPhotoUrl || undefined,
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

        {/* Filters Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableTrips.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filter by Trip (optional)
                </label>
                <select
                  value={tripId || ""}
                  onChange={(e) => {
                    const newTripId = e.target.value || null;
                    setTripId(newTripId);
                    if (newTripId) {
                      router.push(`/activities?tripId=${newTripId}`);
                    } else {
                      router.push("/activities");
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- All trips --</option>
                  {availableTrips.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {destinations.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filter by Destination (optional)
                </label>
                <select
                  value={selectedDestination}
                  onChange={(e) => setSelectedDestination(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          </div>
        </div>
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
                  {allActivitiesForDisplay.length} activity{allActivitiesForDisplay.length !== 1 ? "ies" : ""}
                </span>
              </div>

              {allActivitiesForDisplay.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-6 text-center text-gray-600">
                  <p className="mb-2">No activities added yet.</p>
                  <p className="text-sm">Add one using the form above!</p>
                </div>
              ) : (
                allActivitiesForDisplay
                  .sort((a, b) => ('votes' in b ? b.votes : 0) - ('votes' in a ? a.votes : 0)) // Sort by votes descending
                  .map((activity) => {
                    const isOwnItem = 'addedBy' in activity && activity.addedBy === session?.user?.email;
                    const isReference = 'isReference' in activity && activity.isReference;
                    
                    return (
                      <div
                        key={activity.id}
                        className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow overflow-hidden"
                      >
                        {/* Activity Photo */}
                        {('mainPhotoUrl' in activity) && activity.mainPhotoUrl && (
                          <div className="mb-4 -mx-6 -mt-6 rounded-t-lg overflow-hidden">
                            <img
                              src={activity.mainPhotoUrl}
                              alt={activity.name}
                              className="w-full h-48 object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                        )}

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
                            {('location' in activity) && activity.location && (
                              <p className="text-sm text-gray-500 mt-1">📍 {activity.location}</p>
                            )}
                            {activity.description && (
                              <p className="text-gray-600 mt-2">{activity.description}</p>
                            )}
                          </div>
                          {!isReference && (
                            <div className="text-right ml-4">
                              <select
                                value={'status' in activity ? activity.status : 'suggested'}
                                onChange={(e) => handleStatusChange(activity as Activity, e.target.value)}
                                className={`px-3 py-1 rounded text-sm font-medium ${
                                  getActivityStatusColor(('status' in activity ? activity.status : 'suggested') as any)
                                } border-0 focus:outline-none`}
                              >
                                <option value="suggested">Suggested</option>
                                <option value="planned">Planned</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                              </select>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2 mb-4">
                          {('category' in activity) && (
                            <span
                              className={`inline-block px-3 py-1 rounded-full text-xs font-medium capitalize ${
                                getActivityCategoryColor(activity.category as any)
                              }`}
                            >
                              {activity.category}
                            </span>
                          )}
                          {('duration' in activity) && activity.duration && (
                            <span className="inline-block px-3 py-1 bg-gray-200 text-gray-800 rounded-full text-xs font-medium">
                              ⏱️ {activity.duration}
                            </span>
                          )}
                          {('estimatedCost' in activity) && activity.estimatedCost && (
                            <span className="inline-block px-3 py-1 bg-green-200 text-green-800 rounded-full text-xs font-medium">
                              💰 {'currency' in activity ? activity.currency : 'EUR'} {(activity.estimatedCost as number).toFixed(2)}
                            </span>
                          )}
                        </div>

                        {('url' in activity) && activity.url && (
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

                        {!isReference && 'id' in activity && (
                          <QuickFileLinks 
                            files={(() => {
                              const activityFiles = files.filter(f => f.activityId === activity.id);
                              // If activity's destination is in a trip and user is a viewer on that trip, filter files
                              const destination = destinations.find(d => d.id === activity.destinationId);
                              if (destination && destination.tripId) {
                                const destTrip = trip || availableTrips.find(t => t.id === destination.tripId);
                                if (destTrip && isViewer(destTrip, session?.user?.email)) {
                                  return activityFiles.filter(f => f.category === "picture" || f.category === "video");
                                }
                              }
                              return activityFiles;
                            })()} 
                          />
                        )}

                        <div className="border-t border-gray-200 pt-4 flex items-center justify-between flex-wrap gap-4">
                          <div className="flex gap-4 flex-wrap">
                            {isOwnItem && (
                              <>
                                <button
                                  onClick={() => handleVote(activity as Activity)}
                                  className={`px-4 py-2 rounded font-medium transition-colors ${
                                    ('votedBy' in activity) && activity.votedBy.includes(session?.user?.email || "")
                                      ? "bg-blue-500 text-white hover:bg-blue-600"
                                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                  }`}
                                >
                                  👍 {'votes' in activity ? activity.votes : 0} votes
                                </button>
                                <button
                                  onClick={() => handleEdit(activity as Activity)}
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
                                <button
                                  onClick={() => handleTogglePublic(activity.id)}
                                  className={`px-4 py-2 rounded font-medium ${
                                    ('public' in activity) && activity.public
                                      ? "bg-green-500 text-white"
                                      : "bg-gray-300 text-gray-700"
                                  }`}
                                >
                                  {('public' in activity) && activity.public ? "🌐 Public" : "🔒 Private"}
                                </button>
                              </>
                            )}
                            
                            {!isOwnItem && (
                              <button
                                onClick={() => handleAddPublicItem(activity as ItemReference)}
                                className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 font-medium"
                              >
                                ➕ Add
                              </button>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">
                            Added by {'addedBy' in activity ? activity.addedBy : 'Referenced'}
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
      </div>

      {/* Traveler Request Modal */}
      {showTravelerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-4">Request Access to Trip</h3>
            <p className="text-gray-600 mb-2">
              To vote on activities, you need to be a traveler on{" "}
              <span className="font-semibold">{failedTripName}</span>.
            </p>
            <p className="text-gray-600 mb-6">
              Submit a request to the trip owner and they will review it.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowTravelerModal(false);
                  setFailedTripId(null);
                  setFailedTripName(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 font-medium disabled:opacity-50"
                disabled={requestingTraveler}
              >
                Cancel
              </button>
              <button
                onClick={handleRequestTraveler}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 font-medium disabled:opacity-50"
                disabled={requestingTraveler}
              >
                {requestingTraveler ? "Submitting..." : "Request Access"}
              </button>
            </div>
          </div>
        </div>
      )}
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

  const userEmail = session.user?.email || undefined;
  const { tripId, destinationId } = context.query;

  // Skip data fetching if Cosmos DB env vars are not available (build time)
  if (!process.env.AZURE_COSMOS_ENDPOINT || !process.env.AZURE_COSMOS_KEY) {
    return {
      props: {
        initialActivities: [],
        initialDestinations: [],
        initialTrip: null,
        allTrips: [],
        initialItemReferences: [],
      },
    };
  }

  try {
    const promises: Promise<any>[] = [
      activitiesApi.getActivities(),
      tripsApi.getTrips(),
    ];

    const [allActivities, allTrips] = await Promise.all(promises);

    // Filter trips to only show those the user has access to
    const accessibleTrips = (allTrips as Trip[]).filter((trip: Trip) =>
      canViewTrip(trip, userEmail)
    );

    // Get trip IDs for the user's accessible trips
    const userTripIds = accessibleTrips.map((trip: Trip) => trip.id);

    // Fetch destinations for the user (includes: user-created, trip-associated, and public)
    const destinationsList = await destinationApi.getDestinations(userEmail, userTripIds);

    let selectedTrip = null;
    let displayDestinations = destinationsList;

    // If tripId is provided, filter to that trip (only if accessible)
    if (tripId && typeof tripId === "string") {
      try {
        const trip = accessibleTrips.find((t: Trip) => t.id === tripId);
        if (trip) {
          selectedTrip = trip;
          // Filter destinations to only this trip's destinations
          displayDestinations = destinationsList.filter((d: Destination) => d.tripId === tripId);
        }
      } catch (err) {
        console.error("Error fetching trip:", err);
      }
    } else {
      // If no tripId (whether or not destinationId exists), show all destinations
      // This allows users to create activities for any destination without a trip
      displayDestinations = destinationsList;
    }

    // Serialize dates to ISO strings for JSON
    const serializedActivities = allActivities.map((activity: Activity) => ({
      ...activity,
      createdAt: activity.createdAt?.toISOString?.() || activity.createdAt,
      updatedAt: activity.updatedAt?.toISOString?.() || activity.updatedAt,
    }));

    const serializedDestinations = displayDestinations.map((dest: Destination) => ({
      ...dest,
      createdAt: dest.createdAt?.toISOString?.() || dest.createdAt,
      updatedAt: dest.updatedAt?.toISOString?.() || dest.updatedAt,
    }));

    const serializedTrips = accessibleTrips.map((trip: Trip) => ({
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
        initialItemReferences: [],
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
        initialItemReferences: [],
      },
    };
  }
};
