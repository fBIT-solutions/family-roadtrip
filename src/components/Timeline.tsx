import React from "react";
import { TimelineEvent } from "@/types/schema";
import Link from "next/link";
import { formatDate as formatUiDate } from "@/lib/formatDate";

interface TimelineProps {
  events: TimelineEvent[];
  tripStartDate: Date;
  tripEndDate: Date;
  tripId?: string;
}

interface TimelineEntry {
  type: "primary" | "checkout" | "return";
  event: TimelineEvent;
  title: string;
  date: Date;
  icon: string;
  color: string;
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
  // Expand events to include checkout and return entries
  const expandedEntries: TimelineEntry[] = [];

  events.forEach((event) => {
    // Determine category for icon/color
    const isAccommodation = event.category === "Accommodation";
    const isFlight = event.category === "Flight";

    // Add primary event
    expandedEntries.push({
      type: "primary",
      event,
      title: event.title,
      date: new Date(event.date),
      icon: isAccommodation ? "🏨" : isFlight ? "✈️" : eventTypeIcons[event.type] || "📌",
      color: isAccommodation ? "text-purple-600" : isFlight ? "text-cyan-600" : eventTypeColors[event.type] || "text-gray-600",
    });

    // Add checkout for accommodations with end date
    if (isAccommodation && event.endDateTime) {
      expandedEntries.push({
        type: "checkout",
        event,
        title: "[Check-out] " + event.title,
        date: new Date(event.endDateTime),
        icon: "🚪",
        color: "text-gray-600",
      });
    }

    // Add return for flights with return flight details
    if (isFlight && event.flightDetails?.returnFlightNumber) {
      expandedEntries.push({
        type: "return",
        event,
        title: "[Return] " + event.title,
        date: new Date(event.flightDetails.returnDateTime!),
        icon: "🔙",
        color: "text-gray-600",
      });
    }
  });

  const sortedEntries = expandedEntries.sort((a, b) => a.date.getTime() - b.date.getTime());

  const formatDate = (date: Date) => {
    return formatUiDate(date, {
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
        {sortedEntries.length > 0 ? (
          sortedEntries.map((entry, index) => (
            <Link 
              key={`${entry.event.id}-${entry.type}`} 
              href={tripId ? `/trips/${tripId}/schedule#event-${entry.event.id}` : "#"}
            >
              <div className="flex gap-4 cursor-pointer hover:opacity-75 transition-opacity">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full ${
                      entry.event.completed
                        ? "bg-gray-400"
                        : entry.event.category === "accommodation"
                        ? "bg-purple-500"
                        : entry.event.category === "flight"
                        ? "bg-cyan-500"
                        : entry.event.type === "milestone"
                        ? "bg-blue-500"
                        : entry.event.type === "deadline"
                        ? "bg-red-500"
                        : "bg-green-500"
                    } text-white flex items-center justify-center font-semibold text-lg flex-shrink-0`}
                  >
                    {entry.icon}
                  </div>
                  {index < sortedEntries.length - 1 && (
                    <div className="w-1 flex-grow bg-gray-300 min-h-16" />
                  )}
                </div>
                <div className="pb-8 flex-1">
                  <div className="flex items-start gap-2 flex-wrap">
                    <div className="flex-1">
                      <p
                        className={`font-semibold text-sm ${
                          entry.event.completed
                            ? "line-through text-gray-500"
                            : "text-gray-800 hover:text-blue-600"
                        }`}
                      >
                        {entry.title}
                      </p>
                      <p className="text-xs text-gray-600">
                        {formatDate(entry.date)}
                        {entry.event.startDateTime && entry.event.endDateTime && entry.type === "primary" && (
                          <>
                            <br />
                            {new Date(entry.event.startDateTime).toLocaleTimeString(
                              "en-US",
                              { hour: "2-digit", minute: "2-digit" }
                            )}{" "}
                            -{" "}
                            {new Date(entry.event.endDateTime).toLocaleTimeString(
                              "en-US",
                              { hour: "2-digit", minute: "2-digit" }
                            )}
                          </>
                        )}
                        {entry.type === "checkout" && entry.event.endDateTime && (
                          <>
                            <br />
                            {new Date(entry.event.endDateTime).toLocaleTimeString(
                              "en-US",
                              { hour: "2-digit", minute: "2-digit" }
                            )}
                          </>
                        )}
                        {entry.type === "return" && entry.event.flightDetails?.returnDateTime && (
                          <>
                            <br />
                            {new Date(entry.event.flightDetails.returnDateTime).toLocaleTimeString(
                              "en-US",
                              { hour: "2-digit", minute: "2-digit" }
                            )}
                            {" "}({entry.event.flightDetails.returnFlightNumber})
                          </>
                        )}
                      </p>
                      {entry.event.category && entry.type === "primary" && (
                        <p className="text-xs text-blue-600 font-medium mt-1">
                          {entry.event.category}
                        </p>
                      )}
                      {entry.event.activityId && entry.type === "primary" && (
                        <p className="text-xs text-purple-600 font-medium mt-1">
                          🎯 Linked to activity
                        </p>
                      )}
                      {entry.event.flightDetails && entry.type === "primary" && (
                        <div className="text-xs text-gray-600 mt-2 bg-blue-50 p-2 rounded">
                          <p className="font-semibold text-blue-600">Flight</p>
                          <p>
                            Depart: {entry.event.flightDetails.departureFlightNumber} @{" "}
                            {new Date(
                              entry.event.flightDetails.departureDateTime
                            ).toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                          {entry.event.flightDetails.returnFlightNumber && (
                            <p>
                              Return: {entry.event.flightDetails.returnFlightNumber} @{" "}
                              {new Date(
                                entry.event.flightDetails.returnDateTime!
                              ).toLocaleTimeString("en-US", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          )}
                        </div>
                      )}
                      {entry.event.description && entry.type === "primary" && (
                        <p className="text-xs text-gray-700 mt-2 line-clamp-2">
                          {entry.event.description}
                        </p>
                      )}
                    </div>
                    <div className="text-xs">
                      {entry.event.completed && entry.type === "primary" && (
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
