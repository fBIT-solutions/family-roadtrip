import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import * as activitiesApi from "@/api/activities";
import * as destinationsApi from "@/api/destinations";
import * as expensesApi from "@/api/expenses";
import * as permissionsApi from "@/api/itemPermissions";
import * as reservationsApi from "@/api/reservations";
import * as timelineApi from "@/api/timeline";
import * as tripsApi from "@/api/trips";
import activityHandler from "@/pages/api/activities/[id]";
import createActivityHandler from "@/pages/api/activities";
import destinationVoteHandler from "@/pages/api/destinations/[id]/vote";
import expensesHandler from "@/pages/api/expenses";
import reservationsHandler from "@/pages/api/reservations";
import timelineHandler from "@/pages/api/timeline";
import { canVoteOnItems } from "@/lib/auth-helpers";
import { notifyVoteOnItem } from "@/lib/notifications";

jest.mock("next-auth/next", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/pages/api/auth/[...nextauth]", () => ({
  authOptions: {},
}));

jest.mock("@/api/activities", () => ({
  getActivityById: jest.fn(),
  createActivity: jest.fn(),
  voteActivity: jest.fn(),
  updateActivityStatus: jest.fn(),
}));

jest.mock("@/api/destinations", () => ({
  getDestination: jest.fn(),
  voteForDestination: jest.fn(),
}));

jest.mock("@/api/expenses", () => ({
  getExpensesByTripId: jest.fn(),
  createExpense: jest.fn(),
}));

jest.mock("@/api/reservations", () => ({
  getReservations: jest.fn(),
  createReservation: jest.fn(),
}));

jest.mock("@/api/itemPermissions", () => ({
  canViewItem: jest.fn(),
  canEditItem: jest.fn(),
}));

jest.mock("@/api/itemReferences", () => ({
  getItemReferencesByUser: jest.fn(),
}));

jest.mock("@/api/timeline", () => ({
  getTimelineEvents: jest.fn(),
  createTimelineEvent: jest.fn(),
}));

jest.mock("@/api/trips", () => ({
  getTrip: jest.fn(),
}));

jest.mock("@/lib/auth-helpers", () => ({
  canVoteOnItems: jest.fn(),
}));

jest.mock("@/lib/notifications", () => ({
  notifyNewActivityAdded: jest.fn(),
  notifyVoteOnItem: jest.fn(),
  notifyStatusChanged: jest.fn(),
}));

const travelerEmail = "traveler@example.com";
const viewerEmail = "viewer@example.com";
const destinationOwnerEmail = "owner@example.com";
const tripId = "50e84000-e29b-41d4-a716-446655440000";
const destinationId = "50e84000-e29b-41d4-a716-446655440001";
const activityId = "50e84000-e29b-41d4-a716-446655440002";

const getSessionMock = getServerSession as jest.Mock;
const getDestinationMock = destinationsApi.getDestination as jest.Mock;
const voteForDestinationMock = destinationsApi.voteForDestination as jest.Mock;
const getActivityMock = activitiesApi.getActivityById as jest.Mock;
const createActivityMock = activitiesApi.createActivity as jest.Mock;
const voteActivityMock = activitiesApi.voteActivity as jest.Mock;
const updateActivityStatusMock = activitiesApi.updateActivityStatus as jest.Mock;
const notifyVoteOnItemMock = notifyVoteOnItem as jest.Mock;
const canVoteMock = canVoteOnItems as jest.Mock;
const getTripMock = tripsApi.getTrip as jest.Mock;
const canViewItemMock = permissionsApi.canViewItem as jest.Mock;
const canEditItemMock = permissionsApi.canEditItem as jest.Mock;
const getTimelineEventsMock = timelineApi.getTimelineEvents as jest.Mock;
const createTimelineEventMock = timelineApi.createTimelineEvent as jest.Mock;
const getExpensesByTripMock = expensesApi.getExpensesByTripId as jest.Mock;
const createExpenseMock = expensesApi.createExpense as jest.Mock;
const createReservationMock = reservationsApi.createReservation as jest.Mock;

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

function setSession(email = travelerEmail) {
  getSessionMock.mockResolvedValue({
    user: { email },
    expires: "2028-01-01",
  });
}

describe("Critical collaborative planning flows", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setSession();
  });

  it("lets a trip traveler vote on a destination and returns the updated destination", async () => {
    const destination = {
      id: destinationId,
      name: "Coast",
      tripId,
      addedBy: destinationOwnerEmail,
      votedBy: [],
    };
    const updatedDestination = { ...destination, votedBy: [travelerEmail] };
    getDestinationMock
      .mockResolvedValueOnce(destination)
      .mockResolvedValueOnce(updatedDestination);
    getTripMock.mockResolvedValue({
      id: tripId,
      name: "Summer Roadtrip",
      createdBy: destinationOwnerEmail,
    });
    canVoteMock.mockReturnValue(true);
    voteForDestinationMock.mockResolvedValue(true);
    const response = createResponse();

    await destinationVoteHandler(
      createRequest("POST", { id: destinationId }),
      response
    );

    expect(voteForDestinationMock).toHaveBeenCalledWith(destinationId, travelerEmail);
    expect(notifyVoteOnItemMock).toHaveBeenCalledWith(
      destinationOwnerEmail,
      "owner",
      "Coast",
      "destination",
      "upvoted",
      travelerEmail,
      `${process.env.NEXTAUTH_URL}/destinations/${destinationId}`
    );
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith(updatedDestination);
  });

  it("prevents a viewer from voting on a trip destination", async () => {
    setSession(viewerEmail);
    getDestinationMock.mockResolvedValue({
      id: destinationId,
      name: "Coast",
      tripId,
      votedBy: [],
    });
    getTripMock.mockResolvedValue({
      id: tripId,
      name: "Summer Roadtrip",
      people: [],
      viewers: [],
    });
    canVoteMock.mockReturnValue(false);
    const response = createResponse();

    await destinationVoteHandler(
      createRequest("POST", { id: destinationId }),
      response
    );

    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "You do not have permission to vote",
        reason: "GUEST_NOT_TRAVELER",
      })
    );
    expect(voteForDestinationMock).not.toHaveBeenCalled();
  });

  it("lets a traveler vote on an activity and notifies its owner", async () => {
    const activity = {
      id: activityId,
      name: "Kayaking",
      destinationId,
      addedBy: destinationOwnerEmail,
      votedBy: [],
    };
    const updatedActivity = { ...activity, votedBy: [travelerEmail] };
    getActivityMock.mockResolvedValue(activity);
    getDestinationMock.mockResolvedValue({ id: destinationId, tripId });
    getTripMock.mockResolvedValue({
      id: tripId,
      people: [travelerEmail],
      viewers: [],
    });
    canVoteMock.mockReturnValue(true);
    voteActivityMock.mockResolvedValue(updatedActivity);
    const response = createResponse();

    await activityHandler(
      createRequest("PUT", { id: activityId, action: "vote" }),
      response
    );

    expect(voteActivityMock).toHaveBeenCalledWith(activityId, travelerEmail);
    expect(notifyVoteOnItemMock).toHaveBeenCalledWith(
      destinationOwnerEmail,
      "owner",
      "Kayaking",
      "activity",
      "upvoted",
      travelerEmail,
      `${process.env.NEXTAUTH_URL}/activities/${activityId}`
    );
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith(updatedActivity);
  });

  it("blocks viewers from voting on an activity linked to a trip", async () => {
    setSession(viewerEmail);
    getActivityMock.mockResolvedValue({
      id: activityId,
      name: "Kayaking",
      destinationId,
      votedBy: [],
    });
    getDestinationMock.mockResolvedValue({ id: destinationId, tripId });
    getTripMock.mockResolvedValue({
      id: tripId,
      name: "Summer Roadtrip",
      createdBy: destinationOwnerEmail,
    });
    canVoteMock.mockReturnValue(false);
    const response = createResponse();

    await activityHandler(
      createRequest("PUT", { id: activityId, action: "vote" }),
      response
    );

    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "You do not have permission to vote",
        reason: "GUEST_NOT_TRAVELER",
      })
    );
    expect(voteActivityMock).not.toHaveBeenCalled();
  });

  it("lets an activity owner add an activity to a destination", async () => {
    const destination = { id: destinationId, name: "Coast", tripId };
    const newActivity = { id: activityId, name: "Kayaking", destinationId };
    getDestinationMock.mockResolvedValue(destination);
    getTripMock.mockResolvedValue({
      id: tripId,
      name: "Summer Roadtrip",
      people: [],
      viewers: [],
    });
    createActivityMock.mockResolvedValue(newActivity);
    const response = createResponse();

    await createActivityHandler(
      createRequest("POST", {}, { name: "Kayaking", destinationId }),
      response
    );

    expect(createActivityMock).toHaveBeenCalledWith(
      "Kayaking",
      destinationId,
      travelerEmail,
      expect.objectContaining({
        category: undefined,
        description: undefined,
        status: undefined,
      }),
      tripId
    );
    expect(response.status).toHaveBeenCalledWith(201);
    expect(response.json).toHaveBeenCalledWith(newActivity);
  });

  it("requires an activity name and destination when creating an activity", async () => {
    const response = createResponse();

    await createActivityHandler(
      createRequest("POST", {}, { name: "Kayaking" }),
      response
    );

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      error: "Missing required fields: name, destinationId",
    });
    expect(createActivityMock).not.toHaveBeenCalled();
  });

  it("lets an activity owner change its status", async () => {
    getActivityMock.mockResolvedValue({
      id: activityId,
      name: "Kayaking",
      addedBy: travelerEmail,
      status: "suggested",
    });
    const updatedActivity = { id: activityId, status: "planned" };
    updateActivityStatusMock.mockResolvedValue(updatedActivity);
    const response = createResponse();

    await activityHandler(
      createRequest("PUT", { id: activityId, action: "status" }, { status: "planned" }),
      response
    );

    expect(updateActivityStatusMock).toHaveBeenCalledWith(activityId, "planned");
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith(updatedActivity);
  });

  it("prevents users who did not create an activity from changing its status", async () => {
    getActivityMock.mockResolvedValue({
      id: activityId,
      addedBy: destinationOwnerEmail,
      status: "suggested",
    });
    const response = createResponse();

    await activityHandler(
      createRequest("PUT", { id: activityId, action: "status" }, { status: "planned" }),
      response
    );

    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith({
      error: "You do not have permission to update this activity",
    });
    expect(updateActivityStatusMock).not.toHaveBeenCalled();
  });
});

describe("Critical trip schedule and expense flows", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setSession();
  });

  it("returns only events belonging to the requested trip", async () => {
    const matchingEvent = { id: "event-1", tripId };
    const events = [matchingEvent, { id: "event-2", tripId: "another-trip" }];
    getTripMock.mockResolvedValue({ id: tripId });
    canViewItemMock.mockResolvedValue(true);
    getTimelineEventsMock.mockResolvedValue(events);
    const response = createResponse();

    await timelineHandler(createRequest("GET", { tripId }), response);

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith([matchingEvent]);
  });

  it("prevents viewers from creating trip schedule events", async () => {
    getTripMock.mockResolvedValue({ id: tripId });
    canEditItemMock.mockResolvedValue(false);
    const response = createResponse();

    await timelineHandler(
      createRequest("POST", { tripId }, { title: "Book hotel" }),
      response
    );

    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith({
      error: "You cannot add events to this trip",
    });
    expect(createTimelineEventMock).not.toHaveBeenCalled();
  });

  it("creates a schedule event for an authorized trip member", async () => {
    getTripMock.mockResolvedValue({ id: tripId });
    canEditItemMock.mockResolvedValue(true);
    const eventInput = { title: "Book hotel", type: "deadline" };
    const event = { id: "event-1", ...eventInput, createdBy: travelerEmail, tripId };
    createTimelineEventMock.mockResolvedValue(event);
    const response = createResponse();

    await timelineHandler(createRequest("POST", { tripId }, eventInput), response);

    expect(createTimelineEventMock).toHaveBeenCalledWith(
      { ...eventInput, createdBy: travelerEmail, tripId },
      travelerEmail
    );
    expect(response.status).toHaveBeenCalledWith(201);
    expect(response.json).toHaveBeenCalledWith(event);
  });

  it("returns 403 when a user without trip access requests the schedule", async () => {
    getTripMock.mockResolvedValue({ id: tripId });
    canViewItemMock.mockResolvedValue(false);
    const response = createResponse();

    await timelineHandler(createRequest("GET", { tripId }), response);

    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith({
      error: "Access denied to this trip's schedule",
    });
    expect(getTimelineEventsMock).not.toHaveBeenCalled();
  });

  it("creates a trip expense with parsed amount and defaults", async () => {
    const expenseInput = {
      title: "Fuel",
      amount: "42.50",
      paidBy: travelerEmail,
      date: "2028-06-02",
      tripId,
    };
    const expense = { id: "expense-1", ...expenseInput };
    createExpenseMock.mockResolvedValue(expense);
    const response = createResponse();

    await expensesHandler(createRequest("POST", {}, expenseInput), response);

    expect(createExpenseMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Fuel",
        amount: 42.5,
        currency: "EUR",
        category: "other",
        date: new Date("2028-06-02"),
        paidBy: travelerEmail,
        splitWith: [],
        tripId,
      }),
      travelerEmail
    );
    expect(response.status).toHaveBeenCalledWith(201);
    expect(response.json).toHaveBeenCalledWith(expense);
  });

  it("requires trip access before returning trip expenses", async () => {
    getTripMock.mockResolvedValue({ id: tripId });
    canViewItemMock.mockResolvedValue(false);
    const response = createResponse();

    await expensesHandler(createRequest("GET", { tripId }), response);

    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith({
      error: "You do not have access to this trip's expenses",
    });
    expect(getExpensesByTripMock).not.toHaveBeenCalled();
  });

  it("returns expenses for a trip the user can access", async () => {
    const expenses = [{ id: "expense-1", title: "Fuel" }];
    getTripMock.mockResolvedValue({ id: tripId });
    canViewItemMock.mockResolvedValue(true);
    getExpensesByTripMock.mockResolvedValue(expenses);
    const response = createResponse();

    await expensesHandler(createRequest("GET", { tripId }), response);

    expect(getExpensesByTripMock).toHaveBeenCalledWith(tripId);
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith(expenses);
  });

  it("creates a reservation attributed to the signed-in user", async () => {
    const reservationInput = {
      title: "Coastal hotel",
      type: "hotel",
      location: "Porto",
      tripId,
    };
    const reservation = {
      id: "reservation-1",
      ...reservationInput,
      createdBy: travelerEmail,
    };
    createReservationMock.mockResolvedValue(reservation);
    const response = createResponse();

    await reservationsHandler(createRequest("POST", {}, reservationInput), response);

    expect(createReservationMock).toHaveBeenCalledWith({
      ...reservationInput,
      createdBy: travelerEmail,
    });
    expect(response.status).toHaveBeenCalledWith(201);
    expect(response.json).toHaveBeenCalledWith(reservation);
  });
});
