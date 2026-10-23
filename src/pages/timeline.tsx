import React, { useState, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import Link from "next/link";
import axios from "axios";
import { TimelineEvent } from "@/types/schema";
import { formatDate } from "@/lib/formatDate";

export default function Timeline() {
  const { data: session, status } = useSession();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: "",
    type: "event" as const,
    category: "",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "authenticated") {
      fetchEvents();
    }
  }, [status]);

  const fetchEvents = async () => {
    try {
      const response = await axios.get("/api/timeline");
      setEvents(response.data);
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await axios.post("/api/timeline", {
        ...formData,
        date: new Date(formData.date),
      });
      setEvents([...events, response.data].sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      ));
      setFormData({
        title: "",
        description: "",
        date: "",
        type: "event",
        category: "",
      });
    } catch (error) {
      console.error("Error adding event:", error);
    }
  };

  const handleToggleComplete = async (id: string, completed: boolean) => {
    try {
      await axios.put(`/api/timeline/${id}`, { completed: !completed });
      fetchEvents();
    } catch (error) {
      console.error("Error updating event:", error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await axios.delete(`/api/timeline/${id}`);
      setEvents(events.filter((e) => e.id !== id));
    } catch (error) {
      console.error("Error deleting event:", error);
    }
  };

  if (status === "unauthenticated") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <button
          onClick={() => signIn()}
          className="px-8 py-3 bg-blue-600 text-white text-lg rounded-lg hover:bg-blue-700"
        >
          Sign In to View Timeline
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Link href="/">
          <button className="mb-4 px-4 py-2 text-gray-600 hover:text-gray-900">← Back</button>
        </Link>

        <h1 className="text-3xl font-bold text-gray-800 mb-8">📅 Trip Timeline</h1>

        {/* Add Event Form */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Add Timeline Event</h2>
          <form onSubmit={handleAddEvent} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Event title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                className="col-span-2 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
                className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="event">Event</option>
                <option value="milestone">Milestone</option>
                <option value="deadline">Deadline</option>
              </select>
              <input
                type="text"
                placeholder="Category (optional)"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="col-span-2 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <textarea
                placeholder="Description (optional)"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="col-span-2 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-20"
              />
            </div>
            <button
              type="submit"
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add Event
            </button>
          </form>
        </div>

        {/* Timeline */}
        {loading ? (
          <p className="text-center text-gray-600">Loading timeline...</p>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-8 top-0 bottom-0 w-1 bg-blue-200"></div>

            {/* Events */}
            <div className="space-y-8">
              {events.length === 0 ? (
                <p className="text-center text-gray-600">No events yet. Start planning!</p>
              ) : (
                events.map((event) => (
                  <div key={event.id} className="relative pl-24">
                    {/* Timeline dot */}
                    <div className="absolute left-0 w-16 h-16 -top-2 flex items-center justify-center">
                      <div className="w-4 h-4 bg-blue-600 rounded-full border-4 border-white"></div>
                    </div>

                    {/* Event card */}
                    <div className={`bg-white p-4 rounded-lg shadow hover:shadow-lg transition ${
                      event.completed ? 'opacity-60' : ''
                    }`}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className={`text-lg font-bold ${event.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                            {event.title}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {formatDate(event.date, {
                              weekday: "long",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </p>
                          <span className="inline-block mt-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                            {event.type}
                          </span>
                          {event.category && (
                            <span className="inline-block ml-2 px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">
                              {event.category}
                            </span>
                          )}
                          {event.description && (
                            <p className="text-gray-600 mt-2">{event.description}</p>
                          )}
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => handleToggleComplete(event.id, event.completed)}
                            className={`px-3 py-1 rounded text-white ${
                              event.completed 
                                ? 'bg-gray-400 hover:bg-gray-500' 
                                : 'bg-green-500 hover:bg-green-600'
                            }`}
                          >
                            {event.completed ? '✓' : 'Check'}
                          </button>
                          <button
                            onClick={() => handleDelete(event.id)}
                            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
