import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import * as tripsApi from "@/api/trips";
import { notifyUserAddedToTrip, notifyUserRemovedFromTrip } from "@/lib/notifications";
import handler from "@/pages/api/trips/[id]";
import tripsHandler from "@/pages/api/trips";
import { Trip } from "@/types/schema";

jest.mock("next-auth/next", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/pages/api/auth/authConfig", () => ({
  authOptions: {},
}));

jest.mock("@/api/trips", () => ({
  getTrips: jest.fn(),
  createTrip: jest.fn(),
  getTrip: jest.fn(),
  getTripWithStats: jest.fn(),
  updateTrip: jest.fn(),
  deleteTrip: jest.fn(),
}));

jest.mock("@/lib/notifications", () => ({
  notifyUserAddedToTrip: jest.fn(),
  notifyUserRemovedFromTrip: jest.fn(),
}));

const tripId = "50e84000-e29b-41d4-a716-446655440000";
const creatorEmail = "creator@example.com";
const travelerEmail = "traveler@example.com";
const viewerEmail = "viewer@example.com";

const trip: Trip = {
  id: tripId,
  name: "Summer Roadtrip",
  goal: "adventure",
  startDate: new Date("2028-06-01"),
  endDate: new Date("2028-06-15"),
  days: 15,
  people: [travelerEmail],
  viewers: [viewerEmail],
  hasPet: false,
  status: "planning",
  totalBudget: 5000,
  currency: "USD",
  createdBy: creatorEmail,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

const getSessionMock = getServerSession as jest.Mock;
const getTripsMock = tripsApi.getTrips as jest.Mock;
const createTripMock = tripsApi.createTrip as jest.Mock;
const getTripMock = tripsApi.getTrip as jest.Mock;
const getTripWithStatsMock = tripsApi.getTripWithStats as jest.Mock;
const updateTripMock = tripsApi.updateTrip as jest.Mock;
const deleteTripMock = tripsApi.deleteTrip as jest.Mock;
const notifyUserAddedMock = notifyUserAddedToTrip as jest.Mock;
const notifyUserRemovedMock = notifyUserRemovedFromTrip as jest.Mock;

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

describe("Trip API route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getSessionMock.mockResolvedValue({
      user: { email: creatorEmail },
      expires: "2028-01-01",
    });
  });

  it("rejects requests without a session", async () => {
    getSessionMock.mockResolvedValue(null);
    const response = createResponse();

    await handler(createRequest("GET", { id: tripId }), response);

    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith({ error: "Unauthorized" });
    expect(getTripWithStatsMock).not.toHaveBeenCalled();
  });

  it("returns 400 when the trip ID is missing", async () => {
    const response = createResponse();

    await handler(createRequest("GET"), response);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({ error: "Trip ID is required" });
  });

  it("returns 404 when the requested trip does not exist", async () => {
    getTripWithStatsMock.mockResolvedValue(null);
    const response = createResponse();

    await handler(createRequest("GET", { id: tripId }), response);

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ error: "Trip not found" });
  });

  it("allows a viewer to read a trip", async () => {
    getSessionMock.mockResolvedValue({
      user: { email: viewerEmail },
      expires: "2028-01-01",
    });
    const tripData = { trip, stats: {} };
    getTripWithStatsMock.mockResolvedValue(tripData);
    const response = createResponse();

    await handler(createRequest("GET", { id: tripId }), response);

    expect(getTripWithStatsMock).toHaveBeenCalledWith(tripId, viewerEmail);
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith(tripData);
  });

  it("denies trip reads to users who are not members", async () => {
    getSessionMock.mockResolvedValue({
      user: { email: "stranger@example.com" },
      expires: "2028-01-01",
    });
    getTripWithStatsMock.mockResolvedValue({ trip, stats: {} });
    const response = createResponse();

    await handler(createRequest("GET", { id: tripId }), response);

    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith({
      error: "You do not have access to this trip",
    });
  });

  it("prevents viewers from updating a trip", async () => {
    getSessionMock.mockResolvedValue({
      user: { email: viewerEmail },
      expires: "2028-01-01",
    });
    getTripMock.mockResolvedValue(trip);
    const response = createResponse();

    await handler(
      createRequest("PUT", { id: tripId }, { name: "Changed name" }),
      response
    );

    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith({
      error: "You do not have permission to edit this trip",
    });
    expect(updateTripMock).not.toHaveBeenCalled();
  });

  it("updates a trip for a traveler with valid input", async () => {
    getSessionMock.mockResolvedValue({
      user: { email: travelerEmail },
      expires: "2028-01-01",
    });
    getTripMock.mockResolvedValue(trip);
    const updatedTrip = { ...trip, name: "Updated roadtrip" };
    updateTripMock.mockResolvedValue(updatedTrip);
    const response = createResponse();

    await handler(
      createRequest("PUT", { id: tripId }, { name: updatedTrip.name }),
      response
    );

    expect(updateTripMock).toHaveBeenCalledWith(tripId, { name: updatedTrip.name });
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith(updatedTrip);
  });

  it("notifies members when travelers and viewers are added or removed", async () => {
    const newTravelerEmail = "new-traveler@example.com";
    const newViewerEmail = "new-viewer@example.com";
    getTripMock.mockResolvedValue(trip);
    const updatedTrip = {
      ...trip,
      people: [newTravelerEmail],
      viewers: [newViewerEmail],
    };
    updateTripMock.mockResolvedValue(updatedTrip);
    const response = createResponse();

    await handler(
      createRequest(
        "PUT",
        { id: tripId },
        { people: [newTravelerEmail], viewers: [newViewerEmail] }
      ),
      response
    );

    const tripUrl = `${process.env.NEXTAUTH_URL}/trips/${tripId}`;
    expect(notifyUserAddedMock).toHaveBeenCalledWith(
      [newTravelerEmail],
      "new-traveler",
      trip.name,
      creatorEmail,
      tripUrl
    );
    expect(notifyUserRemovedMock).toHaveBeenCalledWith(
      travelerEmail,
      "traveler",
      trip.name
    );
    expect(notifyUserAddedMock).toHaveBeenCalledWith(
      [newViewerEmail],
      "new-viewer",
      trip.name,
      creatorEmail,
      tripUrl
    );
    expect(notifyUserRemovedMock).toHaveBeenCalledWith(
      viewerEmail,
      "viewer",
      trip.name
    );
    expect(response.status).toHaveBeenCalledWith(200);
  });

  it("allows only the creator to delete a trip", async () => {
    getSessionMock.mockResolvedValue({
      user: { email: travelerEmail },
      expires: "2028-01-01",
    });
    getTripMock.mockResolvedValue(trip);
    const response = createResponse();

    await handler(createRequest("DELETE", { id: tripId }), response);

    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith({
      error: "Only the trip creator can delete this trip",
    });
    expect(deleteTripMock).not.toHaveBeenCalled();
  });

  it("deletes a trip for its creator", async () => {
    getTripMock.mockResolvedValue(trip);
    deleteTripMock.mockResolvedValue(true);
    const response = createResponse();

    await handler(createRequest("DELETE", { id: tripId }), response);

    expect(deleteTripMock).toHaveBeenCalledWith(tripId);
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({ success: true });
  });

  it("returns 405 for unsupported HTTP methods", async () => {
    const response = createResponse();

    await handler(createRequest("PATCH", { id: tripId }), response);

    expect(response.status).toHaveBeenCalledWith(405);
    expect(response.json).toHaveBeenCalledWith({ error: "Method not allowed" });
  });

  it("returns 500 when loading a trip fails", async () => {
    getTripWithStatsMock.mockRejectedValue(new Error("database unavailable"));
    const response = createResponse();

    await handler(createRequest("GET", { id: tripId }), response);

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({ error: "Failed to fetch trip" });
  });

  it("returns 404 when updating a trip that does not exist", async () => {
    getTripMock.mockResolvedValue(null);
    const response = createResponse();

    await handler(
      createRequest("PUT", { id: tripId }, { name: "Updated roadtrip" }),
      response
    );

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ error: "Trip not found" });
    expect(updateTripMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the update operation cannot find the trip", async () => {
    getTripMock.mockResolvedValue(trip);
    updateTripMock.mockResolvedValue(null);
    const response = createResponse();

    await handler(
      createRequest("PUT", { id: tripId }, { name: "Updated roadtrip" }),
      response
    );

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ error: "Trip not found" });
  });

  it("returns 404 when deleting a trip that does not exist", async () => {
    getTripMock.mockResolvedValue(null);
    const response = createResponse();

    await handler(createRequest("DELETE", { id: tripId }), response);

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ error: "Trip not found" });
    expect(deleteTripMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the delete operation reports no trip was deleted", async () => {
    getTripMock.mockResolvedValue(trip);
    deleteTripMock.mockResolvedValue(false);
    const response = createResponse();

    await handler(createRequest("DELETE", { id: tripId }), response);

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({ error: "Trip not found" });
  });

  it("lists trips for the signed-in user", async () => {
    getTripsMock.mockResolvedValue([trip]);
    const response = createResponse();

    await tripsHandler(createRequest("GET"), response);

    expect(getTripsMock).toHaveBeenCalledWith(creatorEmail);
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith([trip]);
  });

  it("creates a trip using validated defaults and the signed-in user's email", async () => {
    const input = {
      name: "New Roadtrip",
      goal: "family",
      startDate: "2028-07-01",
      endDate: "2028-07-10",
      totalBudget: 2500,
    };
    const createdTrip = { ...trip, ...input, createdBy: creatorEmail };
    createTripMock.mockResolvedValue(createdTrip);
    const response = createResponse();

    await tripsHandler(createRequest("POST", {}, input), response);

    expect(createTripMock).toHaveBeenCalledWith(
      expect.objectContaining({
        ...input,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        people: [],
        viewers: [],
        hasPet: false,
        status: "planning",
        currency: "EUR",
      }),
      creatorEmail
    );
    expect(response.status).toHaveBeenCalledWith(201);
    expect(response.json).toHaveBeenCalledWith(createdTrip);
  });

  it("returns 500 when trip creation fails", async () => {
    createTripMock.mockRejectedValue(new Error("database unavailable"));
    const response = createResponse();

    await tripsHandler(
      createRequest("POST", {}, {
        name: "New Roadtrip",
        goal: "family",
        startDate: "2028-07-01",
        endDate: "2028-07-10",
        totalBudget: 2500,
      }),
      response
    );

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({ error: "Failed to create trip" });
  });

  it("rejects trip-list requests without a session", async () => {
    getSessionMock.mockResolvedValue(null);
    const response = createResponse();

    await tripsHandler(createRequest("GET"), response);

    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith({ error: "Unauthorized" });
    expect(getTripsMock).not.toHaveBeenCalled();
  });

  it("returns 500 when listing trips fails", async () => {
    getTripsMock.mockRejectedValue(new Error("database unavailable"));
    const response = createResponse();

    await tripsHandler(createRequest("GET"), response);

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({ error: "Failed to fetch trips" });
  });

  it("returns 405 for unsupported trip-list methods", async () => {
    const response = createResponse();

    await tripsHandler(createRequest("DELETE"), response);

    expect(response.status).toHaveBeenCalledWith(405);
    expect(response.json).toHaveBeenCalledWith({ error: "Method not allowed" });
  });
});
