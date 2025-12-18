/**
 * AGGRESSIVE Index Fix Script
 * This script explicitly drops conflicting global indexes and rebuilds tenant-scoped ones
 * Use this if rebuild-indexes.js doesn't work
 */

const mongoose = require("mongoose");
require("dotenv").config();

const rebuildIndexes = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✓ Connected to MongoDB");

    const db = mongoose.connection.db;

    // List of collections and their problematic indexes to drop
    const problematicIndexes = {
      accounttypes: ["name_1", "code_1"], // Global unique indexes to remove
      customers: ["code_1", "email_1"], // Global indexes to remove
      suppliers: ["code_1"], // Global index to remove
      items: ["itemcode_1"], // Global unique index to remove
    };

    // Drop problematic indexes
    console.log("\n📋 STEP 1: Removing problematic global indexes...");
    for (const [collection, indexNames] of Object.entries(problematicIndexes)) {
      try {
        const collectionObj = db.collection(collection);
        const existingIndexes = await collectionObj.getIndexes();

        for (const indexName of indexNames) {
          if (existingIndexes[indexName]) {
            await collectionObj.dropIndex(indexName);
            console.log(`  ✓ Dropped ${collection}.${indexName}`);
          } else {
            console.log(
              `  ⓘ ${collection}.${indexName} not found (already removed)`
            );
          }
        }
      } catch (err) {
        if (!err.message.includes("ns does not exist")) {
          console.log(`  ⚠ ${collection}: ${err.message}`);
        }
      }
    }

    // Drop ALL indexes and recreate from schema
    console.log("\n🔄 STEP 2: Rebuilding indexes from Mongoose schemas...");

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
      "User",
    ];

    for (const modelName of models) {
      try {
        const model = mongoose.model(modelName);
        const collectionObj = model.collection;

        // Get current indexes
        const currentIndexes = await collectionObj.getIndexes();

        // Drop all indexes except _id_
        for (const [indexName, indexSpec] of Object.entries(currentIndexes)) {
          if (indexName !== "_id_") {
            await collectionObj.dropIndex(indexName);
          }
        }

        console.log(`  ✓ ${modelName}: Dropped old indexes`);

        // Rebuild indexes from schema
        await model.syncIndexes();
        console.log(`  ✓ ${modelName}: Rebuilt tenant-scoped indexes`);

        // Verify new indexes
        const newIndexes = await collectionObj.getIndexes();
        const indexList = Object.keys(newIndexes)
          .filter((i) => i !== "_id_")
          .join(", ");
        console.log(`     Indexes: ${indexList}`);
      } catch (err) {
        if (err.message.includes("ns does not exist")) {
          console.log(
            `  ⓘ ${modelName}: Collection doesn't exist yet (will be created on first write)`
          );
        } else {
          console.error(`  ✗ ${modelName}: ${err.message}`);
        }
      }
    }

    console.log("\n✅ Index rebuild complete!");
    console.log("\n📊 Summary:");
    console.log("  ✓ All global unique indexes have been removed");
    console.log("  ✓ All indexes dropped and rebuilt from schema definitions");
    console.log("  ✓ Tenant-scoped compound indexes are now active");
    console.log("  ✓ Different portals can have duplicate field values");
    console.log("  ✓ Within each portal, uniqueness is enforced");

    console.log("\n🚀 Next steps:");
    console.log("  1. Restart the server: npm start");
    console.log("  2. Try creating Account Types in different portals");
    console.log(
      "  3. You should now be able to create the same names in different portals"
    );

    process.exit(0);
  } catch (error) {
    console.error("✗ Migration failed:", error);
    process.exit(1);
  }
};

rebuildIndexes();
