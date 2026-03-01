import { Trip } from "@/types/schema";

/**
 * Determines the user's role for a trip
 */
export type UserTripRole = "creator" | "traveler" | "viewer" | "none";

/**
 * Get the user's role for a specific trip
 */
export function getUserTripRole(trip: Trip, userEmail?: string | null): UserTripRole {
  if (!userEmail) {
    return "none";
  }

  if (trip.createdBy === userEmail) {
    return "creator";
  }

  if (trip.people.includes(userEmail)) {
    return "traveler";
  }

  if (trip.viewers.includes(userEmail)) {
    return "viewer";
  }

  return "none";
}

/**
 * Check if user has access to view trip details
 */
export function canViewTrip(trip: Trip, userEmail?: string | null): boolean {
  if (!userEmail) return false;
  const role = getUserTripRole(trip, userEmail);
  return role !== "none";
}

/**
 * Check if user has access to edit trip (creator or traveler only, not viewers)
 */
export function canEditTrip(trip: Trip, userEmail?: string | null): boolean {
  if (!userEmail) return false;
  const role = getUserTripRole(trip, userEmail);
  return role === "creator" || role === "traveler";
}

/**
 * Check if user can manage trip members (creator only)
 */
export function canManageTripMembers(trip: Trip, userEmail?: string | null): boolean {
  if (!userEmail) return false;
  return trip.createdBy === userEmail;
}

/**
 * Check if user can view trip schedule (travelers and viewers can see)
 */
export function canViewTripSchedule(trip: Trip, userEmail?: string | null): boolean {
  return canViewTrip(trip, userEmail);
}

/**
 * Check if user can edit trip schedule (travelers only, not viewers)
 */
export function canEditTripSchedule(trip: Trip, userEmail?: string | null): boolean {
  return canEditTrip(trip, userEmail);
}

/**
 * Check if user can view trip budget (travelers only, not viewers)
 */
export function canViewTripBudget(trip: Trip, userEmail?: string | null): boolean {
  return canEditTrip(trip, userEmail);
}

/**
 * Check if user can view trip destinations (travelers and viewers can see)
 */
export function canViewTripDestinations(trip: Trip, userEmail?: string | null): boolean {
  return canViewTrip(trip, userEmail);
}

/**
 * Check if user can edit trip destinations (travelers only, not viewers)
 */
export function canEditTripDestinations(trip: Trip, userEmail?: string | null): boolean {
  return canEditTrip(trip, userEmail);
}

/**
 * Check if user can view trip activities (travelers and viewers can see)
 */
export function canViewTripActivities(trip: Trip, userEmail?: string | null): boolean {
  return canViewTrip(trip, userEmail);
}

/**
 * Check if user can edit trip activities (travelers only, not viewers)
 */
export function canEditTripActivities(trip: Trip, userEmail?: string | null): boolean {
  return canEditTrip(trip, userEmail);
}

/**
 * Check if user can view trip files/media (travelers only, not viewers)
 */
export function canViewTripFiles(trip: Trip, userEmail?: string | null): boolean {
  return canEditTrip(trip, userEmail);
}

/**
 * Check if user can upload files (travelers only, not viewers)
 */
export function canUploadTripFiles(trip: Trip, userEmail?: string | null): boolean {
  return canEditTrip(trip, userEmail);
}

/**
 * Check if user can view trip feed (travelers and viewers can see)
 */
export function canViewTripFeed(trip: Trip, userEmail?: string | null): boolean {
  return canViewTrip(trip, userEmail);
}

/**
 * Check if user can post to trip feed (travelers only, not viewers)
 */
export function canPostToTripFeed(trip: Trip, userEmail?: string | null): boolean {
  return canEditTrip(trip, userEmail);
}

/**
 * Check if user can view trip expenses (travelers only, not viewers)
 */
export function canViewTripExpenses(trip: Trip, userEmail?: string | null): boolean {
  return canEditTrip(trip, userEmail);
}

/**
 * Check if user can create expense (travelers only)
 */
export function canCreateExpense(trip: Trip, userEmail?: string | null): boolean {
  return canEditTrip(trip, userEmail);
}

/**
 * Check if user can vote on destinations/activities (travelers only, not viewers)
 */
export function canVoteOnItems(trip: Trip, userEmail?: string | null): boolean {
  return canEditTrip(trip, userEmail);
}
