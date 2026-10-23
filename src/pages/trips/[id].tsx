import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import axios from "axios";
import { toast } from "sonner";
import { Trip, Destination, FileMetadata, Expense, Activity, TimelineEvent } from "@/types/schema";
import Link from "next/link";
import { Topbar } from "@/components/Topbar";
import { FilesList } from "@/components/FilesList";
import { MediaGallery } from "@/components/MediaGallery";
import { DestinationCardRow } from "@/components/DestinationCardRow";
import { DestinationMap } from "@/components/DestinationMap";
import { ActivityRecommendations } from "@/components/ActivityRecommendations";
import { Timeline } from "@/components/Timeline";
import { TravelerRequestsModal } from "@/components/TravelerRequestsModal";
import {
  TRIP_GOALS,
  TRIP_STATUSES,
  FILE_CATEGORIES,
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_COLORS,
  DESTINATION_STATUSES,
  getExpenseCategoryColor,
  type TripGoal,
  type TripStatus,
  type FileCategory,
  type ExpenseCategory,
} from "@/lib/constants";

interface TripData {
  trip: Trip;
  destinations: Destination[];
  expenses: any[];
  stats: {
    totalBudget: number;
    totalSpent: number;
    remaining: number;
    destinationCount: number;
    expenseCount: number;
  };
}

interface FeedPost {
  id: string;
  tripId: string;
  content: string;
  author: string;
  authorEmail: string;
  createdAt: Date;
  updatedAt: Date;
}

export default function TripDetails() {
  const router = useRouter();
  const { id } = router.query;
  const { data: session } = useSession();
  const [tripData, setTripData] = useState<TripData | null>(null);
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([]);
  const [tripFiles, setTripFiles] = useState<FileMetadata[]>([]);
  const [tripExpenses, setTripExpenses] = useState<Expense[]>([]);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFeedModal, setShowFeedModal] = useState(false);
  const [showFileModal, setShowFileModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [feedContent, setFeedContent] = useState("");
  const [postingFeed, setPostingFeed] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [creatingExpense, setCreatingExpense] = useState(false);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [deletingFile, setDeletingFile] = useState(false);
  const [documentFilter, setDocumentFilter] = useState<"all" | "document" | "ticket" | "picture" | "video" | "other">("all");
  const [destinationFilter, setDestinationFilter] = useState<"all" | "proposed" | "accepted" | "planned" | "visited">("all");
  const [destinationViewMode, setDestinationViewMode] = useState<"list" | "map">("list");
  const [showAddActivityModal, setShowAddActivityModal] = useState(false);
  const [selectedActivityDestination, setSelectedActivityDestination] = useState<string>("");
  const [activityForm, setActivityForm] = useState({
    name: "",
    description: "",
    category: "outdoor" as const,
    url: "",
    estimatedCost: "",
    duration: "",
  });
  const [activities, setActivities] = useState<Activity[]>([]);
  const [fileForm, setFileForm] = useState({
    filename: "",
    category: "document" as const,
    destinationId: "",
    activityId: "",
  });
  const [mediaForm, setMediaForm] = useState({
    category: "picture" as const,
  });
  const [expenseForm, setExpenseForm] = useState({
    title: "",
    amount: "",
    currency: "EUR",
    category: "other" as const,
    date: new Date().toISOString().split("T")[0],
    notes: "",
    destinationId: "",
  });
  const [editFormData, setEditFormData] = useState({
    name: "",
    goal: "adventure" as const,
    startDate: "",
    endDate: "",
    travelers: "",
    guests: "",
    hasPet: false,
    totalBudget: 5000,
    currency: "EUR",
    description: "",
    status: "planning" as const,
  });
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showTravelerRequestsModal, setShowTravelerRequestsModal] = useState(false);

  // Use constants instead of local definitions
  const goals = TRIP_GOALS;
  const statuses = TRIP_STATUSES;
  const fileCategories = FILE_CATEGORIES;
  const expenseCategories = EXPENSE_CATEGORIES;
  const categoryColors = EXPENSE_CATEGORY_COLORS;

  useEffect(() => {
    if (!id) return;
    fetchTripData();
    fetchUserRole();
    fetchFeedPosts();
    fetchFiles();
    fetchExpenses();
    fetchEvents();
  }, [id]);

  const fetchUserRole = async () => {
    try {
      const response = await axios.get(`/api/permissions/user-role?itemId=${id}&itemType=trip`);
      setUserRole(response.data.role);
    } catch (error) {
      console.error("Error fetching user role:", error);
      setUserRole(null);
    }
  };

  const fetchEvents = async () => {
    try {
      const response = await axios.get(`/api/timeline`);
      const tripEvents = response.data.filter(
        (event: TimelineEvent) => event.tripId === id
      );
      tripEvents.sort(
        (a: TimelineEvent, b: TimelineEvent) =>
          new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      setEvents(tripEvents);
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  };

  const fetchTripData = async () => {
    try {
      const [tripResponse, activitiesResponse] = await Promise.all([
        axios.get(`/api/trips/${id}`),
        axios.get(`/api/activities?tripId=${id}`),
      ]);

      setTripData(tripResponse.data);
      setActivities(activitiesResponse.data.activities || activitiesResponse.data);

      // Initialize edit form with trip data
      const trip = tripResponse.data.trip;
      setEditFormData({
        name: trip.name,
        goal: trip.goal,
        startDate: new Date(trip.startDate).toISOString().split("T")[0],
        endDate: new Date(trip.endDate).toISOString().split("T")[0],
        travelers: trip.people.join(", "),
        guests: trip.viewers.join(", "),
        hasPet: trip.hasPet,
        totalBudget: trip.totalBudget,
        currency: trip.currency,
        description: trip.description || "",
        status: trip.status,
      });
    } catch (error) {
      console.error("Error fetching trip:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    try {
      const travelersArray = editFormData.travelers
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const guestsArray = editFormData.guests
        .split(",")
        .map((g) => g.trim())
        .filter((g) => g.length > 0);

      await axios.put(`/api/trips/${id}`, {
        name: editFormData.name,
        goal: editFormData.goal,
        startDate: new Date(editFormData.startDate),
        endDate: new Date(editFormData.endDate),
        people: travelersArray,
        viewers: guestsArray,
        hasPet: editFormData.hasPet,
        totalBudget: editFormData.totalBudget,
        currency: editFormData.currency,
        description: editFormData.description,
        status: editFormData.status,
      });
      setShowEditModal(false);
      // Refresh trip data
      fetchTripData();
      toast.success("Trip updated successfully!");
    } catch (error) {
      console.error("Error updating trip:", error);
      toast.error("Failed to update trip");
    }
  };

  const fetchFeedPosts = async () => {
    if (!id) return;
    try {
      const response = await axios.get(`/api/trips/${id}/feed`);
      setFeedPosts(response.data);
    } catch (error: any) {
      // Handle 404 gracefully - endpoint may not exist yet
      if (error.response?.status === 404) {
        setFeedPosts([]);
      } else {
        console.error("Error fetching feed posts:", error);
        setFeedPosts([]);
      }
    }
  };

  const handlePostFeed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !feedContent.trim()) return;

    setPostingFeed(true);
    try {
      await axios.post(`/api/trips/${id}/feed`, {
        content: feedContent,
      });
      setFeedContent("");
      setShowFeedModal(false);
      await fetchFeedPosts();
      toast.success("Update posted to trip feed!");
    } catch (error: any) {
      // Handle 404 gracefully - endpoint may not be implemented yet
      if (error.response?.status === 404) {
        toast.error("Trip feed feature is not yet available. Please try again later.");
      } else {
        console.error("Error posting to feed:", error);
        toast.error("Failed to post update");
      }
    } finally {
      setPostingFeed(false);
    }
  };

  const fetchFiles = async () => {
    if (!id) return;
    try {
      const response = await axios.get(`/api/trips/${id}/files`);
      setTripFiles(response.data);
    } catch (error) {
      console.error("Error fetching files:", error);
      setTripFiles([]);
    }
  };

  const fetchExpenses = async () => {
    if (!id) return;
    try {
      const response = await axios.get(`/api/trips/${id}/expenses`);
      setTripExpenses(response.data);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      setTripExpenses([]);
    }
  };

  const handleUploadFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    const fileInput = document.getElementById("fileInput") as HTMLInputElement;
    const files = fileInput?.files;

    if (!files || files.length === 0) {
      toast.error("Please select at least one file");
      return;
    }

    setUploadingFile(true);
    const totalFiles = files.length;
    let successCount = 0;
    let errorCount = 0;

    try {
      // Upload each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          // Convert file to base64
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });

          await axios.post(`/api/trips/${id}/files`, {
            filename: file.name,
            fileData: base64,
            category: fileForm.category,
            destinationId: fileForm.destinationId || undefined,
            activityId: fileForm.activityId || undefined,
          });
          successCount++;
        } catch (error) {
          console.error(`Error uploading file ${file.name}:`, error);
          errorCount++;
        }
      }

      // Show results
      if (successCount > 0) {
        toast.success(`${successCount} file${successCount > 1 ? "s" : ""} uploaded successfully!`);
      }
      if (errorCount > 0) {
        toast.error(`Failed to upload ${errorCount} file${errorCount > 1 ? "s" : ""}`);
      }

      if (successCount > 0) {
        setFileForm({ filename: "", category: "document", destinationId: "", activityId: "" });
        setShowFileModal(false);
        await fetchFiles();
      }
    } catch (error) {
      console.error("Error uploading files:", error);
      toast.error("Failed to upload files");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !expenseForm.title || !expenseForm.amount) return;

    setCreatingExpense(true);
    try {
      await axios.post(`/api/trips/${id}/expenses`, {
        title: expenseForm.title,
        amount: parseFloat(expenseForm.amount),
        currency: expenseForm.currency,
        category: expenseForm.category,
        date: new Date(expenseForm.date),
        notes: expenseForm.notes || undefined,
        destinationId: expenseForm.destinationId || undefined,
      });
      setExpenseForm({
        title: "",
        amount: "",
        currency: "EUR",
        category: "other",
        date: new Date().toISOString().split("T")[0],
        notes: "",
        destinationId: "",
      });
      setShowExpenseModal(false);
      await fetchExpenses();
      toast.success("Expense added successfully!");
    } catch (error) {
      console.error("Error creating expense:", error);
      toast.error("Failed to create expense");
    } finally {
      setCreatingExpense(false);
    }
  };

  const handleUploadMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    const mediaInput = document.getElementById("mediaInput") as HTMLInputElement;
    const files = mediaInput?.files;

    if (!files || files.length === 0) {
      toast.error("Please select at least one photo or video");
      return;
    }

    // Validate all files first
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
        toast.error(`${file.name} is not a valid image or video file`);
        return;
      }
    }

    setUploadingMedia(true);
    const totalFiles = files.length;
    let successCount = 0;
    let errorCount = 0;

    try {
      // Upload each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          // Detect category based on file type
          const category = file.type.startsWith("video/") ? "video" : "picture";

          // Convert file to base64
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });

          await axios.post(`/api/trips/${id}/files`, {
            filename: file.name,
            fileData: base64,
            category: category,
            destinationId: undefined,
            activityId: undefined,
          });
          successCount++;
        } catch (error) {
          console.error(`Error uploading media ${file.name}:`, error);
          errorCount++;
        }
      }

      // Show results
      if (successCount > 0) {
        toast.success(`${successCount} file${successCount > 1 ? "s" : ""} uploaded successfully!`);
      }
      if (errorCount > 0) {
        toast.error(`Failed to upload ${errorCount} file${errorCount > 1 ? "s" : ""}`);
      }

      if (successCount > 0) {
        setMediaForm({ category: "picture" });
        setShowMediaModal(false);
        await fetchFiles();
      }
    } catch (error) {
      console.error("Error uploading media:", error);
      toast.error("Failed to upload media");
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    setDeletingFile(true);
    try {
      await axios.delete(`/api/files/${fileId}`);
      await fetchFiles();
      toast.success("File deleted successfully!");
    } catch (error) {
      console.error("Error deleting file:", error);
      toast.error("Failed to delete file");
    } finally {
      setDeletingFile(false);
    }
  };

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !selectedActivityDestination) return;

    try {
      await axios.post(`/api/activities`, {
        name: activityForm.name,
        description: activityForm.description || undefined,
        category: activityForm.category,
        url: activityForm.url || undefined,
        estimatedCost: activityForm.estimatedCost ? parseFloat(activityForm.estimatedCost) : undefined,
        duration: activityForm.duration || undefined,
        destinationId: selectedActivityDestination,
        status: "planned",
      });
      setShowAddActivityModal(false);
      setActivityForm({
        name: "",
        description: "",
        category: "outdoor",
        url: "",
        estimatedCost: "",
        duration: "",
      });
      setSelectedActivityDestination("");
      toast.success("Activity added successfully!");
    } catch (error) {
      console.error("Error adding activity:", error);
      toast.error("Failed to add activity");
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!tripData) {
    return <div className="min-h-screen flex items-center justify-center">Trip not found</div>;
  }

  const { trip, destinations, expenses, stats } = tripData;
  const budgetPercentage = (stats.totalSpent / stats.totalBudget) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      <Topbar />
      {/* Header */}
      <div className="border-b border-blue-100 bg-gradient-to-br from-white via-white to-blue-50 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="break-words text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl lg:text-4xl">{trip.name}</h1>
              <p className="text-gray-600 mt-2">{trip.description}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-gray-700 sm:gap-3 sm:text-sm">
                <span className="rounded-full bg-white/80 px-3 py-1.5">📅 {new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}</span>
                <span className="rounded-full bg-white/80 px-3 py-1.5">⏱️ {trip.days}d</span>
                <span className="rounded-full bg-white/80 px-3 py-1.5">🎯 {trip.goal}</span>
                <span className={`px-2 py-1 rounded font-semibold ${trip.status === "planning" ? "bg-yellow-100 text-yellow-800" :
                    trip.status === "active" ? "bg-green-100 text-green-800" :
                      trip.status === "completed" ? "bg-blue-100 text-blue-800" :
                        "bg-red-100 text-red-800"
                  }`}>
                  {trip.status}
                </span>
              </div>
            </div>
            <div className="grid w-full grid-cols-3 gap-2 sm:w-auto sm:flex">
              <Link href="/" className="min-w-0">
                <button className="w-full rounded-lg bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50 whitespace-nowrap">← Back</button>
              </Link>
              {userRole !== "reader" && (
                <button
                  onClick={() => setShowEditModal(true)}
                  className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 whitespace-nowrap">
                  ✏️ Edit
                </button>
              )}
              {tripData?.trip.createdBy === session?.user?.email && (
                <button
                  onClick={() => setShowTravelerRequestsModal(true)}
                  className="rounded-lg bg-purple-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-700 whitespace-nowrap">
                  📋 Requests
                </button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 border-t border-blue-100 pt-4 sm:flex sm:flex-wrap">
            {userRole !== "reader" && (
              <button
                onClick={() => setShowFileModal(true)}
                className="rounded-lg bg-orange-600 px-2 py-2.5 text-xs font-medium text-white shadow-sm hover:bg-orange-700 sm:px-4 sm:text-sm">
                📎 Files
              </button>
            )}
            <button
              onClick={() => setShowMediaModal(true)}
              disabled={userRole === "reader"}
              className={`rounded-lg px-2 py-2.5 text-xs font-medium shadow-sm sm:px-4 sm:text-sm ${userRole === "reader"
                  ? "bg-gray-400 text-gray-600 cursor-not-allowed"
                  : "bg-pink-600 text-white hover:bg-pink-700"
                }`}
              title={userRole === "reader" ? "Guests cannot upload media" : ""}
            >
              📸 Media
            </button>
            {userRole !== "reader" && (
              <button
                onClick={() => setShowExpenseModal(true)}
                className="rounded-lg bg-green-600 px-2 py-2.5 text-xs font-medium text-white shadow-sm hover:bg-green-700 sm:px-4 sm:text-sm">
                💰 Expense
              </button>
            )}
            <button
              onClick={() => {
                setSelectedActivityDestination(destinations.length > 0 ? destinations[0].id : "");
                setShowAddActivityModal(true);
              }}
              disabled={userRole === "reader"}
              className={`rounded-lg px-2 py-2.5 text-xs font-medium shadow-sm sm:px-4 sm:text-sm ${userRole === "reader"
                  ? "bg-gray-400 text-gray-600 cursor-not-allowed"
                  : "bg-purple-600 text-white hover:bg-purple-700"
                }`}
              title={userRole === "reader" ? "Guests cannot add activities" : ""}
            >
              ➕ Activity
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-3 py-5 sm:px-6 sm:py-8 lg:px-8">
        {/* Trip Details */}
        <div className="mb-8">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
            <h2 className="mb-4 text-lg font-bold tracking-wide text-gray-800 sm:text-xl">TRIP DETAILS</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              <div>
                <p className="text-gray-600 text-sm">Duration</p>
                <p className="text-lg font-semibold text-gray-800 sm:text-xl">{trip.days} days</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Travelers</p>
                <p className="text-lg font-semibold text-gray-800 sm:text-xl">{trip.people.length}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Pet</p>
                <p className="text-lg font-semibold text-gray-800 sm:text-xl">{trip.hasPet ? "Yes 🐾" : "No"}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Budget</p>
                <p className="text-lg font-semibold text-gray-800 sm:text-xl">{trip.currency} {trip.totalBudget.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Grid Layout */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
          {/* Trip Schedule */}
          <div className="rounded-2xl border-t-4 border-orange-500 bg-white p-4 shadow-sm sm:p-6">
            <h3 className="mb-4 text-lg font-bold text-gray-800 sm:text-xl">📅 TRIP SCHEDULE</h3>
            <div className="overflow-y-auto max-h-96">
              <Timeline
                events={events}
                tripStartDate={trip.startDate}
                tripEndDate={trip.endDate}
                tripId={trip.id}
              />
            </div>
          </div>

          {/* Budget */}
          {userRole !== "reader" ? (
            <div className="rounded-2xl border-t-4 border-green-500 bg-white p-4 shadow-sm sm:p-6">
              <h3 className="mb-4 text-lg font-bold text-gray-800 sm:text-xl">💰 BUDGET</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-2">Total Budget</p>
                  <p className="text-2xl font-bold text-gray-800">{trip.currency} {stats.totalBudget.toLocaleString()}</p>
                </div>
                <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-green-500 h-full transition-all"
                    style={{ width: `${Math.min(budgetPercentage, 100)}%` }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-gray-600">Spent</p>
                    <p className="font-bold text-gray-800">{trip.currency} {stats.totalSpent.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Remaining</p>
                    <p className={`font-bold ${stats.remaining < 0 ? "text-red-600" : "text-green-600"}`}>
                      {trip.currency} {stats.remaining.toLocaleString()}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-gray-600">{budgetPercentage.toFixed(1)}% spent</p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border-t-4 border-gray-300 bg-white p-4 shadow-sm sm:p-6">
              <h3 className="mb-4 text-lg font-bold text-gray-800 sm:text-xl">💰 BUDGET</h3>
              <div className="flex items-center justify-center py-8">
                <p className="text-gray-500 text-center">You don't have permission to view this content</p>
              </div>
            </div>
          )}

          {/* Trip Feed */}
          {userRole !== "reader" ? (
            <div className="rounded-2xl border-t-4 border-purple-500 bg-white p-4 shadow-sm sm:p-6">
              <h3 className="mb-4 text-lg font-bold text-gray-800 sm:text-xl">💬 TRIP FEED</h3>
              <div className="bg-purple-50 rounded p-3 text-center">
                <p className="text-gray-600 text-sm">Post messages and updates about your trip</p>
              </div>
              <div className="mt-4 space-y-3">
                {feedPosts.length === 0 ? (
                  <p className="text-sm text-gray-600 italic text-center">No posts yet. Be the first to share!</p>
                ) : (
                  feedPosts.map((post) => (
                    <div key={post.id} className="p-3 border border-gray-200 rounded-lg hover:border-purple-400 transition">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-800 text-sm">{post.author}</p>
                          <p className="text-gray-700 text-sm mt-1">{post.content}</p>
                          <p className="text-xs text-gray-500 mt-2">
                            {new Date(post.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <button
                onClick={() => setShowFeedModal(true)}
                className="mt-4 w-full px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
              >
                Post Update
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border-t-4 border-gray-300 bg-white p-4 shadow-sm sm:p-6">
              <h3 className="mb-4 text-lg font-bold text-gray-800 sm:text-xl">💬 TRIP FEED</h3>
              <div className="flex items-center justify-center py-8">
                <p className="text-gray-500 text-center">You don't have permission to view this content</p>
              </div>
            </div>
          )}
        </div>

        {/* Trip Media Section */}
        <div className="mb-8 rounded-2xl border-t-4 border-pink-500 bg-white p-4 shadow-sm sm:p-6">
          <h3 className="mb-5 text-xl font-bold text-gray-800 sm:text-2xl">📸 TRIP MEDIA</h3>
          <MediaGallery
            files={tripFiles}
            onUploadClick={userRole === "reader" ? undefined : () => setShowMediaModal(true)}
          />
        </div>

        {/* Destinations Detailed List */}
        {destinations.length > 0 && (
          <div className="mb-8 rounded-2xl border-t-4 border-blue-500 bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-xl font-bold text-gray-800 sm:text-2xl">🌍 TRIP DESTINATIONS</h3>
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => setDestinationViewMode("list")}
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors sm:px-4 ${destinationViewMode === "list"
                        ? "bg-blue-500 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                  >
                    📋 List
                  </button>
                  <button
                    onClick={() => setDestinationViewMode("map")}
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors sm:px-4 ${destinationViewMode === "map"
                        ? "bg-blue-500 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                  >
                    🗺️ Map
                  </button>
                </div>
                <select
                  value={destinationFilter}
                  onChange={(e) => setDestinationFilter(e.target.value as any)}
                  className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:flex-none"
                >
                  <option value="all">All Destinations</option>
                  {DESTINATION_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {destinationViewMode === "list" ? (
              <div className="space-y-4">
                {destinations
                  .filter((dest) => destinationFilter === "all" || dest.status === destinationFilter)
                  .map((dest) => (
                    <DestinationCardRow
                      key={dest.id}
                      destination={dest}
                      files={tripFiles}
                      activities={activities}
                    />
                  ))}
              </div>
            ) : (
              <DestinationMap
                key={`trip-map-${destinationViewMode}`}
                destinations={destinations.filter(
                  (dest) => destinationFilter === "all" || dest.status === destinationFilter
                )}
                activities={activities}
              />
            )}
          </div>
        )}

        {/* Files Section */}
        <div className="rounded-2xl border-t-4 border-orange-500 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-xl font-bold text-gray-800 sm:text-2xl">📄 TRIP DOCUMENTS</h3>
            <select
              value={documentFilter}
              onChange={(e) => setDocumentFilter(e.target.value as any)}
              className="w-full min-w-0 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 sm:w-auto"
            >
              <option value="all">All Documents</option>
              <option value="document">Documents</option>
              <option value="ticket">Tickets</option>
              <option value="picture">Pictures</option>
              <option value="video">Videos</option>
              <option value="other">Other</option>
            </select>
          </div>
          <FilesList
            files={documentFilter === "all" ? tripFiles : tripFiles.filter(f => f.category === documentFilter)}
            onDelete={userRole === "reader" ? undefined : handleDeleteFile}
            isLoading={deletingFile}
          />
        </div>
      </div>

      {/* Edit Trip Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Edit Trip</h3>
            <form onSubmit={handleEditTrip} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Trip Name *</label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Goal</label>
                  <select
                    value={editFormData.goal}
                    onChange={(e) => setEditFormData({ ...editFormData, goal: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {goals.map((g) => (
                      <option key={g} value={g}>
                        {g.charAt(0).toUpperCase() + g.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {statuses.map((s) => (
                      <option key={s} value={s}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    value={editFormData.startDate}
                    onChange={(e) => setEditFormData({ ...editFormData, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">End Date *</label>
                  <input
                    type="date"
                    value={editFormData.endDate}
                    onChange={(e) => setEditFormData({ ...editFormData, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Travelers</label>
                <input
                  type="text"
                  value={editFormData.travelers}
                  onChange={(e) => setEditFormData({ ...editFormData, travelers: e.target.value })}
                  placeholder="Add emails separated by commas"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Guests (View-Only)</label>
                <input
                  type="text"
                  value={editFormData.guests}
                  onChange={(e) => setEditFormData({ ...editFormData, guests: e.target.value })}
                  placeholder="Add emails separated by commas"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Budget *</label>
                  <input
                    type="number"
                    value={editFormData.totalBudget}
                    onChange={(e) => setEditFormData({ ...editFormData, totalBudget: +e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Currency</label>
                  <select
                    value={editFormData.currency}
                    onChange={(e) => setEditFormData({ ...editFormData, currency: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option>EUR</option>
                    <option>USD</option>
                    <option>GBP</option>
                    <option>JPY</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="editHasPet"
                  checked={editFormData.hasPet}
                  onChange={(e) => setEditFormData({ ...editFormData, hasPet: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="editHasPet" className="text-sm font-semibold text-gray-700">
                  Pet traveling with us 🐾
                </label>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                <textarea
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 h-20"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* File Upload Modal */}
      {showFileModal && userRole !== "reader" && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Upload File</h3>
            <form onSubmit={handleUploadFile} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Document Type
                </label>
                <select
                  value={fileForm.category}
                  onChange={(e) => setFileForm({ ...fileForm, category: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {fileCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Link to Destination (Optional)
                </label>
                <select
                  value={fileForm.destinationId}
                  onChange={(e) => setFileForm({ ...fileForm, destinationId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">None</option>
                  {tripData?.destinations.map((dest) => (
                    <option key={dest.id} value={dest.id}>
                      📍 {dest.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Link to Activity (Optional)
                </label>
                <select
                  value={fileForm.activityId}
                  onChange={(e) => setFileForm({ ...fileForm, activityId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">None</option>
                  {activities.map((activity) => (
                    <option key={activity.id} value={activity.id}>
                      {activity.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  File
                </label>
                <input
                  id="fileInput"
                  type="file"
                  multiple
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <p className="text-xs text-gray-600 mt-1">You can select multiple files at once</p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowFileModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingFile}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
                >
                  {uploadingFile ? "Uploading..." : "Upload"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showFileModal && userRole === "reader" && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">📎 Files</h3>
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <p className="text-gray-600 text-lg mb-4">You don't have permission to view this content</p>
                <button
                  onClick={() => setShowFileModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expense Modal */}
      {showExpenseModal && userRole !== "reader" && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Add Expense</h3>
            <form onSubmit={handleCreateExpense} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={expenseForm.title}
                  onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
                  placeholder="e.g., Hotel booking"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Currency
                  </label>
                  <input
                    type="text"
                    value={expenseForm.currency}
                    onChange={(e) => setExpenseForm({ ...expenseForm, currency: e.target.value })}
                    placeholder="EUR"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    value={expenseForm.date}
                    onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    {expenseCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Linked To Destination (Optional)
                </label>
                <select
                  value={expenseForm.destinationId}
                  onChange={(e) => setExpenseForm({ ...expenseForm, destinationId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">None</option>
                  {destinations.map((dest) => (
                    <option key={dest.id} value={dest.id}>
                      📍 {dest.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={expenseForm.notes}
                  onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                  placeholder="Add any notes about this expense..."
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 h-20 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingExpense}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                >
                  {creatingExpense ? "Adding..." : "Add Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Media Upload Modal */}
      {showMediaModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Upload Photos or Videos</h3>
            <form onSubmit={handleUploadMedia} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Photo or Video File
                </label>
                <input
                  id="mediaInput"
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-600 mt-2">Supported: JPG, PNG, GIF, MP4, WebM, etc. (you can select multiple files)</p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowMediaModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingMedia}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {uploadingMedia ? "Uploading..." : "Upload"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Feed Post Modal */}
      {showFeedModal && userRole !== "reader" && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Post Update to Trip Feed</h3>
            <form onSubmit={handlePostFeed} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Your Message
                </label>
                <textarea
                  value={feedContent}
                  onChange={(e) => setFeedContent(e.target.value)}
                  placeholder="Share an update about your trip..."
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 h-24 resize-none"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowFeedModal(false);
                    setFeedContent("");
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={postingFeed || !feedContent.trim()}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
                >
                  {postingFeed ? "Posting..." : "Post"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showFeedModal && userRole === "reader" && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">💬 Trip Feed</h3>
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <p className="text-gray-600 text-lg mb-4">You don't have permission to view this content</p>
                <button
                  onClick={() => setShowFeedModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Activity Modal */}
      {showAddActivityModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Add Activity</h3>
            <form onSubmit={handleAddActivity} className="space-y-4 pb-24">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Destination *</label>
                <select
                  value={selectedActivityDestination}
                  onChange={(e) => setSelectedActivityDestination(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a destination</option>
                  {destinations.map((dest) => (
                    <option key={dest.id} value={dest.id}>
                      {dest.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Activity Name *</label>
                <input
                  type="text"
                  value={activityForm.name}
                  onChange={(e) => setActivityForm({ ...activityForm, name: e.target.value })}
                  placeholder="e.g., Visit Eiffel Tower"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
                <select
                  value={activityForm.category}
                  onChange={(e) => setActivityForm({ ...activityForm, category: e.target.value as any })}
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
                <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                <textarea
                  value={activityForm.description}
                  onChange={(e) => setActivityForm({ ...activityForm, description: e.target.value })}
                  placeholder="Add details about the activity..."
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 h-20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Estimated Cost</label>
                  <input
                    type="number"
                    value={activityForm.estimatedCost}
                    onChange={(e) => setActivityForm({ ...activityForm, estimatedCost: e.target.value })}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Duration</label>
                  <input
                    type="text"
                    value={activityForm.duration}
                    onChange={(e) => setActivityForm({ ...activityForm, duration: e.target.value })}
                    placeholder="e.g., 2 hours"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">URL</label>
                <input
                  type="url"
                  value={activityForm.url}
                  onChange={(e) => setActivityForm({ ...activityForm, url: e.target.value })}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {selectedActivityDestination && (
                <ActivityRecommendations
                  destinationId={selectedActivityDestination}
                  destinationName={destinations.find((d) => d.id === selectedActivityDestination)?.name || ""}
                  budget={trip.totalBudget}
                  currency={trip.currency}
                  onAddActivity={async (activity) => {
                    await axios.post(`/api/activities`, {
                      ...activity,
                      status: "planned",
                    });
                    toast.success("Activity added successfully!");
                    setShowAddActivityModal(false);
                  }}
                />
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddActivityModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                >
                  Add Activity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Traveler Requests Modal */}
      {tripData && (
        <TravelerRequestsModal
          tripId={tripData.trip.id}
          tripOwnerEmail={tripData.trip.createdBy}
          isOpen={showTravelerRequestsModal}
          onClose={() => setShowTravelerRequestsModal(false)}
          onApprove={() => {
            // Refresh trip data to update people array
            fetchTripData();
          }}
        />
      )}
    </div>
  );
}