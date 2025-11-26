const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema(
  {
    // Inventory Category
    categoryCode: {
      type: String,
      required: [true, "Category code is required"],
      trim: true,
      uppercase: true,
    },
    categoryName: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
    },

    // Sub Inventory Category
    subCategoryCode: {
      type: String,
      trim: true,
      uppercase: true,
    },
    subCategoryName: {
      type: String,
      trim: true,
    },

    // Inventory Item Information
    itemCode: {
      type: String,
      required: [true, "Item code is required"],
      unique: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: [true, "Item name is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    brand: {
      type: String,
      trim: true,
    },
    measurement: {
      type: String,
      required: [true, "Measurement unit is required"],
      trim: true,
    },

    // Pricing Information
    purchasePrice: {
      type: Number,
      default: 0,
      min: [0, "Purchase price cannot be negative"],
    },
    saleTaxRate: {
      type: Number,
      default: 0,
      min: [0, "Sale tax rate cannot be negative"],
      max: [100, "Sale tax rate cannot exceed 100%"],
    },
    valuationCost: {
      type: Number,
      default: 0,
      min: [0, "Valuation cost cannot be negative"],
    },
    sellingPrice: {
      type: Number,
      default: 0,
      min: [0, "Selling price cannot be negative"],
    },

    // Stock Information (optional, for future use)
    currentStock: {
      type: Number,
      default: 0,
      min: [0, "Stock cannot be negative"],
    },
    minStockLevel: {
      type: Number,
      default: 0,
      min: [0, "Minimum stock level cannot be negative"],
    },

    // Status
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
itemSchema.index({ categoryCode: 1 });
itemSchema.index({ subCategoryCode: 1 });
itemSchema.index({ name: 1 });

module.exports = mongoose.model("Item", itemSchema);
