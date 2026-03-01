/**
 * Permissions Migration Script for Family Roadtrip 2028
 * 
 * This script migrates existing trip data to the new permissions system by:
 * 1. Reading all trips and their people/viewers arrays
 * 2. Creating owner permission for trip creator
 * 3. Creating contributor permissions for travelers
 * 4. Creating reader permissions for viewers
 * 5. Cascading permissions to all nested items (destinations, activities, expenses, timeline)
 * 
 * Usage:
 *   node scripts/migrate-permissions.js
 *   node scripts/migrate-permissions.js --skip-trips  # Skip trip permission creation (rerun without duplicates)
 * 
 * Environment Variables Required:
 *   AZURE_COSMOS_ENDPOINT - Azure Cosmos DB endpoint
 *   AZURE_COSMOS_KEY - Azure Cosmos DB key
 * 
 * Flags:
 *   --skip-trips  Skip creating trip permissions (useful for re-running to avoid 409 conflicts)
 */

const { CosmosClient } = require("@azure/cosmos");
const { v4: uuidv4 } = require("uuid");

// Initialize Cosmos DB client
const endpoint = process.env.AZURE_COSMOS_ENDPOINT;
const key = process.env.AZURE_COSMOS_KEY;

if (!endpoint || !key) {
  console.error("❌ Missing environment variables:");
  console.error("   - AZURE_COSMOS_ENDPOINT");
  console.error("   - AZURE_COSMOS_KEY");
  process.exit(1);
}

const client = new CosmosClient({ endpoint, key });
const databaseId = "web-db";
const database = client.database(databaseId);

// Parse command line arguments
const skipTrips = process.argv.includes("--skip-trips");

if (skipTrips) {
  console.log("⚠️  Flag --skip-trips detected: Trip permissions will be skipped\n");
}

/**
 * Create a permission record in Cosmos DB
 */
async function createPermission(itemId, itemType, userId, role, parentType, parentId) {
  const permission = {
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

  const itemPermissionsContainer = database.container("item-permissions");
  await itemPermissionsContainer.items.create(permission);
  return permission;
}

/**
 * Main migration function
 */
async function migrate() {
  console.log("🔄 Starting permissions migration...\n");

  try {
    // Get all containers
    const tripsContainer = database.container("trips");
    const destinationsContainer = database.container("destinations");
    const activitiesContainer = database.container("activities");
    const expensesContainer = database.container("expenses");
    const timelineContainer = database.container("timeline");

    // Fetch all trips
    console.log("📥 Fetching all trips from database...");
    const { resources: trips } = await tripsContainer.items
      .query("SELECT * FROM c")
      .fetchAll();

    console.log(`✓ Found ${trips.length} trips to migrate\n`);
    
    // Check total items in containers to diagnose issue
    console.log("📊 Checking total items in database:");
    try {
      const { resources: destRes } = await destinationsContainer.items
        .query("SELECT VALUE COUNT(1) FROM c")
        .fetchAll();
      const { resources: actRes } = await activitiesContainer.items
        .query("SELECT VALUE COUNT(1) FROM c")
        .fetchAll();
      const { resources: expRes } = await expensesContainer.items
        .query("SELECT VALUE COUNT(1) FROM c")
        .fetchAll();
      const { resources: timeRes } = await timelineContainer.items
        .query("SELECT VALUE COUNT(1) FROM c")
        .fetchAll();
      
      console.log(`   Total Destinations: ${destRes[0] || destRes?.length || 0}`);
      console.log(`   Total Activities: ${actRes[0] || actRes?.length || 0}`);
      console.log(`   Total Expenses: ${expRes[0] || expRes?.length || 0}`);
      console.log(`   Total Timeline Events: ${timeRes[0] || timeRes?.length || 0}\n`);
    } catch (e) {
      console.log("   (Could not fetch item counts - may have no items)\n");
    }

    let permissionsCreated = 0;
    const permissionStats = {
      trips: 0,
      destinations: 0,
      activities: 0,
      expenses: 0,
      timelineEvents: 0,
    };

    // Process each trip
    for (const trip of trips) {
      console.log(`🏨 Processing: ${trip.name || trip.id}`);
      console.log(`   Creator: ${trip.createdBy}`);
      console.log(`   Travelers: ${trip.people?.length || 0}`);
      console.log(`   Viewers: ${trip.viewers?.length || 0}`);

      // 1. Create owner permission for trip creator
      if (!skipTrips) {
        try {
          await createPermission(trip.id, "trip", trip.createdBy, "owner");
          permissionsCreated++;
          permissionStats.trips++;
          console.log(`   ✓ Owner permission created`);
        } catch (error) {
          if (error.code !== 409) {
            console.error(`   ✗ Failed:`, error.message);
          }
        }

        // 2. Create contributor permissions for travelers
        if (trip.people && trip.people.length > 0) {
          for (const email of trip.people) {
            if (email !== trip.createdBy) {
              try {
                await createPermission(trip.id, "trip", email, "contributor");
                permissionsCreated++;
                permissionStats.trips++;
              } catch (error) {
                if (error.code !== 409) {
                  console.error(`   ✗ Traveler ${email}:`, error.message);
                }
              }
            }
          }
          console.log(`   ✓ ${trip.people.length} traveler permissions created`);
        }

        // 3. Create reader permissions for viewers
        if (trip.viewers && trip.viewers.length > 0) {
          for (const email of trip.viewers) {
            if (email !== trip.createdBy && (!trip.people || !trip.people.includes(email))) {
              try {
                await createPermission(trip.id, "trip", email, "reader");
                permissionsCreated++;
                permissionStats.trips++;
              } catch (error) {
                if (error.code !== 409) {
                  console.error(`   ✗ Viewer ${email}:`, error.message);
                }
              }
            }
          }
          console.log(`   ✓ ${trip.viewers.length} viewer permissions created`);
        }
      } else {
        console.log(`   ⊘ Skipped trip permissions (--skip-trips flag set)`);
      }

      // 4. Cascade to destinations
      let destinations = [];
      try {
        const { resources } = await destinationsContainer.items
          .query({
            query: "SELECT * FROM c WHERE c.tripId = @tripId",
            parameters: [{ name: "@tripId", value: trip.id }],
          })
          .fetchAll();
        destinations = resources;
        console.log(`   📍 Found ${destinations.length} destinations for trip`);
      } catch (error) {
        console.error(`   ✗ Error fetching destinations:`, error.message);
      }

      for (const dest of destinations) {
        const members = trip.people || [];
        const viewers = trip.viewers || [];
        const destCreator = dest.addedBy || trip.createdBy;

        // Owner (destination creator or trip creator)
        try {
          await createPermission(dest.id, "destination", destCreator, "owner", "trip", trip.id);
          permissionsCreated++;
          permissionStats.destinations++;
        } catch (error) {
          if (error.code !== 409) console.error(`   ✗ Destination owner:`, error.message);
        }

        // Travelers and viewers
        for (const email of members) {
          if (email !== destCreator) {
            try {
              await createPermission(
                dest.id,
                "destination",
                email,
                "contributor",
                "trip",
                trip.id
              );
              permissionsCreated++;
              permissionStats.destinations++;
            } catch (error) {
              if (error.code !== 409) console.error(`   ✗ Destination contributor:`, error.message);
            }
          }
        }

        for (const email of viewers) {
          if (email !== destCreator && !members.includes(email)) {
            try {
              await createPermission(
                dest.id,
                "destination",
                email,
                "reader",
                "trip",
                trip.id
              );
              permissionsCreated++;
              permissionStats.destinations++;
            } catch (error) {
              if (error.code !== 409) console.error(`   ✗ Destination reader:`, error.message);
            }
          }
        }
      }

      if (destinations.length > 0) {
        console.log(`   ✓ ${destinations.length} destination permissions cascaded`);
      }

      // 5. Cascade to activities
      let activities = [];
      
      // Query activities for each destination separately to avoid IN clause issues
      for (const dest of destinations) {
        try {
          const { resources: destActivities } = await activitiesContainer.items
            .query("SELECT * FROM c WHERE c.destinationId = @destId", [
              { name: "@destId", value: dest.id },
            ])
            .fetchAll();
          activities = activities.concat(destActivities);
        } catch (error) {
          console.error(`   ✗ Failed to fetch activities for destination ${dest.id}:`, error.message);
        }
      }

      for (const act of activities) {
        const dest = destinations.find((d) => d.id === act.destinationId);
        if (!dest) continue;

        const members = trip.people || [];
        const viewers = trip.viewers || [];

        try {
          await createPermission(
            act.id,
            "activity",
            trip.createdBy,
            "owner",
            "destination",
            dest.id
          );
          permissionsCreated++;
          permissionStats.activities++;
        } catch (error) {
          if (error.code !== 409) console.error(`   ✗:`, error.message);
        }

        for (const email of members) {
          if (email !== trip.createdBy) {
            try {
              await createPermission(
                act.id,
                "activity",
                email,
                "contributor",
                "destination",
                dest.id
              );
              permissionsCreated++;
              permissionStats.activities++;
            } catch (error) {
              if (error.code !== 409) console.error(`   ✗:`, error.message);
            }
          }
        }

        for (const email of viewers) {
          if (email !== trip.createdBy && !members.includes(email)) {
            try {
              await createPermission(
                act.id,
                "activity",
                email,
                "reader",
                "destination",
                dest.id
              );
              permissionsCreated++;
              permissionStats.activities++;
            } catch (error) {
              if (error.code !== 409) console.error(`   ✗:`, error.message);
            }
          }
        }
      }

      if (activities.length > 0) {
        console.log(`   ✓ ${activities.length} activity permissions cascaded`);
      }

      // 6. Cascade to expenses
      let expenses = [];
      try {
        const { resources } = await expensesContainer.items
          .query({
            query: "SELECT * FROM c WHERE c.tripId = @tripId",
            parameters: [{ name: "@tripId", value: trip.id }],
          })
          .fetchAll();
        expenses = resources;
        console.log(`   💰 Found ${expenses.length} expenses for trip`);
      } catch (error) {
        console.error(`   ✗ Error fetching expenses:`, error.message);
      }

      for (const exp of expenses) {
        const paidBy = exp.paidBy || trip.createdBy;
        const members = trip.people || [];
        const viewers = trip.viewers || [];

        try {
          await createPermission(exp.id, "expense", paidBy, "owner", "trip", trip.id);
          permissionsCreated++;
          permissionStats.expenses++;
        } catch (error) {
          if (error.code !== 409) console.error(`   ✗:`, error.message);
        }

        for (const email of members) {
          if (email !== paidBy) {
            try {
              await createPermission(exp.id, "expense", email, "contributor", "trip", trip.id);
              permissionsCreated++;
              permissionStats.expenses++;
            } catch (error) {
              if (error.code !== 409) console.error(`   ✗:`, error.message);
            }
          }
        }

        for (const email of viewers) {
          if (email !== paidBy && !members.includes(email)) {
            try {
              await createPermission(exp.id, "expense", email, "reader", "trip", trip.id);
              permissionsCreated++;
              permissionStats.expenses++;
            } catch (error) {
              if (error.code !== 409) console.error(`   ✗:`, error.message);
            }
          }
        }
      }

      if (expenses.length > 0) {
        console.log(`   ✓ ${expenses.length} expense permissions cascaded`);
      }

      // 7. Cascade to timeline events
      let timelineEvents = [];
      try {
        const { resources } = await timelineContainer.items
          .query({
            query: "SELECT * FROM c WHERE c.tripId = @tripId",
            parameters: [{ name: "@tripId", value: trip.id }],
          })
          .fetchAll();
        timelineEvents = resources;
        console.log(`   📅 Found ${timelineEvents.length} timeline events for trip`);
      } catch (error) {
        console.error(`   ✗ Error fetching timeline events:`, error.message);
      }

      for (const event of timelineEvents) {
        const createdBy = event.createdBy || trip.createdBy;
        const members = trip.people || [];
        const viewers = trip.viewers || [];

        try {
          await createPermission(
            event.id,
            "schedule",
            createdBy,
            "contributor",
            "trip",
            trip.id
          );
          permissionsCreated++;
          permissionStats.timelineEvents++;
        } catch (error) {
          if (error.code !== 409) console.error(`   ✗:`, error.message);
        }

        for (const email of members) {
          if (email !== createdBy) {
            try {
              await createPermission(
                event.id,
                "schedule",
                email,
                "contributor",
                "trip",
                trip.id
              );
              permissionsCreated++;
              permissionStats.timelineEvents++;
            } catch (error) {
              if (error.code !== 409) console.error(`   ✗:`, error.message);
            }
          }
        }

        for (const email of viewers) {
          if (email !== createdBy && !members.includes(email)) {
            try {
              await createPermission(event.id, "schedule", email, "reader", "trip", trip.id);
              permissionsCreated++;
              permissionStats.timelineEvents++;
            } catch (error) {
              if (error.code !== 409) console.error(`   ✗:`, error.message);
            }
          }
        }
      }

      if (timelineEvents.length > 0) {
        console.log(`   ✓ ${timelineEvents.length} timeline permissions cascaded\n`);
      }
    }

    // Print summary
    console.log("\n✅ Migration Complete!\n");
    console.log("📊 Summary:");
    console.log(`   Trips processed: ${trips.length}`);
    console.log(`   Permissions created: ${permissionsCreated}`);
    console.log(`   - Trip permissions: ${permissionStats.trips}`);
    console.log(`   - Destination permissions: ${permissionStats.destinations}`);
    console.log(`   - Activity permissions: ${permissionStats.activities}`);
    console.log(`   - Expense permissions: ${permissionStats.expenses}`);
    console.log(`   - Timeline permissions: ${permissionStats.timelineEvents}`);
    console.log("\n📝 Next Steps:");
    console.log("   1. Verify permissions in Cosmos DB (item-permissions container)");
    console.log("   2. Test user access to trips, destinations, and activities");
    console.log("   3. Keep legacy people/viewers arrays as backup");
    console.log("   4. (Optional) Remove legacy arrays after validation\n");
  } catch (error) {
    console.error("\n❌ Migration failed:");
    console.error(error);
    process.exit(1);
  }
}

// Run migration
migrate().then(() => {
  console.log("Done!");
  process.exit(0);
});
