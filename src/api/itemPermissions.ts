import { containers } from "@/lib/cosmosdb";
import { ItemPermission } from "@/types/schema";
import { v4 as uuidv4 } from "uuid";

/**
 * Grant permission for a user to access an item
 */
export async function grantPermission(
  itemId: string,
  itemType: "trip" | "destination" | "activity" | "file" | "expense" | "schedule",
  userId: string,
  role: "owner" | "contributor" | "reader",
  parentType?: "trip" | "destination",
  parentId?: string
): Promise<ItemPermission> {
  const permission: ItemPermission = {
    id: uuidv4(),
    itemId,
    itemType,
    userId,
    role,
    parentType,
    parentId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await containers.itemPermissions.items.create(permission);
  return permission;
}

/**
 * Revoke permission for a user to access an item
 */
export async function revokePermission(itemId: string, userId: string): Promise<void> {
  try {
    const { resources } = await containers.itemPermissions.items
      .query({
        query: "SELECT * FROM c WHERE c.itemId = @itemId AND c.userId = @userId",
        parameters: [
          { name: "@itemId", value: itemId },
          { name: "@userId", value: userId },
        ],
      })
      .fetchAll();

    for (const permission of resources) {
      await containers.itemPermissions.item(permission.id, permission.id).delete();
    }
  } catch (error) {
    console.error("Error revoking permission:", error);
  }
}

/**
 * Update a user's role for an item
 */
export async function updatePermissionRole(
  itemId: string,
  userId: string,
  newRole: "owner" | "contributor" | "reader"
): Promise<ItemPermission | null> {
  try {
    const { resources } = await containers.itemPermissions.items
      .query({
        query: "SELECT * FROM c WHERE c.itemId = @itemId AND c.userId = @userId",
        parameters: [
          { name: "@itemId", value: itemId },
          { name: "@userId", value: userId },
        ],
      })
      .fetchAll();

    if (resources.length === 0) {
      return null;
    }

    const permission = resources[0] as ItemPermission;
    permission.role = newRole;
    permission.updatedAt = new Date();

    const result = await containers.itemPermissions.item(permission.id, permission.id).replace(permission);
    return result.resource as ItemPermission;
  } catch (error) {
    console.error("Error updating permission role:", error);
    return null;
  }
}

/**
 * Get user's role for a specific item
 */
export async function getUserPermissionRole(
  itemId: string,
  userId: string
): Promise<"owner" | "contributor" | "reader" | null> {
  try {
    const { resources } = await containers.itemPermissions.items
      .query({
        query: "SELECT * FROM c WHERE c.itemId = @itemId AND (c.userId = @userId OR c.userId = '*')",
        parameters: [
          { name: "@itemId", value: itemId },
          { name: "@userId", value: userId },
        ],
      })
      .fetchAll();

    if (resources.length === 0) {
      return null;
    }

    // Check for direct permission first (higher priority than public)
    for (const perm of resources) {
      if (perm.userId === userId) {
        return perm.role as "owner" | "contributor" | "reader";
      }
    }

    // Fall back to public permission
    for (const perm of resources) {
      if (perm.userId === "*") {
        return perm.role as "owner" | "contributor" | "reader";
      }
    }

    return null;
  } catch (error) {
    console.error("Error getting user permission:", error);
    return null;
  }
}

/**
 * Get all permissions for a specific item
 */
export async function getItemPermissions(itemId: string): Promise<ItemPermission[]> {
  try {
    const { resources } = await containers.itemPermissions.items
      .query({
        query: "SELECT * FROM c WHERE c.itemId = @itemId",
        parameters: [{ name: "@itemId", value: itemId }],
      })
      .fetchAll();

    return resources as ItemPermission[];
  } catch (error) {
    console.error("Error getting item permissions:", error);
    return [];
  }
}

/**
 * Get all items a user has access to (with specific itemType and role)
 */
export async function getUserItems(
  userId: string,
  itemType: string,
  role?: "owner" | "contributor" | "reader"
): Promise<ItemPermission[]> {
  try {
    let query = "SELECT * FROM c WHERE (c.userId = @userId OR c.userId = '*') AND c.itemType = @itemType";
    const parameters: any[] = [
      { name: "@userId", value: userId },
      { name: "@itemType", value: itemType },
    ];

    if (role) {
      query += " AND c.role = @role";
      parameters.push({ name: "@role", value: role });
    }

    const { resources } = await containers.itemPermissions.items
      .query({ query, parameters })
      .fetchAll();

    return resources as ItemPermission[];
  } catch (error) {
    console.error("Error getting user items:", error);
    return [];
  }
}

/**
 * Get all items under a parent (e.g., all destinations in a trip)
 */
export async function getChildItems(
  parentId: string,
  parentType: "trip" | "destination"
): Promise<ItemPermission[]> {
  try {
    const { resources } = await containers.itemPermissions.items
      .query({
        query: "SELECT * FROM c WHERE c.parentId = @parentId AND c.parentType = @parentType",
        parameters: [
          { name: "@parentId", value: parentId },
          { name: "@parentType", value: parentType },
        ],
      })
      .fetchAll();

    return resources as ItemPermission[];
  } catch (error) {
    console.error("Error getting child items:", error);
    return [];
  }
}

/**
 * Check if user can view an item
 */
export async function canViewItem(itemId: string, userId: string): Promise<boolean> {
  const role = await getUserPermissionRole(itemId, userId);
  return role !== null;
}

/**
 * Check if user can edit an item
 */
export async function canEditItem(itemId: string, userId: string): Promise<boolean> {
  const role = await getUserPermissionRole(itemId, userId);
  return role === "owner" || role === "contributor";
}

/**
 * Check if user is the owner of an item
 */
export async function isOwner(itemId: string, userId: string): Promise<boolean> {
  const role = await getUserPermissionRole(itemId, userId);
  return role === "owner";
}

/**
 * Check if item is public
 */
export async function isPublic(itemId: string): Promise<boolean> {
  const role = await getUserPermissionRole(itemId, "*");
  return role !== null;
}

/**
 * Make item public
 */
export async function makePublic(
  itemId: string,
  itemType: "trip" | "destination" | "activity" | "file" | "expense" | "schedule",
  role: "owner" | "contributor" | "reader" = "reader"
): Promise<ItemPermission> {
  // Check if public permission already exists
  const existing = await getUserPermissionRole(itemId, "*");
  if (existing) {
    // Update existing public permission
    const result = await updatePermissionRole(itemId, "*", role);
    if (result) return result;
  }

  // Create new public permission
  return grantPermission(itemId, itemType, "*", role);
}

/**
 * Make item private (remove public permission)
 */
export async function makePrivate(itemId: string): Promise<void> {
  await revokePermission(itemId, "*");
}

/**
 * Create permissions for all trip members when adding destination to trip
 */
export async function grantDestinationToTripMembers(
  destinationId: string,
  tripId: string,
  memberEmails: string[],
  guestEmails: string[]
): Promise<void> {
  try {
    // Grant contributor access to travelers
    for (const email of memberEmails) {
      await grantPermission(
        destinationId,
        "destination",
        email,
        "contributor",
        "trip",
        tripId
      );
    }

    // Grant reader access to guests
    for (const email of guestEmails) {
      await grantPermission(
        destinationId,
        "destination",
        email,
        "reader",
        "trip",
        tripId
      );
    }
  } catch (error) {
    console.error("Error granting destination to trip members:", error);
  }
}

/**
 * Create permissions for all trip members when adding activity to destination
 */
export async function grantActivityToDestinationMembers(
  activityId: string,
  destinationId: string,
  tripId: string,
  memberEmails: string[],
  guestEmails: string[]
): Promise<void> {
  try {
    // Grant contributor access to travelers
    for (const email of memberEmails) {
      await grantPermission(
        activityId,
        "activity",
        email,
        "contributor",
        "destination",
        destinationId
      );
    }

    // Grant reader access to guests
    for (const email of guestEmails) {
      await grantPermission(
        activityId,
        "activity",
        email,
        "reader",
        "destination",
        destinationId
      );
    }
  } catch (error) {
    console.error("Error granting activity to trip members:", error);
  }
}

/**
 * Revoke all permissions for child items when removing from parent
 */
export async function revokeChildPermissions(
  childIds: string[],
  userId: string
): Promise<void> {
  try {
    for (const childId of childIds) {
      await revokePermission(childId, userId);
    }
  } catch (error) {
    console.error("Error revoking child permissions:", error);
  }
}
