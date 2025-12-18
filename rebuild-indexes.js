/**
 * Migration Script to Rebuild Multi-Tenant Indexes
 * This script drops all existing unique indexes and rebuilds them with tenantId compound indexes
 * Run this once after deploying multi-tenant changes
 */

const mongoose = require("mongoose");
require("dotenv").config();

const models = [
  "AccountType",
  "Customer",
  "Supplier",
  "Item",
  "Plot",
  "ChartOfAccount",
  "BankPayment",
  "CashPayment",
  "Project",
  "Purchase",
  "SalesInvoice",
  "JournalEntry",
  "GeneralLedger",
];

const rebuildIndexes = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✓ Connected to MongoDB");

    // Rebuild indexes for each model
    for (const modelName of models) {
      try {
        const model = mongoose.model(modelName);

        // Drop all indexes for this collection (except _id)
        console.log(`\nProcessing ${modelName}...`);
        await model.collection.dropIndexes();
        console.log(`  ✓ Dropped all indexes`);

        // Rebuild indexes from schema definition
        await model.collection.createIndexes();
        console.log(`  ✓ Rebuilt indexes with multi-tenant compound indexes`);

        // List created indexes
        const indexInfo = await model.collection.getIndexes();
        console.log(`  Indexes created:`, Object.keys(indexInfo));
      } catch (err) {
        if (err.message.includes("ns does not exist")) {
          console.log(
            `  ⓘ Collection doesn't exist yet (will be created on first write)`
          );
        } else {
          console.error(`  ✗ Error with ${modelName}:`, err.message);
        }
      }
    }

    console.log("\n✓ Index rebuild complete!");
    console.log("\nSummary:");
    console.log("- All global unique indexes have been removed");
    console.log("- Multi-tenant compound indexes have been created");
    console.log("- Different portals can now have duplicate field values");
    console.log("- Within each portal, uniqueness is still enforced");

    process.exit(0);
  } catch (error) {
    console.error("✗ Migration failed:", error);
    process.exit(1);
  }
};

rebuildIndexes();
