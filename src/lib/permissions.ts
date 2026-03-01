/**
 * Permission helper functions for use in API endpoints
 * These provide a convenient layer for checking permissions
 */

import * as permissionsApi from "@/api/itemPermissions";

type ItemType = "trip" | "destination" | "activity" | "file" | "expense" | "schedule";
type Role = "owner" | "contributor" | "reader";

/**
 * Check if user can perform an action on an item
 */
export async function checkPermission(
  itemId: string,
  userId: string,
  requiredRole: Role | Role[]
): Promise<boolean> {
  const userRole = await permissionsApi.getUserPermissionRole(itemId, userId);
  
  if (!userRole) return false;

  const required = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  
  // Owner can do anything
  if (userRole === "owner") return true;
  
  // Check if user has required role
  return required.includes(userRole as Role);
}

/**
 * Assert that user has required permission, throw if not
 */
export async function assertPermission(
  itemId: string,
  userId: string,
  requiredRole: Role | Role[],
  message: string = "Insufficient permissions"
): Promise<void> {
  const hasPermission = await checkPermission(itemId, userId, requiredRole);
  if (!hasPermission) {
    throw new Error(message);
  }
}

/**
 * Get items a user can view (reader, contributor, or owner)
 */
export async function getViewableItems(
  userId: string,
  itemType: ItemType
): Promise<string[]> {
  const permissions = await permissionsApi.getUserItems(userId, itemType);
  return permissions.map(p => p.itemId);
}

/**
 * Get items a user can edit (contributor or owner)
 */
export async function getEditableItems(
  userId: string,
  itemType: ItemType
): Promise<string[]> {
  const permissions = await permissionsApi.getUserItems(userId, itemType, "contributor");
  const ownerPermissions = await permissionsApi.getUserItems(userId, itemType, "owner");
  
  const itemIds = new Set<string>();
  for (const p of [...permissions, ...ownerPermissions]) {
    itemIds.add(p.itemId);
  }
  
  return Array.from(itemIds);
}

/**
 * Get items a user owns
 */
export async function getOwnedItems(
  userId: string,
  itemType: ItemType
): Promise<string[]> {
  const permissions = await permissionsApi.getUserItems(userId, itemType, "owner");
  return permissions.map(p => p.itemId);
}

/**
 * Filter array of items by viewability
 */
export async function filterViewableItems<T extends { id: string }>(
  items: T[],
  userId: string,
  itemType: ItemType
): Promise<T[]> {
  const viewableIds = await getViewableItems(userId, itemType);
  const idSet = new Set(viewableIds);
  return items.filter(item => idSet.has(item.id));
}

/**
 * Filter array of items by editability
 */
export async function filterEditableItems<T extends { id: string }>(
  items: T[],
  userId: string,
  itemType: ItemType
): Promise<T[]> {
  const editableIds = await getEditableItems(userId, itemType);
  const idSet = new Set(editableIds);
  return items.filter(item => idSet.has(item.id));
}

/**
 * Get activity items where user has required role on parent destination
 */
export async function canAccessActivityThroughDestination(
  activityId: string,
  destinationId: string,
  userId: string,
  requiredRole: Role | Role[]
): Promise<boolean> {
  // Check if activity has the destination as parent
  const activityPermissions = await permissionsApi.getItemPermissions(activityId);
  const isChildOfDest = activityPermissions.some(p => p.parentId === destinationId);
  
  if (!isChildOfDest) return false;
  
  // Check if user has required role on destination
  return checkPermission(destinationId, userId, requiredRole);
}

/**
 * Get destination items where user has required role on parent trip
 */
export async function canAccessDestinationThroughTrip(
  destinationId: string,
  tripId: string,
  userId: string,
  requiredRole: Role | Role[]
): Promise<boolean> {
  // Check if destination has the trip as parent
  const destPermissions = await permissionsApi.getItemPermissions(destinationId);
  const isChildOfTrip = destPermissions.some(p => p.parentId === tripId);
  
  if (!isChildOfTrip) return false;
  
  // Check if user has required role on trip
  return checkPermission(tripId, userId, requiredRole);
}

export default {
  checkPermission,
  assertPermission,
  getViewableItems,
  getEditableItems,
  getOwnedItems,
  filterViewableItems,
  filterEditableItems,
  canAccessActivityThroughDestination,
  canAccessDestinationThroughTrip,
};
