import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useSession, signIn } from "next-auth/react";
import Link from "next/link";
import axios from "axios";
import { Activity, Destination, FileMetadata } from "@/types/schema";
import { FilesList } from "@/components/FilesList";

interface ActivityData {
  activity: Activity;
  destination?: Destination;
}

export default function ActivityDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { data: session, status } = useSession();
  const [data, setData] = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [files, setFiles] = useState<FileMetadata[]>([]);

  // Edit form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "other" as const,
    url: "",
    estimatedCost: 0,
    currency: "USD",
    duration: "",
    status: "suggested" as const,
  });

  useEffect(() => {
    if (id && status === "authenticated") {
      fetchData();
      fetchFiles();
    }
  }, [id, status]);

  const fetchData = async () => {
    try {
      const response = await axios.get(`/api/activities/${id}`);
      const activity = response.data;
      setData({ activity, destination: activity.destination });
      setFormData({
        name: activity.name,
        description: activity.description || "",
        category: activity.category,
        url: activity.url || "",
        estimatedCost: activity.estimatedCost || 0,
        currency: activity.currency,
        duration: activity.duration || "",
        status: activity.status,
      });
    } catch (error) {
      console.error("Error fetching activity:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFiles = async () => {
    if (!id) return;
    try {
      const response = await axios.get(`/api/files`);
      const activityFiles = response.data.filter(
        (file: FileMetadata) => file.activityId === id
      );
      setFiles(activityFiles);
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
      await axios.put(`/api/activities/${id}`, formData);
      setIsEditing(false);
      await fetchData();
    } catch (error) {
      console.error("Error saving activity:", error);
      alert("Failed to save activity");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this activity?")) return;
    try {
      await axios.delete(`/api/activities/${id}`);
      router.back();
    } catch (error) {
      console.error("Error deleting activity:", error);
    }
  };

  const handleVote = async () => {
    try {
      await axios.post(`/api/activities/${id}/vote`);
      await fetchData();
    } catch (error) {
      console.error("Error voting on activity:", error);
      alert("Failed to vote on activity");
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

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Activity not found</p>
      </div>
    );
  }

  const { activity, destination } = data;
  const isOwner = session?.user?.email === activity.addedBy;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:text-blue-800 mb-4"
          >
            ← Back
          </button>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold text-gray-800">{formData.name}</h1>
              {destination && (
                <Link href={`/destinations/${destination.id}`}>
                  <p className="text-gray-600 text-lg mt-2 hover:text-blue-600 cursor-pointer">
                    📍 {destination.name} ({destination.place}, {destination.country})
                  </p>
                </Link>
              )}
              <div className="flex gap-4 mt-4">
                <button
                  onClick={handleVote}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  👍 Vote ({activity.votes})
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

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Edit Form */}
        {isEditing && isOwner && (
          <div className="bg-white p-6 rounded-lg shadow mb-8 space-y-4">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Edit Activity</h2>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 h-20"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value as any })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="outdoor">Outdoor</option>
                  <option value="cultural">Cultural</option>
                  <option value="food">Food</option>
                  <option value="nightlife">Nightlife</option>
                  <option value="shopping">Shopping</option>
                  <option value="sports">Sports</option>
                  <option value="relaxation">Relaxation</option>
                  <option value="adventure">Adventure</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value as any })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="suggested">Suggested</option>
                  <option value="planned">Planned</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                URL (Google Maps, TripAdvisor, etc)
              </label>
              <input
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Estimated Cost
                </label>
                <input
                  type="number"
                  value={formData.estimatedCost}
                  onChange={(e) =>
                    setFormData({ ...formData, estimatedCost: +e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Currency
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) =>
                    setFormData({ ...formData, currency: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option>USD</option>
                  <option>EUR</option>
                  <option>GBP</option>
                  <option>JPY</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Duration (e.g., "2 hours", "half-day", "full-day")
              </label>
              <input
                type="text"
                value={formData.duration}
                onChange={(e) =>
                  setFormData({ ...formData, duration: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-3 pt-4">
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

        {/* Activity Details */}
        {!isEditing && (
          <>
            {formData.description && (
              <div className="bg-white rounded-lg shadow p-6 mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">
                  About This Activity
                </h2>
                <p className="text-gray-700 text-lg leading-relaxed">
                  {formData.description}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-sm text-gray-600 mb-1">Category</p>
                <p className="text-xl font-semibold text-gray-800 capitalize">
                  {formData.category}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-sm text-gray-600 mb-1">Status</p>
                <p
                  className={`text-xl font-semibold capitalize ${
                    formData.status === "suggested"
                      ? "text-yellow-600"
                      : formData.status === "planned"
                      ? "text-blue-600"
                      : formData.status === "completed"
                      ? "text-green-600"
                      : "text-gray-600"
                  }`}
                >
                  {formData.status}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-sm text-gray-600 mb-1">Duration</p>
                <p className="text-xl font-semibold text-gray-800">
                  {formData.duration || "Not specified"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {formData.estimatedCost > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <p className="text-sm text-gray-600 mb-2">Estimated Cost</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {formData.currency} {formData.estimatedCost.toLocaleString()}
                  </p>
                </div>
              )}

              {formData.url && (
                <div className="bg-white rounded-lg shadow p-6">
                  <p className="text-sm text-gray-600 mb-3">More Information</p>
                  <a
                    href={formData.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 break-all"
                  >
                    <span className="flex items-center gap-2">
                      <span>🔗</span>
                      <span className="hover:underline">{formData.url}</span>
                    </span>
                  </a>
                </div>
              )}
            </div>
          </>
        )}

        {/* Files Section */}
        {files.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mt-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">📄 ACTIVITY FILES</h2>
            <FilesList 
              files={files} 
              onDelete={handleDeleteFile}
            />
          </div>
        )}

        {/* Additional Info */}
        <div className="bg-white rounded-lg shadow p-6 mt-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Details</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Added By</p>
              <p className="font-semibold text-xs">{activity.addedBy}</p>
            </div>
            <div>
              <p className="text-gray-600">Votes</p>
              <p className="font-semibold">{activity.votes}</p>
            </div>
            {destination && (
              <div>
                <p className="text-gray-600">Destination</p>
                <Link href={`/destinations/${destination.id}`}>
                  <p className="font-semibold text-blue-600 hover:underline cursor-pointer">
                    {destination.name}
                  </p>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
