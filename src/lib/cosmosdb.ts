import { CosmosClient } from "@azure/cosmos";

const connectionString = process.env.COSMOSDB_CONNECTION_STRING;

// const client = new CosmosClient(connectionString);

const client = new CosmosClient({
  endpoint: process.env.AZURE_COSMOS_ENDPOINT || "",
  key: process.env.AZURE_COSMOS_KEY || "",
});

const database = client.database(process.env.AZURE_COSMOS_DB_NAME || "roadtrip-db");

export const containers = {
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
};

export default client;
