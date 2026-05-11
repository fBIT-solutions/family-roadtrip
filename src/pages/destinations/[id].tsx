import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { useSession, signIn } from "next-auth/react";
import Link from "next/link";
import axios from "axios";
import { toast } from "sonner";
import { Destination, Activity, FileMetadata, Trip } from "@/types/schema";
import { FilesList } from "@/components/FilesList";
import { isViewer, canViewTripBudget } from "@/lib/auth-helpers";
import { useCoordinateFetcher } from "@/hooks/useCoordinateFetcher";
import { fetchCoordinates } from "@/lib/coordinatesHelper";
import { Topbar } from "@/components/Topbar";

interface DestinationData {
  destination: Destination;
  activities: Activity[];
  trip?: Trip;
  budget?: {
    totalBudget: number;
    spent: number;
    remaining: number;
    currency: string;
    expenses: any[];
  };
}

export default function DestinationDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { data: session, status } = useSession();
  const [data, setData] = useState<DestinationData | null>(null);
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [denialReason, setDenialReason] = useState<{ tripId?: string; tripName?: string; tripOwnerEmail?: string } | null>(null);
  const [showTravelerModal, setShowTravelerModal] = useState(false);
  const [requestingTraveler, setRequestingTraveler] = useState(false);
  
  // Edit form state
  const [formData, setFormData] = useState({
    name: "",
    place: "",
    country: "",
    description: "",
    mainPhotoUrl: "",
    estimatedBudget: 0,
    currency: "EUR",
    urls: [] as string[],
    latitude: 0,
    longitude: 0,
    status: "proposed" as const,
    public: false,
  });
  const [urlInput, setUrlInput] = useState("");

  // Fetch coordinates when form changes
  const fetchFormCoordinates = useCoordinateFetcher((lat, lon) => {
    setFormData((prev) => ({
      ...prev,
      latitude: lat,
      longitude: lon,
    }));
  });

  useEffect(() => {
    if (id && status !== "loading") {
      // Fetch data for both authenticated and unauthenticated users
      // (public destinations are viewable by anyone)
      fetchData();
      // Only fetch files if authenticated
      if (status === "authenticated") {
        fetchFiles();
      }
    }
  }, [id, status]);

  const fetchData = async () => {
    try {
      setAccessDenied(false);
      setDenialReason(null);
      const [destResponse, activitiesResponse] = await Promise.all([
        axios.get(`/api/destinations/${id}`),
        axios.get(`/api/activities`).catch((error) => {
          // If activities endpoint fails, just return empty activities
          if (error?.response?.status === 403) {
            console.error("Access denied to activities:", error);
            return { data: { activities: [] } };
          }
          throw error;
        }),
      ]);
      
      const destination = destResponse.data;
      // Filter activities by destinationId
      const linkedActivities = (activitiesResponse.data.activities || activitiesResponse.data).filter(
        (activity: Activity) => activity.destinationId === id
      );
      
      // Fetch trip if destination is linked to a trip
      let trip: Trip | undefined;
      if (destination.tripId) {
        try {
          const tripResponse = await axios.get(`/api/trips/${destination.tripId}`);
          trip = tripResponse.data?.trip || tripResponse.data;
        } catch (err) {
          console.error("Error fetching trip:", err);
        }
      }
      
      setData({
        destination,
        activities: linkedActivities,
        trip,
        budget: destination.budget,
      });
      setFormData({
        name: destination.name,
        place: destination.place,
        country: destination.country,
        description: destination.description || "",
        mainPhotoUrl: destination.mainPhotoUrl || "",
        estimatedBudget: destination.estimatedBudget || 0,
        currency: destination.currency || "EUR",
        urls: destination.urls || [],
        latitude: destination.latitude || 0,
        longitude: destination.longitude || 0,
        status: destination.status,
        public: destination.public || false,
      });
      setUrlInput((destination.urls || []).join("\n"));
    } catch (error: any) {
      console.error("Error fetching destination:", error);
      
      // Handle permission denied errors
      if (error?.response?.status === 403) {
        setAccessDenied(true);
        const errorData = error?.response?.data;
        if (errorData?.tripId && errorData?.tripName) {
          setDenialReason({
            tripId: errorData.tripId,
            tripName: errorData.tripName,
            tripOwnerEmail: errorData.tripOwnerEmail,
          });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchFiles = async () => {
    if (!id) return;
    try {
      const response = await axios.get(`/api/files`);
      const destinationFiles = response.data.filter(
        (file: FileMetadata) => file.destinationId === id
      );
      setFiles(destinationFiles);
    } catch (error) {
      console.error("Error fetching files:", error);
      setFiles([]);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    try {
      await axios.delete(`/api/files/${fileId}`);
      await fetchFiles();
    } catch (error) {
      console.error("Error deleting file:", error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const urlList = urlInput
        .split("\n")
        .map((url) => url.trim())
        .filter((url) => url.length > 0);

      // Check if place or country has changed
      const placeChanged = data?.destination && formData.place !== data.destination.place;
      const countryChanged = data?.destination && formData.country !== data.destination.country;

      // Fetch updated coordinates if place or country changed
      if (placeChanged || countryChanged) {
        const coords = await fetchCoordinates(formData.place, formData.country);
        if (coords) {
          formData.latitude = coords.latitude;
          formData.longitude = coords.longitude;
        }
      }

      await axios.put(`/api/destinations/${id}`, {
        ...formData,
        urls: urlList,
        public: formData.public,
      });
      setIsEditing(false);
      await fetchData();
    } catch (error) {
      console.error("Error saving destination:", error);
      alert("Failed to save destination");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this destination?")) return;
    try {
      await axios.delete(`/api/destinations/${id}`);
      router.push("/destinations");
    } catch (error) {
      console.error("Error deleting destination:", error);
    }
  };

  const handleVote = async () => {
    try {
      await axios.post(`/api/destinations/${id}/vote`);
      await fetchData();
    } catch (error) {
      console.error("Error voting on destination:", error);
      alert("Failed to vote on destination");
    }
  };

  const handleRequestTraveler = async () => {
    if (!denialReason?.tripId) return;
    setRequestingTraveler(true);
    try {
      await axios.post(`/api/trips/${denialReason.tripId}/traveler-requests`);
      toast.success("Request submitted! Waiting for trip owner approval.");
      setShowTravelerModal(false);
      setAccessDenied(false);
    } catch (err: any) {
      const errorMsg = err?.response?.data?.error || "Failed to submit request";
      toast.error(errorMsg);
      console.error("Error submitting traveler request:", err);
    } finally {
      setRequestingTraveler(false);
    }
  };

  if (status === "unauthenticated") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <button
          onClick={() => signIn()}
          className="px-8 py-3 bg-blue-600 text-white text-lg rounded-lg hover:bg-blue-700"
        >
          Sign In
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4 text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-4">
            You need traveler access to view this destination's details.
          </p>
          <p className="text-gray-600 mb-6">
            {denialReason?.tripName ? (
              <>Request access to <span className="font-semibold">{denialReason.tripName}</span> to continue.</>
            ) : (
              "Request access to this trip to continue."
            )}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => router.push("/destinations")}
              className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 font-medium"
            >
              Back
            </button>
            <button
              onClick={() => setShowTravelerModal(true)}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 font-medium"
            >
              Request Access
            </button>
          </div>
        </div>

        {/* Traveler Request Modal */}
        {showTravelerModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-bold mb-4">Request Access to Trip</h3>
              <p className="text-gray-600 mb-2">
                To view this destination and its details, you need to be a traveler on{" "}
                <span className="font-semibold">{denialReason?.tripName}</span>.
              </p>
              <p className="text-gray-600 mb-6">
                Submit a request to the trip owner and they will review it.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowTravelerModal(false)}
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

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Destination not found</p>
      </div>
    );
  }

  const { destination, activities, budget } = data;
  const isOwner = session?.user?.email === destination.addedBy;

  return (
    <div className="min-h-screen bg-gray-50">
      <Topbar />
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-start">
            <div>
              {/* <Link href="/destinations">
                <button className="text-blue-600 hover:text-blue-800 mb-4">← Back to Destinations</button>
              </Link> */}
              <button
                onClick={() => router.back()}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 font-medium"
              >← Back</button>
              <h1 className="text-4xl font-bold text-gray-800">{formData.name}</h1>
              <p className="text-gray-600 text-lg mt-2">{formData.place}, {formData.country}</p>
              <div className="flex gap-4 mt-4">
              <button
                onClick={handleVote}
                disabled={data?.trip ? isViewer(data.trip, session?.user?.email || "") : false}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                  data?.trip && isViewer(data.trip, session?.user?.email || "")
                    ? "bg-gray-400 text-gray-600 cursor-not-allowed"
                    : "bg-green-600 text-white hover:bg-green-700"
                }`}
                title={data?.trip && isViewer(data.trip, session?.user?.email || "") ? "Guests cannot vote" : ""}
              >
                👍 Vote ({destination.votes})
              </button>
              </div>
            </div>
            {isOwner && (
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {isEditing ? "Cancel" : "✏️ Edit"}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Main Photo */}
        {formData.mainPhotoUrl && (
          <div className="mb-8 rounded-lg overflow-hidden shadow">
            <img
              src={formData.mainPhotoUrl}
              alt={formData.name}
              className="w-full h-96 object-cover"
            />
          </div>
        )}

        {/* Description and URLs Section */}
        {!isEditing && (
          <>
            {formData.description && (
              <div className="bg-white rounded-lg shadow p-6 mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">About This Destination</h2>
                <p className="text-gray-700 text-lg leading-relaxed">{formData.description}</p>
              </div>
            )}
            
            {formData.urls && formData.urls.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6 mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Useful Links</h2>
                <div className="space-y-3">
                  {formData.urls.map((url, idx) => (
                    <a
                      key={idx}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-800 break-all"
                    >
                      <span>🔗</span>
                      <span className="hover:underline">{url}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Edit Form */}
        {isEditing && isOwner && (
          <div className="bg-white p-6 rounded-lg shadow mb-8 space-y-4">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Edit Destination Details</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="proposed">Proposed</option>
                  <option value="accepted">Accepted</option>
                  <option value="planned">Planned</option>
                  <option value="visited">Visited</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Place *</label>
                <input
                  type="text"
                  value={formData.place}
                  onChange={(e) => setFormData({ ...formData, place: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Country *</label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 h-20"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Estimated Budget</label>
                <input
                  type="number"
                  value={formData.estimatedBudget}
                  onChange={(e) => setFormData({ ...formData, estimatedBudget: +e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Currency</label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option>EUR</option>
                  <option>USD</option>
                  <option>GBP</option>
                  <option>JPY</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Main Photo URL</label>
              <input
                type="url"
                value={formData.mainPhotoUrl}
                onChange={(e) => setFormData({ ...formData, mainPhotoUrl: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">URLs (one per line)</label>
              <textarea
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 h-16 font-mono text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Latitude</label>
                <input
                  type="number"
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: +e.target.value })}
                  step="0.000001"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Longitude</label>
                <input
                  type="number"
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: +e.target.value })}
                  step="0.000001"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="border-t pt-4 mt-6">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm font-semibold text-gray-700">Share This Destination Publicly</span>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, public: !formData.public })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formData.public ? 'bg-green-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.public ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </label>
              <p className="text-xs text-gray-500 mt-2">
                {formData.public ? '🌐 This destination is shared publicly and other users can discover and add it to their trips.' : '🔒 This destination is private and only visible to you.'}
              </p>
            </div>

            <div className="flex gap-3 pt-4 mt-6">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Activities */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Linked Activities</h2>
              <Link href={`/activities?destinationId=${id}`}>
                <button 
                  disabled={data?.trip ? isViewer(data.trip, session?.user?.email || "") : false}
                  className={`px-3 py-1 rounded text-sm ${
                    data?.trip && isViewer(data.trip, session?.user?.email || "")
                      ? "bg-gray-400 text-gray-600 cursor-not-allowed"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                  title={data?.trip && isViewer(data.trip, session?.user?.email || "") ? "Guests cannot add activities" : ""}
                >
                  + Add Activity
                </button>
              </Link>
            </div>
            
            {activities.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No activities yet</p>
            ) : (
              <div className="space-y-4">
                {activities.map((activity) => (
                  <div key={activity.id} className="p-4 border border-gray-200 rounded-lg hover:border-blue-400 transition">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800">{activity.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                        <div className="flex gap-2 mt-2 text-sm">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded capitalize">{activity.category}</span>
                          {activity.duration && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded">{activity.duration}</span>
                          )}
                        </div>
                        {activity.estimatedCost && (
                          <p className="text-sm text-gray-700 mt-2">💰 {activity.currency} {activity.estimatedCost.toLocaleString()}</p>
                        )}
                      </div>
                      <Link href={`/activities/${activity.id}`}>
                        <button className="text-blue-600 hover:text-blue-800 text-sm">View</button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column - Budget */}
          {data?.trip && canViewTripBudget(data.trip, session?.user?.email) ? (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Budget</h2>
              
              {formData.estimatedBudget ? (
              <div className="space-y-6">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600">Estimated Budget</p>
                  <p className="text-3xl font-bold text-blue-600">{formData.currency} {formData.estimatedBudget.toLocaleString()}</p>
                </div>

                {budget ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-green-50 rounded-lg">
                        <p className="text-sm text-gray-600">Remaining</p>
                        <p className="text-2xl font-bold text-green-600">{budget.currency} {budget.remaining.toLocaleString()}</p>
                      </div>
                      <div className="p-4 bg-orange-50 rounded-lg">
                        <p className="text-sm text-gray-600">Spent</p>
                        <p className="text-2xl font-bold text-orange-600">{budget.currency} {budget.spent.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-orange-500 h-3 rounded-full transition-all"
                        style={{ width: `${Math.min((budget.spent / budget.totalBudget) * 100, 100)}%` }}
                      />
                    </div>

                    {budget.expenses && budget.expenses.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-gray-800 mb-3">Recent Expenses</h3>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {budget.expenses.slice(0, 5).map((expense: any, idx: number) => (
                            <div key={idx} className="flex justify-between text-sm">
                              <span className="text-gray-700">{expense.description}</span>
                              <span className="text-gray-600">{budget.currency} {expense.amount}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {data?.trip && canViewTripBudget(data.trip, session?.user?.email) && (
                      <Link href={`/budgets?tripId=${data.destination.tripId}&destinationId=${id}`}>
                        <button className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                          Manage Budget
                        </button>
                      </Link>
                    )}
                  </>
                ) : (
                  <div className="p-4 bg-gray-50 rounded-lg text-center">
                    <p className="text-gray-600 mb-4">No budget tracking started yet</p>
                    {data?.trip && canViewTripBudget(data.trip, session?.user?.email) && (
                      <Link href={`/budgets?tripId=${data.destination.tripId}&destinationId=${id}`}>
                        <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                          Start Tracking
                        </button>
                      </Link>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <p className="text-gray-600">Set an estimated budget above to track expenses</p>
              </div>
            )}
            </div>
          ) : null}
        </div>

        {/* Files Section */}
        {(() => {
          // Filter files if user is a viewer on the trip
          const displayFiles = (() => {
            if (data?.trip && isViewer(data.trip, session?.user?.email)) {
              return files.filter(f => f.category === "picture" || f.category === "video");
            }
            return files;
          })();
          
          return displayFiles.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6 mt-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">📄 DESTINATION FILES</h2>
              <FilesList 
                files={displayFiles} 
                onDelete={handleDeleteFile}
              />
            </div>
          );
        })()}

        {/* Additional Info */}
        <div className="bg-white rounded-lg shadow p-6 mt-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Details</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Status</p>
              <p className={`font-semibold capitalize ${
                formData.status === "proposed" ? "text-yellow-600" :
                formData.status === "accepted" ? "text-green-600" :
                formData.status === "planned" ? "text-blue-600" :
                "text-purple-600"
              }`}>{formData.status}</p>
            </div>
            <div>
              <p className="text-gray-600">Votes</p>
              <p className="font-semibold">{destination.votes}</p>
            </div>
            <div>
              <p className="text-gray-600">Added By</p>
              <p className="font-semibold text-xs">{destination.addedBy}</p>
            </div>
            {destination.latitude && destination.longitude && (
              <div>
                <p className="text-gray-600">Coordinates</p>
                <p className="font-semibold text-xs">{destination.latitude.toFixed(4)}, {destination.longitude.toFixed(4)}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
