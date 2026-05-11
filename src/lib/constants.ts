/**
 * Centralized App Constants
 * Contains all enums, categories, and color mappings used throughout the application
 */

// ============================================================================
// TRIP CONSTANTS
// ============================================================================

export const TRIP_GOALS = [
  "relaxation",
  "adventure",
  "work",
  "cultural",
  "food",
  "family",
  "other",
] as const;

export type TripGoal = typeof TRIP_GOALS[number];

export const TRIP_STATUSES = ["planning", "booked","active", "completed", "cancelled"] as const;

export type TripStatus = typeof TRIP_STATUSES[number];

// ============================================================================
// DESTINATION CONSTANTS
// ============================================================================

export const DESTINATION_STATUSES = [
  "proposed",
  "accepted",
  "planned",
  "visited",
] as const;

export type DestinationStatus = typeof DESTINATION_STATUSES[number];

export const DESTINATION_STATUS_COLORS: Record<DestinationStatus, string> = {
  proposed: "bg-gray-100 text-gray-800",
  accepted: "bg-blue-100 text-blue-800",
  planned: "bg-yellow-100 text-yellow-800",
  visited: "bg-green-100 text-green-800",
};

// ============================================================================
// FILE CONSTANTS
// ============================================================================

export const FILE_CATEGORIES = [
  "document",
  "ticket",
  "picture",
  "reservation",
  "video",
  "other",
] as const;

export type FileCategory = typeof FILE_CATEGORIES[number];

// ============================================================================
// EXPENSE CONSTANTS
// ============================================================================

export const EXPENSE_CATEGORIES = [
  "accommodation",
  "food",
  "transport",
  "activity",
  "shopping",
  "other",
] as const;

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];

export const EXPENSE_CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  accommodation: "bg-blue-100 text-blue-800",
  food: "bg-orange-100 text-orange-800",
  transport: "bg-purple-100 text-purple-800",
  activity: "bg-green-100 text-green-800",
  shopping: "bg-pink-100 text-pink-800",
  other: "bg-gray-100 text-gray-800",
};

// ============================================================================
// BUDGET LINE ITEM CONSTANTS
// ============================================================================

export const BUDGET_ITEM_CATEGORIES = [
  "accommodation",
  "food",
  "transport",
  "activity",
  "shopping",
  "other",
] as const;

export type BudgetItemCategory = typeof BUDGET_ITEM_CATEGORIES[number];

export const BUDGET_ITEM_CATEGORY_COLORS: Record<BudgetItemCategory, string> = {
  accommodation: "bg-blue-100 text-blue-800",
  food: "bg-orange-100 text-orange-800",
  transport: "bg-purple-100 text-purple-800",
  activity: "bg-green-100 text-green-800",
  shopping: "bg-pink-100 text-pink-800",
  other: "bg-gray-100 text-gray-800",
};

// ============================================================================
// ACTIVITY CONSTANTS
// ============================================================================

export const ACTIVITY_CATEGORIES = [
  "outdoor",
  "cultural",
  "food",
  "relaxation",
  "adventure",
  "nightlife",
  "other",
] as const;

export type ActivityCategory = typeof ACTIVITY_CATEGORIES[number];

export const ACTIVITY_CATEGORY_COLORS: Record<ActivityCategory, string> = {
  outdoor: "bg-green-100 text-green-800",
  cultural: "bg-purple-100 text-purple-800",
  food: "bg-orange-100 text-orange-800",
  relaxation: "bg-blue-100 text-blue-800",
  adventure: "bg-red-100 text-red-800",
  nightlife: "bg-indigo-100 text-indigo-800",
  other: "bg-gray-100 text-gray-800",
};

export const ACTIVITY_STATUSES = [
  "suggested",
  "planned",
  "booked",
  "completed",
  "cancelled",
] as const;

export type ActivityStatus = typeof ACTIVITY_STATUSES[number];

export const ACTIVITY_STATUS_COLORS: Record<ActivityStatus, string> = {
  suggested: "bg-gray-100 text-gray-800",
  planned: "bg-yellow-100 text-yellow-800",
  booked: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

// ============================================================================
// EVENT/TIMELINE CONSTANTS
// ============================================================================

export const TIMELINE_EVENT_TYPES = [
  "milestone",
  "event",
  "deadline",
] as const;

export type TimelineEventType = typeof TIMELINE_EVENT_TYPES[number];

export const TIMELINE_EVENT_CATEGORIES = [
  "flight",
  "accommodation",
  "activity",
  "meal",
  "transport",
  "note",
] as const;

export type TimelineEventCategory = typeof TIMELINE_EVENT_CATEGORIES[number];

export const TIMELINE_EVENT_TYPE_COLORS: Record<TimelineEventType, string> = {
  milestone: "bg-blue-500",
  event: "bg-green-500",
  deadline: "bg-red-500",
};

export const TIMELINE_EVENT_CATEGORY_COLORS: Record<TimelineEventCategory, string> = {
  flight: "bg-cyan-500",
  accommodation: "bg-purple-500",
  activity: "bg-green-500",
  meal: "bg-orange-500",
  transport: "bg-indigo-500",
  note: "bg-yellow-500",
};

export const EVENT_TYPES = [
  "flight",
  "accommodation",
  "activity",
  "meal",
  "transport",
  "note",
] as const;

export type EventType = typeof EVENT_TYPES[number];

export const EVENT_TYPE_COLORS: Record<
  EventType,
  { bg: string; text: string; icon: string }
> = {
  flight: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    icon: "✈️",
  },
  accommodation: {
    bg: "bg-purple-50",
    text: "text-purple-700",
    icon: "🏨",
  },
  activity: {
    bg: "bg-green-50",
    text: "text-green-700",
    icon: "🎯",
  },
  meal: {
    bg: "bg-orange-50",
    text: "text-orange-700",
    icon: "🍽️",
  },
  transport: {
    bg: "bg-indigo-50",
    text: "text-indigo-700",
    icon: "🚗",
  },
  note: {
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    icon: "📝",
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get color class for a destination status
 */
export function getDestinationStatusColor(
  status: DestinationStatus
): string {
  return DESTINATION_STATUS_COLORS[status] || DESTINATION_STATUS_COLORS.proposed;
}

/**
 * Get color class for an expense category
 */
export function getExpenseCategoryColor(
  category: ExpenseCategory
): string {
  return EXPENSE_CATEGORY_COLORS[category] || EXPENSE_CATEGORY_COLORS.other;
}

/**
 * Get color class for a budget item category
 */
export function getBudgetItemCategoryColor(
  category: BudgetItemCategory
): string {
  return (
    BUDGET_ITEM_CATEGORY_COLORS[category] || BUDGET_ITEM_CATEGORY_COLORS.other
  );
}

/**
 * Get color class for an activity category
 */
export function getActivityCategoryColor(
  category: ActivityCategory
): string {
  return ACTIVITY_CATEGORY_COLORS[category] || ACTIVITY_CATEGORY_COLORS.other;
}

/**
 * Get color class for an activity status
 */
export function getActivityStatusColor(status: ActivityStatus): string {
  return ACTIVITY_STATUS_COLORS[status] || ACTIVITY_STATUS_COLORS.suggested;
}

/**
 * Get color object for an event type
 */
export function getEventTypeColor(
  type: EventType
): { bg: string; text: string; icon: string } {
  return EVENT_TYPE_COLORS[type] || EVENT_TYPE_COLORS.note;
}
