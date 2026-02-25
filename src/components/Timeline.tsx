import React from "react";
import { TimelineEvent } from "@/types/schema";
import Link from "next/link";

interface TimelineProps {
  events: TimelineEvent[];
  tripStartDate: Date;
  tripEndDate: Date;
  tripId?: string;
}

const eventTypeIcons: Record<string, string> = {
  milestone: "🎯",
  event: "📅",
  deadline: "⏰",
};

const eventTypeColors: Record<string, string> = {
  milestone: "text-blue-600",
  event: "text-green-600",
  deadline: "text-red-600",
};

export function Timeline({ events, tripStartDate, tripEndDate, tripId }: TimelineProps) {
  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="relative">
      {/* Timeline Container */}
      <div className="space-y-0">
        {/* Trip Start */}
        <div className="flex gap-4 pb-4">
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-lg flex-shrink-0">
              🏳️
            </div>
            <div className="w-1 flex-grow bg-gray-300 min-h-12" />
          </div>
          <div className="pb-4">
            <p className="font-semibold text-gray-800 text-sm">Trip Start</p>
            <p className="text-xs text-gray-600">{formatDate(tripStartDate)}</p>
          </div>
        </div>

        {/* Events */}
        {sortedEvents.length > 0 ? (
          sortedEvents.map((event, index) => (
            <Link 
              key={event.id} 
              href={tripId ? `/trips/${tripId}/schedule#event-${event.id}` : "#"}
            >
              <div className="flex gap-4 cursor-pointer hover:opacity-75 transition-opacity">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full ${
                      event.completed
                        ? "bg-gray-400"
                        : event.type === "milestone"
                        ? "bg-blue-500"
                        : event.type === "deadline"
                        ? "bg-red-500"
                        : "bg-green-500"
                    } text-white flex items-center justify-center font-semibold text-lg flex-shrink-0`}
                  >
                    {eventTypeIcons[event.type]}
                  </div>
                  {index < sortedEvents.length - 1 && (
                    <div className="w-1 flex-grow bg-gray-300 min-h-16" />
                  )}
                </div>
                <div className="pb-8 flex-1">
                  <div className="flex items-start gap-2 flex-wrap">
                    <div className="flex-1">
                      <p
                        className={`font-semibold text-sm ${
                          event.completed
                            ? "line-through text-gray-500"
                            : "text-gray-800 hover:text-blue-600"
                        }`}
                      >
                        {event.title}
                      </p>
                      <p className="text-xs text-gray-600">
                        {formatDate(event.date)}
                        {event.startDateTime && event.endDateTime && (
                          <>
                            <br />
                            {new Date(event.startDateTime).toLocaleTimeString(
                              "en-US",
                              { hour: "2-digit", minute: "2-digit" }
                            )}{" "}
                            -{" "}
                            {new Date(event.endDateTime).toLocaleTimeString(
                              "en-US",
                              { hour: "2-digit", minute: "2-digit" }
                            )}
                          </>
                        )}
                      </p>
                      {event.category && (
                        <p className="text-xs text-blue-600 font-medium mt-1">
                          {event.category}
                        </p>
                      )}
                      {event.activityId && (
                        <p className="text-xs text-purple-600 font-medium mt-1">
                          🎯 Linked to activity
                        </p>
                      )}
                      {event.flightDetails && (
                        <div className="text-xs text-gray-600 mt-2 bg-blue-50 p-2 rounded">
                          <p className="font-semibold text-blue-600">Flight</p>
                          <p>
                            Depart: {event.flightDetails.departureFlightNumber} @{" "}
                            {new Date(
                              event.flightDetails.departureDateTime
                            ).toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                          {event.flightDetails.returnFlightNumber && (
                            <p>
                              Return: {event.flightDetails.returnFlightNumber} @{" "}
                              {new Date(
                                event.flightDetails.returnDateTime!
                              ).toLocaleTimeString("en-US", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          )}
                        </div>
                      )}
                      {event.description && (
                        <p className="text-xs text-gray-700 mt-2 line-clamp-2">
                          {event.description}
                        </p>
                      )}
                    </div>
                    <div className="text-xs">
                      {event.completed && (
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                          ✓ Done
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="w-1 h-16 bg-gray-200" />
            </div>
            <div className="text-sm text-gray-500 italic py-4">
              No events scheduled. Add one to get started!
            </div>
          </div>
        )}

        {/* Trip End */}
        <div className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="w-1 h-8 bg-gray-300" />
            <div className="w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center font-bold text-lg flex-shrink-0">
              🏁
            </div>
          </div>
          <div>
            <p className="font-semibold text-gray-800 text-sm">Trip End</p>
            <p className="text-xs text-gray-600">{formatDate(tripEndDate)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
