import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import axios from "axios";
import Link from "next/link";
import { toast } from "sonner";
import { Topbar } from "@/components/Topbar";
import PreferencesPanel from "@/components/PreferencesPanel";
import { Destination, Activity } from "@/types/schema";

export default function MySpace() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState<"overview" | "destinations" | "activities" | "preferences">("overview");
  const [myDestinations, setMyDestinations] = useState<Destination[]>([]);
  const [myActivities, setMyActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

  useEffect(() => {
    if (!router.isReady) return;
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated") {
      fetchMyContent();
    }
  }, [router.isReady, status]);

  // Handle URL-based tab navigation (e.g., ?tab=preferences)
  useEffect(() => {
    if (!router.isReady) return;
    const tab = router.query.tab as string;
    if (tab && ["overview", "destinations", "activities", "preferences"].includes(tab)) {
      setActiveTab(tab as any);
    }
  }, [router.isReady, router.query.tab]);

  const fetchMyContent = async () => {
    try {
      setLoading(true);
      const [destRes, actRes] = await Promise.all([
        axios.get("/api/destinations"),
        axios.get("/api/activities"),
      ]);

      // Filter to only show content created by user
      const userEmail = session?.user?.email;
      const destinations = (destRes.data.destinations || destRes.data).filter(
        (d: Destination) => d.addedBy === userEmail
      );
      const activities = (actRes.data.activities || actRes.data).filter(
        (a: Activity) => a.addedBy === userEmail
      );

      setMyDestinations(destinations);
      setMyActivities(activities);
    } catch (error) {
      console.error("Error fetching content:", error);
      toast.error("Failed to load your content");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDestination = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await axios.delete(`/api/destinations/${id}`);
      setMyDestinations(myDestinations.filter((d) => d.id !== id));
      toast.success("Destination deleted");
    } catch (error) {
      console.error("Error deleting destination:", error);
      toast.error("Failed to delete destination");
    }
  };

  const handleDeleteActivity = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await axios.delete(`/api/activities/${id}`);
      setMyActivities(myActivities.filter((a) => a.id !== id));
      toast.success("Activity deleted");
    } catch (error) {
      console.error("Error deleting activity:", error);
      toast.error("Failed to delete activity");
    }
  };

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Topbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-64 flex-shrink-0">
            {/* User Profile Card */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="text-center">
                {session?.user?.image && (
                  <img
                    src={session.user.image}
                    alt={session.user.name || "User"}
                    className="w-16 h-16 rounded-full mx-auto mb-3 object-cover"
                  />
                )}
                <p className="font-semibold text-gray-900 text-lg">
                  {session?.user?.name}
                </p>
                <p className="text-sm text-gray-600 mt-1">{session?.user?.email}</p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <nav className="divide-y divide-gray-200">
                <button
                  onClick={() => setActiveTab("overview")}
                  className={`w-full text-left px-4 py-3 font-medium transition ${
                    activeTab === "overview"
                      ? "bg-blue-50 text-blue-700 border-l-4 border-blue-700"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  📊 Overview
                </button>
                <button
                  onClick={() => setActiveTab("destinations")}
                  className={`w-full text-left px-4 py-3 font-medium transition ${
                    activeTab === "destinations"
                      ? "bg-blue-50 text-blue-700 border-l-4 border-blue-700"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  📍 Destinations ({myDestinations.length})
                </button>
                <button
                  onClick={() => setActiveTab("activities")}
                  className={`w-full text-left px-4 py-3 font-medium transition ${
                    activeTab === "activities"
                      ? "bg-blue-50 text-blue-700 border-l-4 border-blue-700"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  🎯 Activities ({myActivities.length})
                </button>
                <button
                  onClick={() => setActiveTab("preferences")}
                  className={`w-full text-left px-4 py-3 font-medium transition ${
                    activeTab === "preferences"
                      ? "bg-blue-50 text-blue-700 border-l-4 border-blue-700"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  ⚙️ Preferences
                </button>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-800 mb-8">My Space</h1>

            {/* Tab Content */}
            {/* Overview Tab */}
            {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Welcome to Your Space</h2>
                <p className="text-gray-600 mb-4">
                  Manage all your travel content in one place. Create, edit, and organize your destinations and activities.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-4 rounded">
                    <div className="text-2xl font-bold text-blue-600">{myDestinations.length}</div>
                    <div className="text-sm text-gray-600">Destinations</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded">
                    <div className="text-2xl font-bold text-green-600">{myActivities.length}</div>
                    <div className="text-sm text-gray-600">Activities</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* My Destinations Tab */}
          {activeTab === "destinations" && (
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">Loading...</p>
                </div>
              ) : myDestinations.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-6 text-center">
                  <p className="text-gray-600 mb-4">You haven't created any destinations yet.</p>
                  <Link href="/destinations">
                    <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                      Create Destination
                    </button>
                  </Link>
                </div>
              ) : (
                <div className="grid gap-4">
                  {myDestinations.map((dest) => (
                    <div key={dest.id} className="bg-white rounded-lg shadow p-4 flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-800">{dest.name}</h3>
                        <p className="text-sm text-gray-600">
                          {dest.place}, {dest.country}
                        </p>
                        {dest.description && (
                          <p className="text-sm text-gray-700 mt-2">{dest.description.substring(0, 100)}...</p>
                        )}
                        <div className="flex gap-2 mt-3">
                          <Link href={`/destinations/${dest.id}`}>
                            <button className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200">
                              View
                            </button>
                          </Link>
                          <button
                            onClick={() => handleDeleteDestination(dest.id, dest.name)}
                            className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* My Activities Tab */}
          {activeTab === "activities" && (
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">Loading...</p>
                </div>
              ) : myActivities.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-6 text-center">
                  <p className="text-gray-600 mb-4">You haven't created any activities yet.</p>
                  <Link href="/activities">
                    <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                      Create Activity
                    </button>
                  </Link>
                </div>
              ) : (
                <div className="grid gap-4">
                  {myActivities.map((activity) => (
                    <div key={activity.id} className="bg-white rounded-lg shadow p-4 flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-800">{activity.name}</h3>
                        <p className="text-sm text-gray-600 capitalize">{activity.category}</p>
                        {activity.description && (
                          <p className="text-sm text-gray-700 mt-2">{activity.description.substring(0, 100)}...</p>
                        )}
                        <div className="flex gap-2 mt-3">
                          {activity.estimatedCost && (
                            <span className="text-sm bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                              ${activity.estimatedCost}
                            </span>
                          )}
                          <button
                            onClick={() => setSelectedActivity(activity)}
                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleDeleteActivity(activity.id, activity.name)}
                            className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Preferences Tab */}
          {activeTab === "preferences" && (
            <div className="space-y-6">
              {/* Travel Preferences Section */}
              <div className="bg-white rounded-lg shadow">
                <PreferencesPanel />
              </div>

              {/* Disliked Items Link */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Disliked Items</h2>
                <p className="text-gray-600 mb-4">
                  View and manage items you've disliked to improve recommendations.
                </p>
                <Link href="/my-space/preferences/dislikes">
                  <button className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
                    👎 View Disliked Items
                  </button>
                </Link>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>

      {/* Activity Detail Modal */}
      {selectedActivity && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">{selectedActivity.name}</h2>
              <button
                onClick={() => setSelectedActivity(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="px-6 py-4 space-y-4">
              {/* Category */}
              <div>
                <p className="text-sm font-semibold text-gray-600">Category</p>
                <p className="text-gray-900 capitalize">{selectedActivity.category}</p>
              </div>

              {/* Description */}
              {selectedActivity.description && (
                <div>
                  <p className="text-sm font-semibold text-gray-600">Description</p>
                  <p className="text-gray-900">{selectedActivity.description}</p>
                </div>
              )}

              {/* Cost */}
              {selectedActivity.estimatedCost && (
                <div>
                  <p className="text-sm font-semibold text-gray-600">Estimated Cost</p>
                  <p className="text-gray-900">${selectedActivity.estimatedCost}</p>
                </div>
              )}

              {/* Duration */}
              {selectedActivity.duration && (
                <div>
                  <p className="text-sm font-semibold text-gray-600">Duration</p>
                  <p className="text-gray-900">{selectedActivity.duration}</p>
                </div>
              )}

              {/* URL */}
              {selectedActivity.url && (
                <div>
                  <p className="text-sm font-semibold text-gray-600">Source</p>
                  <a 
                    href={selectedActivity.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    {selectedActivity.url}
                  </a>
                </div>
              )}

              {/* Status */}
              {selectedActivity.status && (
                <div>
                  <p className="text-sm font-semibold text-gray-600">Status</p>
                  <p className="text-gray-900 capitalize">{selectedActivity.status}</p>
                </div>
              )}

              {/* Votes Count */}
              {selectedActivity.votes !== undefined && (
                <div>
                  <p className="text-sm font-semibold text-gray-600">Votes</p>
                  <p className="text-gray-900">{selectedActivity.votes} {selectedActivity.votes === 1 ? 'vote' : 'votes'}</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex gap-3 justify-end">
              <button
                onClick={() => setSelectedActivity(null)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition"
              >
                Close
              </button>
              <Link href={`/activities/${selectedActivity.id}`}>
                <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">
                  Edit Activity
                </button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

