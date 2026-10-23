import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import axios from "axios";
import Link from "next/link";
import { Trip, TimelineEvent, Activity } from "@/types/schema";
import { toast } from "sonner";
import { formatDate } from "@/lib/formatDate";
import { Topbar } from "@/components/Topbar";

interface TripData {
  trip: Trip;
  destinations: any[];
}

const eventTypeColors: Record<string, { bg: string; text: string; icon: string }> = {
  milestone: { bg: "bg-blue-100", text: "text-blue-800", icon: "🎯" },
  event: { bg: "bg-green-100", text: "text-green-800", icon: "📅" },
  deadline: { bg: "bg-red-100", text: "text-red-800", icon: "⏰" },
};

// Utility function to extract URLs from text
function extractUrlsFromText(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const matches = text.match(urlRegex) || [];
  return matches.filter((url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  });
}

// Utility function to extract estimated cost from text (e.g., "100 EUR", "50 GBP")
function extractCostFromText(text: string): { amount: number; currency: string } | null {
  const costRegex = /(\d+(?:\.\d{2})?)\s+(EUR|GBP|USD|CHF|SEK)/i;
  const match = text.match(costRegex);
  if (match) {
    return {
      amount: parseFloat(match[1]),
      currency: match[2].toUpperCase(),
    };
  }
  return null;
}

// Utility function to calculate duration from start and end datetimes
function calculateDuration(startDateTime: string, endDateTime: string): string | undefined {
  try {
    const start = new Date(startDateTime);
    const end = new Date(endDateTime);
    const diffMs = end.getTime() - start.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return diffDays === 1 ? "1 day" : `${diffDays} days`;
    } else if (diffHours > 0) {
      return diffHours === 1 ? "1 hour" : `${diffHours} hours`;
    } else {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return diffMinutes === 1 ? "1 minute" : `${diffMinutes} minutes`;
    }
  } catch {
    return undefined;
  }
}

export default function TripSchedule() {
  const router = useRouter();
  const { id } = router.query;
  const { data: session } = useSession();
  const [tripData, setTripData] = useState<TripData | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [filterType, setFilterType] = useState<"all" | "milestone" | "event" | "deadline">("all");
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [confirmActivityCreation, setConfirmActivityCreation] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
    startDateTime: "",
    endDateTime: "",
    type: "event" as "milestone" | "event" | "deadline",
    category: "",
    activityId: "",
    flightDetails: {
      departureFlightNumber: "",
      departureDateTime: "",
      returnFlightNumber: "",
      returnDateTime: "",
    },
    completed: false,
  });

  const eventCategories = [
    "Flight",
    "Reservation",
    "Activity",
    "Accommodation",
    "Transportation",
    "Meal",
    "Meeting",
    "Packing",
    "Other",
  ];

  useEffect(() => {
    if (!id) return;
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [tripResponse, eventsResponse, activitiesResponse] = await Promise.all([
        axios.get(`/api/trips/${id}`),
        axios.get(`/api/timeline`),
        axios.get(`/api/activities`),
      ]);

      setTripData(tripResponse.data);

      // Filter events for this trip
      const tripEvents = eventsResponse.data.filter(
        (event: TimelineEvent) => event.tripId === id
      );
      // Sort by date
      tripEvents.sort(
        (a: TimelineEvent, b: TimelineEvent) =>
          new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      setEvents(tripEvents);

      // Filter activities for destinations in this trip
      if (tripResponse.data.destinations && tripResponse.data.destinations.length > 0) {
        const destinationIds = new Set(tripResponse.data.destinations.map((d: any) => d.id));
        const tripActivities = (activitiesResponse.data.activities || activitiesResponse.data).filter(
          (activity: Activity) => destinationIds.has(activity.destinationId)
        );
        setActivities(tripActivities);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load schedule");
    } finally {
      setLoading(false);
    }
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !formData.title || !formData.date) {
      toast.error("Please fill in required fields");
      return;
    }

    // Validate flight details if category is Flight
    if (formData.category === "Flight" && !formData.flightDetails.departureFlightNumber) {
      toast.error("Please enter departure flight number for flight events");
      return;
    }

    // Validate activity selection if category is Activity
    if (formData.category === "Activity" && !formData.activityId && !confirmActivityCreation) {
      toast.error(
        "No activity selected. Would you like to create a new one?",
        {
          action: {
            label: "Create Activity",
            onClick: () => {
              setConfirmActivityCreation(true);
              // Re-submit the form by triggering handleAddEvent again
              setTimeout(() => {
                const form = document.querySelector("form") as HTMLFormElement;
                if (form) form.dispatchEvent(new Event("submit", { bubbles: true }));
              }, 0);
            },
          },
        }
      );
      return;
    }

    try {
      let activityId = formData.activityId;

      // If category is Activity and no activity selected, create a new one
      if (formData.category === "Activity" && !activityId) {
        try {
          // Extract information from description
          const urls = extractUrlsFromText(formData.description || "");
          const costInfo = extractCostFromText(formData.description || "");
          const duration =
            formData.startDateTime && formData.endDateTime
              ? calculateDuration(formData.startDateTime, formData.endDateTime)
              : undefined;

          // Create activity without destination - user can assign it later
          const createActivityResponse = await axios.post("/api/activities", {
            name: formData.title,
            description: formData.description,
            destinationId: undefined, // Leave blank for user to fill later
            category: "other",
            url: urls.length > 0 ? urls[0] : undefined,
            estimatedCost: costInfo?.amount,
            currency: costInfo?.currency || "EUR",
            duration,
          });
          
          activityId = createActivityResponse.data.id;

          // Vote for the activity as the creator
          if (session?.user?.email) {
            try {
              await axios.put(`/api/activities/${activityId}?action=vote`, {});
            } catch (voteError) {
              console.error("Error voting for activity:", voteError);
              // Don't fail the activity creation if voting fails
            }
          }

          toast.success("Activity created automatically!");

        } catch (error) {
          console.error("Error creating activity:", error);
          toast.error("Failed to create activity");
          setConfirmActivityCreation(false);
          return;
        }
      }

      const eventData: any = {
        title: formData.title,
        description: formData.description || undefined,
        date: new Date(formData.date),
        type: formData.type,
        category: formData.category || undefined,
        tripId: id,
        completed: formData.completed,
      };

      // Add activityId if category is Activity
      if (formData.category === "Activity" && activityId) {
        eventData.activityId = activityId;
      }

      // Add date-time range if both start and end are provided
      if (formData.startDateTime) {
        eventData.startDateTime = new Date(formData.startDateTime);
      }
      if (formData.endDateTime) {
        eventData.endDateTime = new Date(formData.endDateTime);
      }

      // Add flight details if category is Flight
      if (formData.category === "Flight") {
        eventData.flightDetails = {
          departureFlightNumber: formData.flightDetails.departureFlightNumber,
          departureDateTime: new Date(formData.flightDetails.departureDateTime),
          returnFlightNumber: formData.flightDetails.returnFlightNumber || undefined,
          returnDateTime: formData.flightDetails.returnDateTime ? new Date(formData.flightDetails.returnDateTime) : undefined,
        };
      }

      const response = await axios.post("/api/timeline", eventData);

      setEvents([...events, response.data].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      ));
      setShowAddModal(false);
      setConfirmActivityCreation(false);
      resetForm();
      toast.success("Event added successfully!");
    } catch (error) {
      console.error("Error adding event:", error);
      toast.error("Failed to add event");
      setConfirmActivityCreation(false);
    }
  };

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent || !formData.title || !formData.date) {
      toast.error("Please fill in required fields");
      return;
    }

    // Validate flight details if category is Flight
    if (formData.category === "Flight" && !formData.flightDetails.departureFlightNumber) {
      toast.error("Please enter departure flight number for flight events");
      return;
    }

    // Validate activity selection if category is Activity
    if (formData.category === "Activity" && !formData.activityId) {
      toast.error("Please select an activity");
      return;
    }

    try {
      const eventData: any = {
        title: formData.title,
        description: formData.description || undefined,
        date: new Date(formData.date),
        type: formData.type,
        category: formData.category || undefined,
        completed: formData.completed,
      };

      // Add activityId if category is Activity
      if (formData.category === "Activity" && formData.activityId) {
        eventData.activityId = formData.activityId;
      }

      // Add date-time range if both start and end are provided
      if (formData.startDateTime) {
        eventData.startDateTime = new Date(formData.startDateTime);
      }
      if (formData.endDateTime) {
        eventData.endDateTime = new Date(formData.endDateTime);
      }

      // Add flight details if category is Flight
      if (formData.category === "Flight") {
        eventData.flightDetails = {
          departureFlightNumber: formData.flightDetails.departureFlightNumber,
          departureDateTime: new Date(formData.flightDetails.departureDateTime),
          returnFlightNumber: formData.flightDetails.returnFlightNumber || undefined,
          returnDateTime: formData.flightDetails.returnDateTime ? new Date(formData.flightDetails.returnDateTime) : undefined,
        };
      }

      const response = await axios.put(`/api/timeline/${selectedEvent.id}`, eventData);

      setEvents(
        events
          .map((e) => (e.id === selectedEvent.id ? response.data : e))
          .sort(
            (a, b) =>
              new Date(a.date).getTime() - new Date(b.date).getTime()
          )
      );
      setShowEditModal(false);
      setSelectedEvent(null);
      resetForm();
      toast.success("Event updated successfully!");
    } catch (error) {
      console.error("Error updating event:", error);
      toast.error("Failed to update event");
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm("Are you sure you want to delete this event?")) return;

    try {
      await axios.delete(`/api/timeline/${eventId}`);
      setEvents(events.filter((e) => e.id !== eventId));
      toast.success("Event deleted successfully!");
    } catch (error) {
      console.error("Error deleting event:", error);
      toast.error("Failed to delete event");
    }
  };

  const handleToggleComplete = async (event: TimelineEvent) => {
    try {
      const response = await axios.put(`/api/timeline/${event.id}`, {
        ...event,
        completed: !event.completed,
      });
      setEvents(
        events.map((e) => (e.id === event.id ? response.data : e))
      );
      toast.success(
        event.completed ? "Event marked as incomplete" : "Event marked as complete"
      );
    } catch (error) {
      console.error("Error updating event:", error);
      toast.error("Failed to update event");
    }
  };

  const openEditModal = (event: TimelineEvent) => {
    setSelectedEvent(event);
    setFormData({
      title: event.title,
      description: event.description || "",
      date: new Date(event.date).toISOString().split("T")[0],
      startDateTime: event.startDateTime ? new Date(event.startDateTime).toISOString().slice(0, 16) : "",
      endDateTime: event.endDateTime ? new Date(event.endDateTime).toISOString().slice(0, 16) : "",
      type: event.type,
      category: event.category || "",
      activityId: event.activityId || "",
      flightDetails: {
        departureFlightNumber: event.flightDetails?.departureFlightNumber || "",
        departureDateTime: event.flightDetails?.departureDateTime ? new Date(event.flightDetails.departureDateTime).toISOString().slice(0, 16) : "",
        returnFlightNumber: event.flightDetails?.returnFlightNumber || "",
        returnDateTime: event.flightDetails?.returnDateTime ? new Date(event.flightDetails.returnDateTime).toISOString().slice(0, 16) : "",
      },
      completed: event.completed,
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      date: new Date().toISOString().split("T")[0],
      startDateTime: "",
      endDateTime: "",
      type: "event" as "milestone" | "event" | "deadline",
      category: "",
      activityId: "",
      flightDetails: {
        departureFlightNumber: "",
        departureDateTime: "",
        returnFlightNumber: "",
        returnDateTime: "",
      },
      completed: false,
    });
    setSelectedEvent(null);
    setConfirmActivityCreation(false);
  };

  const filteredEvents =
    filterType === "all"
      ? events
      : events.filter((e) => e.type === filterType);

  const groupedByDate: Record<string, TimelineEvent[]> = {};
  filteredEvents.forEach((event) => {
    const dateStr = new Date(event.date).toISOString().split("T")[0];
    if (!groupedByDate[dateStr]) {
      groupedByDate[dateStr] = [];
    }
    groupedByDate[dateStr].push(event);
  });

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!tripData) {
    return <div className="min-h-screen flex items-center justify-center">Trip not found</div>;
  }

  const { trip } = tripData;

  // Determine if user is a guest (viewer)
  const userEmail = session?.user?.email;
  const isGuest = !!(userEmail &&
    trip.createdBy !== userEmail &&
    !trip.people?.includes(userEmail) &&
    trip.viewers?.includes(userEmail));

  return (
    <div className="min-h-screen bg-gray-50">
      <Topbar />
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Trip Schedule</h1>
              <p className="text-gray-600 mt-2">{trip.name}</p>
            </div>
            <div className="flex gap-2">
              <Link href={`/trips/${trip.id}`}>
                <button className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">
                  ← Back to Trip
                </button>
              </Link>
              <button
                onClick={() => {
                  resetForm();
                  setShowAddModal(true);
                }}
                disabled={isGuest}
                className={`px-4 py-2 rounded font-semibold ${
                  isGuest
                    ? "bg-gray-400 text-gray-600 cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
                title={isGuest ? "Guests cannot add events" : ""}
              >
                + Add Event
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Controls */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setFilterType("all")}
                className={`px-4 py-2 rounded font-semibold transition ${
                  filterType === "all"
                    ? "bg-gray-800 text-white"
                    : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                }`}
              >
                All Events
              </button>
              <button
                onClick={() => setFilterType("milestone")}
                className={`px-4 py-2 rounded font-semibold transition flex items-center gap-1 ${
                  filterType === "milestone"
                    ? "bg-blue-600 text-white"
                    : "bg-blue-100 text-blue-800 hover:bg-blue-200"
                }`}
              >
                🎯 Milestones
              </button>
              <button
                onClick={() => setFilterType("event")}
                className={`px-4 py-2 rounded font-semibold transition flex items-center gap-1 ${
                  filterType === "event"
                    ? "bg-green-600 text-white"
                    : "bg-green-100 text-green-800 hover:bg-green-200"
                }`}
              >
                📅 Events
              </button>
              <button
                onClick={() => setFilterType("deadline")}
                className={`px-4 py-2 rounded font-semibold transition flex items-center gap-1 ${
                  filterType === "deadline"
                    ? "bg-red-600 text-white"
                    : "bg-red-100 text-red-800 hover:bg-red-200"
                }`}
              >
                ⏰ Deadlines
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setViewMode("list")}
                className={`px-4 py-2 rounded font-semibold transition ${
                  viewMode === "list"
                    ? "bg-orange-600 text-white"
                    : "bg-orange-100 text-orange-800 hover:bg-orange-200"
                }`}
              >
                📋 List
              </button>
              <button
                onClick={() => setViewMode("calendar")}
                className={`px-4 py-2 rounded font-semibold transition ${
                  viewMode === "calendar"
                    ? "bg-orange-600 text-white"
                    : "bg-orange-100 text-orange-800 hover:bg-orange-200"
                }`}
              >
                📆 Calendar
              </button>
            </div>
          </div>
        </div>

        {/* Events Display */}
        {filteredEvents.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-600">No events scheduled yet. Use “+ Add Event” above to plan the first one.</p>
          </div>
        ) : viewMode === "list" ? (
          // List View
          <div className="space-y-4">
            {Object.entries(groupedByDate).map(([date, dateEvents]) => (
              <div key={date}>
                <h3 className="text-sm font-bold text-gray-600 mb-3 px-4 py-2 bg-gray-200 rounded">
                  {formatDate(date, {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </h3>
                <div className="space-y-2">
                  {dateEvents.map((event) => (
                    <div
                      key={event.id}
                      className={`p-4 rounded-lg shadow transition ${
                        eventTypeColors[event.type].bg
                      } ${event.completed ? "opacity-60" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl">
                              {eventTypeColors[event.type].icon}
                            </span>
                            <h4
                              className={`text-lg font-bold ${
                                event.completed
                                  ? "line-through text-gray-600"
                                  : "text-gray-800"
                              }`}
                            >
                              {event.title}
                            </h4>
                            <span
                              className={`px-2 py-1 text-xs rounded font-semibold ${eventTypeColors[event.type].text} ${eventTypeColors[event.type].bg}`}
                            >
                              {event.type}
                            </span>
                            {event.category && (
                              <span className="px-2 py-1 text-xs rounded bg-gray-200 text-gray-700 font-semibold">
                                {event.category}
                              </span>
                            )}
                            {event.activityId && (
                              <span className="px-2 py-1 text-xs rounded bg-purple-200 text-purple-700 font-semibold">
                                🎯 Linked Activity
                              </span>
                            )}
                          </div>
                          {event.description && (
                            <p className="text-gray-700 text-sm mb-2">
                              {event.description}
                            </p>
                          )}
                          <p className="text-xs text-gray-600">
                            By {event.createdBy} •{" "}
                            {formatDate(event.createdAt)}
                          </p>
                        </div>
                        <div className="flex gap-2 flex-col sm:flex-row">
                          <button
                            onClick={() => handleToggleComplete(event)}
                            disabled={isGuest}
                            className={`px-3 py-1 rounded text-sm font-semibold transition ${
                              isGuest
                                ? "bg-gray-400 text-gray-600 cursor-not-allowed"
                                : event.completed
                                ? "bg-gray-400 text-white hover:bg-gray-500"
                                : "bg-green-600 text-white hover:bg-green-700"
                            }`}
                            title={isGuest ? "Guests cannot mark events" : ""}
                          >
                            {event.completed ? "✓ Done" : "Mark Done"}
                          </button>
                          <button
                            onClick={() => openEditModal(event)}
                            disabled={isGuest}
                            className={`px-3 py-1 rounded text-sm font-semibold ${
                              isGuest
                                ? "bg-gray-400 text-gray-600 cursor-not-allowed"
                                : "bg-blue-600 text-white hover:bg-blue-700"
                            }`}
                            title={isGuest ? "Guests cannot edit events" : ""}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteEvent(event.id)}
                            disabled={isGuest}
                            className={`px-3 py-1 rounded text-sm font-semibold ${
                              isGuest
                                ? "bg-gray-400 text-gray-600 cursor-not-allowed"
                                : "bg-red-600 text-white hover:bg-red-700"
                            }`}
                            title={isGuest ? "Guests cannot delete events" : ""}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Calendar View (simple - shows all events)
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEvents.map((event) => (
              <div
                key={event.id}
                className={`p-4 rounded-lg shadow border-l-4 transition ${
                  eventTypeColors[event.type].bg
                } ${event.completed ? "opacity-60" : ""}`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-2xl">
                    {eventTypeColors[event.type].icon}
                  </span>
                  <span className="text-xs font-bold text-gray-600">
                    {formatDate(event.date, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <h4
                  className={`text-lg font-bold mb-1 ${
                    event.completed ? "line-through text-gray-600" : "text-gray-800"
                  }`}
                >
                  {event.title}
                </h4>
                <p className="text-xs text-gray-600 mb-3">
                  {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                  {event.category ? ` • ${event.category}` : ""}
                  {event.activityId ? " • 🎯 Has Activity" : ""}
                </p>
                {event.description && (
                  <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                    {event.description}
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleToggleComplete(event)}
                    disabled={isGuest}
                    className={`flex-1 px-2 py-1 rounded text-xs font-semibold transition ${
                      isGuest
                        ? "bg-gray-400 text-gray-600 cursor-not-allowed"
                        : event.completed
                        ? "bg-gray-400 text-white hover:bg-gray-500"
                        : "bg-green-600 text-white hover:bg-green-700"
                    }`}
                    title={isGuest ? "Guests cannot mark events" : ""}
                  >
                    {event.completed ? "✓" : "Done"}
                  </button>
                  <button
                    onClick={() => openEditModal(event)}
                    disabled={isGuest}
                    className={`flex-1 px-2 py-1 rounded text-xs font-semibold ${
                      isGuest
                        ? "bg-gray-400 text-gray-600 cursor-not-allowed"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    }`}
                    title={isGuest ? "Guests cannot edit events" : ""}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteEvent(event.id)}
                    disabled={isGuest}
                    className={`flex-1 px-2 py-1 rounded text-xs font-semibold ${
                      isGuest
                        ? "bg-gray-400 text-gray-600 cursor-not-allowed"
                        : "bg-red-600 text-white hover:bg-red-700"
                    }`}
                    title={isGuest ? "Guests cannot delete events" : ""}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Event Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Add Event</h3>
            <form onSubmit={handleAddEvent} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Event Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Flight Departure"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Event Type *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value as any })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="event">📅 Event</option>
                  <option value="milestone">🎯 Milestone</option>
                  <option value="deadline">⏰ Deadline</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a category...</option>
                  {eventCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Activity Selection Section */}
              {formData.category === "Activity" && (
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    📍 Select Activity (or leave blank to create new)
                  </label>
                  <select
                    value={formData.activityId}
                    onChange={(e) =>
                      setFormData({ ...formData, activityId: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Create new activity from event details</option>
                    {activities.map((activity) => (
                      <option key={activity.id} value={activity.id}>
                        {activity.name}
                      </option>
                    ))}
                  </select>
                  {!formData.activityId && (
                    <p className="text-xs text-purple-600 mt-2">
                      💡 A new activity will be created using the event title and description
                    </p>
                  )}
                </div>
              )}

              {/* Flight Details Section */}
              {formData.category === "Flight" && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 space-y-3">
                  <h4 className="font-semibold text-blue-900">✈️ Flight Details</h4>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Departure Flight Number *
                    </label>
                    <input
                      type="text"
                      value={formData.flightDetails.departureFlightNumber}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          flightDetails: {
                            ...formData.flightDetails,
                            departureFlightNumber: e.target.value,
                          },
                        })
                      }
                      placeholder="e.g., AA123"
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Departure Date & Time *
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.flightDetails.departureDateTime}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          flightDetails: {
                            ...formData.flightDetails,
                            departureDateTime: e.target.value,
                          },
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Return Flight Number
                    </label>
                    <input
                      type="text"
                      value={formData.flightDetails.returnFlightNumber}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          flightDetails: {
                            ...formData.flightDetails,
                            returnFlightNumber: e.target.value,
                          },
                        })
                      }
                      placeholder="e.g., AA456 (optional)"
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {formData.flightDetails.returnFlightNumber && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Return Date & Time
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.flightDetails.returnDateTime}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            flightDetails: {
                              ...formData.flightDetails,
                              returnDateTime: e.target.value,
                            },
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Date-Time Range Section */}
              {formData.category !== "Flight" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Start Date & Time (Optional)
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.startDateTime}
                      onChange={(e) =>
                        setFormData({ ...formData, startDateTime: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      End Date & Time (Optional)
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.endDateTime}
                      onChange={(e) =>
                        setFormData({ ...formData, endDateTime: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Add more details about this event..."
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="completed"
                  checked={formData.completed}
                  onChange={(e) =>
                    setFormData({ ...formData, completed: e.target.checked })
                  }
                  className="rounded"
                />
                <label htmlFor="completed" className="text-sm font-semibold text-gray-700">
                  Mark as completed
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold"
                >
                  Add Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Event Modal */}
      {showEditModal && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Edit Event</h3>
            <form onSubmit={handleUpdateEvent} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Event Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Flight Departure"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Event Type *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value as any })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="event">📅 Event</option>
                  <option value="milestone">🎯 Milestone</option>
                  <option value="deadline">⏰ Deadline</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a category...</option>
                  {eventCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Activity Selection Section */}
              {formData.category === "Activity" && (
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    📍 Select Activity
                  </label>
                  <select
                    value={formData.activityId}
                    onChange={(e) =>
                      setFormData({ ...formData, activityId: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">-- Select an activity --</option>
                    {activities.map((activity) => (
                      <option key={activity.id} value={activity.id}>
                        {activity.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Flight Details Section */}
              {formData.category === "Flight" && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 space-y-3">
                  <h4 className="font-semibold text-blue-900">✈️ Flight Details</h4>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Departure Flight Number *
                    </label>
                    <input
                      type="text"
                      value={formData.flightDetails.departureFlightNumber}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          flightDetails: {
                            ...formData.flightDetails,
                            departureFlightNumber: e.target.value,
                          },
                        })
                      }
                      placeholder="e.g., AA123"
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Departure Date & Time *
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.flightDetails.departureDateTime}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          flightDetails: {
                            ...formData.flightDetails,
                            departureDateTime: e.target.value,
                          },
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Return Flight Number
                    </label>
                    <input
                      type="text"
                      value={formData.flightDetails.returnFlightNumber}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          flightDetails: {
                            ...formData.flightDetails,
                            returnFlightNumber: e.target.value,
                          },
                        })
                      }
                      placeholder="e.g., AA456 (optional)"
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {formData.flightDetails.returnFlightNumber && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Return Date & Time
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.flightDetails.returnDateTime}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            flightDetails: {
                              ...formData.flightDetails,
                              returnDateTime: e.target.value,
                            },
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Date-Time Range Section */}
              {formData.category !== "Flight" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Start Date & Time (Optional)
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.startDateTime}
                      onChange={(e) =>
                        setFormData({ ...formData, startDateTime: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      End Date & Time (Optional)
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.endDateTime}
                      onChange={(e) =>
                        setFormData({ ...formData, endDateTime: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Add more details about this event..."
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="completed-edit"
                  checked={formData.completed}
                  onChange={(e) =>
                    setFormData({ ...formData, completed: e.target.checked })
                  }
                  className="rounded"
                />
                <label htmlFor="completed-edit" className="text-sm font-semibold text-gray-700">
                  Mark as completed
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold"
                >
                  Update Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
