import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import * as activitiesApi from "@/api/activities";
import * as destinationsApi from "@/api/destinations";
import * as itemPermissionsApi from "@/api/itemPermissions";
import * as tripsApi from "@/api/trips";
import activityHandler from "@/pages/api/activities/[id]";
import destinationsHandler from "@/pages/api/destinations";

jest.mock("next-auth/next", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/pages/api/auth/[...nextauth]", () => ({
  authOptions: {},
}));

jest.mock("@/api/activities", () => ({
  getActivityById: jest.fn(),
  updateActivity: jest.fn(),
  deleteActivity: jest.fn(),
}));

jest.mock("@/api/destinations", () => ({
  getDestinationsByTrip: jest.fn(),
  getDestinationsForUser: jest.fn(),
  getPublicDestinations: jest.fn(),
  createDestination: jest.fn(),
  getDestination: jest.fn(),
}));

jest.mock("@/api/itemPermissions", () => ({
  canViewItem: jest.fn(),
}));

jest.mock("@/api/itemReferences", () => ({
  getItemReferencesByUser: jest.fn(),
}));

jest.mock("@/api/trips", () => ({
  getTrip: jest.fn(),
  getTrips: jest.fn(),
}));

jest.mock("@/lib/notifications", () => ({
  notifyNewDestinationAdded: jest.fn(),
  notifyVoteOnItem: jest.fn(),
  notifyStatusChanged: jest.fn(),
}));

const userEmail = "traveler@example.com";
const tripId = "50e84000-e29b-41d4-a716-446655440000";
const destinationId = "50e84000-e29b-41d4-a716-446655440001";
const activityId = "50e84000-e29b-41d4-a716-446655440002";

const getSessionMock = getServerSession as jest.Mock;
const canViewItemMock = itemPermissionsApi.canViewItem as jest.Mock;
const getTripMock = tripsApi.getTrip as jest.Mock;
const getDestinationsByTripMock = destinationsApi.getDestinationsByTrip as jest.Mock;
const getPublicDestinationsMock = destinationsApi.getPublicDestinations as jest.Mock;
const createDestinationMock = destinationsApi.createDestination as jest.Mock;
const getActivityByIdMock = activitiesApi.getActivityById as jest.Mock;
const updateActivityMock = activitiesApi.updateActivity as jest.Mock;
const deleteActivityMock = activitiesApi.deleteActivity as jest.Mock;

function createRequest(
  method: string,
  query: Record<string, string | string[]> = {},
  body: Record<string, unknown> = {}
): NextApiRequest {
  return { method, query, body } as unknown as NextApiRequest;
}

function createResponse() {
  const response = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
  return response as unknown as NextApiResponse & typeof response;
}

describe("Destinations API route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getSessionMock.mockResolvedValue({
      user: { email: userEmail },
      expires: "2028-01-01",
    });
  });

  it("returns only public destinations to unauthenticated users", async () => {
    const publicDestinations = [{ id: destinationId, name: "Public destination" }];
    getSessionMock.mockResolvedValue(null);
    getPublicDestinationsMock.mockResolvedValue(publicDestinations);
    const response = createResponse();

    await destinationsHandler(createRequest("GET"), response);

    expect(getPublicDestinationsMock).toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({
      destinations: publicDestinations,
      itemReferences: [],
    });
  });

  it("requires authentication to list destinations for a trip", async () => {
    getSessionMock.mockResolvedValue(null);
    const response = createResponse();

    await destinationsHandler(
      createRequest("GET", { tripId }),
      response
    );

    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith({ error: "Unauthorized" });
    expect(getTripMock).not.toHaveBeenCalled();
  });

  it("denies trip destination access when the user lacks permission", async () => {
    getTripMock.mockResolvedValue({ id: tripId });
    canViewItemMock.mockResolvedValue(false);
    const response = createResponse();

    await destinationsHandler(createRequest("GET", { tripId }), response);

    expect(canViewItemMock).toHaveBeenCalledWith(tripId, userEmail);
    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith({
      error: "You do not have access to this trip's destinations",
    });
    expect(getDestinationsByTripMock).not.toHaveBeenCalled();
  });

  it("returns destinations for a trip the user can view", async () => {
    const destinations = [{ id: destinationId, name: "Coast" }];
    getTripMock.mockResolvedValue({ id: tripId });
    canViewItemMock.mockResolvedValue(true);
    getDestinationsByTripMock.mockResolvedValue(destinations);
    const response = createResponse();

    await destinationsHandler(createRequest("GET", { tripId }), response);

    expect(getDestinationsByTripMock).toHaveBeenCalledWith(tripId);
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith(destinations);
  });

  it("returns 404 for destinations belonging to a missing trip", async () => {
    getTripMock.mockResolvedValue(null);
    const response = createResponse();

    await destinationsHandler(createRequest("GET", { tripId }), response);

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ error: "Trip not found" });
  });

  it("requires authentication before creating a destination", async () => {
    getSessionMock.mockResolvedValue(null);
    const response = createResponse();

    await destinationsHandler(
      createRequest("POST", {}, { name: "Coast" }),
      response
    );

    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith({ error: "Unauthorized" });
    expect(createDestinationMock).not.toHaveBeenCalled();
  });

  it("creates a destination for the signed-in user", async () => {
    const input = { name: "Coast", country: "Portugal" };
    const createdDestination = { id: destinationId, ...input, addedBy: userEmail };
    createDestinationMock.mockResolvedValue(createdDestination);
    const response = createResponse();

    await destinationsHandler(createRequest("POST", {}, input), response);

    expect(createDestinationMock).toHaveBeenCalledWith(
      { ...input, addedBy: userEmail },
      userEmail,
      undefined
    );
    expect(response.status).toHaveBeenCalledWith(201);
    expect(response.json).toHaveBeenCalledWith(createdDestination);
  });

  it("returns 405 for unsupported destination methods", async () => {
    const response = createResponse();

    await destinationsHandler(createRequest("DELETE"), response);

    expect(response.status).toHaveBeenCalledWith(405);
    expect(response.json).toHaveBeenCalledWith({ error: "Method not allowed" });
  });
});

describe("Activity API route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getSessionMock.mockResolvedValue({
      user: { email: userEmail },
      expires: "2028-01-01",
    });
  });

  it("rejects unauthenticated activity requests", async () => {
    getSessionMock.mockResolvedValue(null);
    const response = createResponse();

    await activityHandler(createRequest("GET", { id: activityId }), response);

    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith({ error: "Unauthorized" });
    expect(getActivityByIdMock).not.toHaveBeenCalled();
  });

  it("returns an activity by ID", async () => {
    const activity = { id: activityId, name: "Visit the coast" };
    getActivityByIdMock.mockResolvedValue(activity);
    const response = createResponse();

    await activityHandler(createRequest("GET", { id: activityId }), response);

    expect(getActivityByIdMock).toHaveBeenCalledWith(activityId);
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith(activity);
  });

  it("returns 404 when the activity does not exist", async () => {
    getActivityByIdMock.mockResolvedValue(null);
    const response = createResponse();

    await activityHandler(createRequest("GET", { id: activityId }), response);

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ error: "Activity not found" });
  });

  it("allows the activity owner to update it", async () => {
    const activity = { id: activityId, addedBy: userEmail };
    const update = { name: "Updated activity" };
    const updatedActivity = { ...activity, ...update };
    getActivityByIdMock.mockResolvedValue(activity);
    updateActivityMock.mockResolvedValue(updatedActivity);
    const response = createResponse();

    await activityHandler(
      createRequest("PUT", { id: activityId }, update),
      response
    );

    expect(updateActivityMock).toHaveBeenCalledWith(activityId, update);
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith(updatedActivity);
  });

  it("prevents non-owners from updating an activity", async () => {
    getActivityByIdMock.mockResolvedValue({
      id: activityId,
      addedBy: "another-user@example.com",
    });
    const response = createResponse();

    await activityHandler(
      createRequest("PUT", { id: activityId }, { name: "Unauthorized change" }),
      response
    );

    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith({
      error: "You do not have permission to edit this activity",
    });
    expect(updateActivityMock).not.toHaveBeenCalled();
  });

  it("allows the activity owner to delete it", async () => {
    getActivityByIdMock.mockResolvedValue({
      id: activityId,
      addedBy: userEmail,
    });
    const response = createResponse();

    await activityHandler(
      createRequest("DELETE", { id: activityId }),
      response
    );

    expect(deleteActivityMock).toHaveBeenCalledWith(activityId);
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({ success: true });
  });

  it("prevents non-owners from deleting an activity", async () => {
    getActivityByIdMock.mockResolvedValue({
      id: activityId,
      addedBy: "another-user@example.com",
    });
    const response = createResponse();

    await activityHandler(
      createRequest("DELETE", { id: activityId }),
      response
    );

    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith({
      error: "You do not have permission to delete this activity",
    });
    expect(deleteActivityMock).not.toHaveBeenCalled();
  });
});
