import { CosmosClient } from "@azure/cosmos";

const connectionString = process.env.COSMOSDB_CONNECTION_STRING;

// Lazy-loaded client and containers to avoid initialization errors during build time
let clientInstance: CosmosClient | null = null;
let containersInstance: any = null;

function initializeClient() {
  if (clientInstance) {
    return clientInstance;
  }

  // Only initialize if env vars are available
  if (!process.env.AZURE_COSMOS_ENDPOINT || !process.env.AZURE_COSMOS_KEY) {
    // Return a proxy object that throws helpful errors if accessed
    return null;
  }

  clientInstance = new CosmosClient({
    endpoint: process.env.AZURE_COSMOS_ENDPOINT,
    key: process.env.AZURE_COSMOS_KEY,
  });

  return clientInstance;
}

function initializeContainers() {
  if (containersInstance) {
    return containersInstance;
  }

  const client = initializeClient();
  if (!client) {
    // Return empty containers during build
    return {
      users: null,
      destinations: null,
      trips: null,
      timeline: null,
      files: null,
      expenses: null,
      budgets: null,
      activities: null,
      recommendDestinations: null,
      recommendActivities: null,
      userPreferences: null,
      recommendationDislikes: null,
      feed: null,
    };
  }

  const database = client.database(process.env.AZURE_COSMOS_DB_NAME || "roadtrip-db");

  containersInstance = {
    users: database.container(process.env.AZURE_COSMOS_CONTAINERS_USERS || "users"),
    destinations: database.container(
      process.env.AZURE_COSMOS_CONTAINERS_DESTINATIONS || "destinations"
    ),
    trips: database.container(process.env.AZURE_COSMOS_CONTAINERS_TRIPS || "trips"),
    timeline: database.container(
      process.env.AZURE_COSMOS_CONTAINERS_TIMELINE || "timeline"
    ),
    files: database.container(process.env.AZURE_COSMOS_CONTAINERS_FILES || "files"),
    expenses: database.container(process.env.AZURE_COSMOS_CONTAINERS_EXPENSES || "expenses"),
    budgets: database.container(process.env.AZURE_COSMOS_CONTAINERS_BUDGETS || "budgets"),
    activities: database.container(process.env.AZURE_COSMOS_CONTAINERS_ACTIVITIES || "activities"),
    recommendDestinations: database.container(process.env.AZURE_COSMOS_CONTAINERS_RECOMMEND_DESTINATIONS || "recommend-destinations"),
    recommendActivities: database.container(process.env.AZURE_COSMOS_CONTAINERS_RECOMMEND_ACTIVITIES || "recommend-activities"),
    userPreferences: database.container(process.env.AZURE_COSMOS_CONTAINERS_USER_PREFERENCES || "user-preferences"),
    recommendationDislikes: database.container(process.env.AZURE_COSMOS_CONTAINERS_DISLIKES || "recommendation-dislikes"),
    feed: database.container(process.env.AZURE_COSMOS_CONTAINERS_FEED || "trip-feed"),
  };

  return containersInstance;
}

export const containers = new Proxy(
  {},
  {
    get: (target, prop) => {
      const containers = initializeContainers();
      return containers?.[prop as string];
    },
  }
) as any;

export function getClient() {
  return initializeClient();
}

export default function getClientDefault() {
  return initializeClient();
}
