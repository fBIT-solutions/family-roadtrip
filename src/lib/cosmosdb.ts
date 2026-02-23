import { CosmosClient } from "@azure/cosmos";

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
};

export default client;
