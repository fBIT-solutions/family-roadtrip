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

/**
 * Check if user is a viewer (read-only access) for a trip
 */
export function isViewer(trip: Trip, userEmail?: string | null): boolean {
  if (!userEmail) return false;
  return trip.viewers.includes(userEmail);
}

/**
 * Filter files to show only appropriate categories for viewers
 * Viewers can only see "picture" and "video" categories
 */
export function filterFilesForUser(files: any[], trip: Trip, userEmail?: string | null): any[] {
  // If user is a viewer, only show picture and video files
  if (isViewer(trip, userEmail)) {
    return files.filter(file => file.category === "picture" || file.category === "video");
  }
  // Travelers and creators can see all files
  return files;
}

/**
 * Frontend helper: Filter files based on whether destination is in a viewer's trip
 * This is used client-side when trip info might not always be available
 */
export function filterFilesForViewerDisplay(
  files: any[],
  destinationTripId?: string,
  isViewerRole?: boolean
): any[] {
  // If destination is in a trip and user is a viewer, filter to pictures and videos only
  if (destinationTripId && isViewerRole) {
    return files.filter(file => file.category === "picture" || file.category === "video");
  }
  // Otherwise show all files
  return files;
}
