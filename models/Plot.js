const mongoose = require("mongoose");

const PlotSchema = new mongoose.Schema(
  {
    plotNumber: {
      type: String,
      required: [true, "Plot number is required"],
      unique: true,
      trim: true,
      uppercase: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: [true, "Project is required"],
    },
    block: {
      type: String,
      trim: true,
    },
    phase: {
      type: String,
      trim: true,
    },
    plotSize: {
      type: Number,
      required: [true, "Plot size is required"],
      min: [0, "Plot size cannot be negative"],
    },
    unit: {
      type: String,
      enum: ["sq ft", "sq m", "sq yd", "marla", "kanal"],
      default: "sq ft",
    },
    plotType: {
      type: String,
      enum: ["Residential", "Commercial", "Mixed Use", "Agricultural"],
      required: [true, "Plot type is required"],
    },
    facing: {
      type: String,
      enum: [
        "North",
        "South",
        "East",
        "West",
        "North-East",
        "North-West",
        "South-East",
        "South-West",
        "Corner",
      ],
    },
    status: {
      type: String,
      enum: ["Available", "Booked", "Sold", "Under Construction", "Hold"],
      default: "Available",
    },
    // Stock Management Fields
    quantity: {
      type: Number,
      default: 1,
      min: [0, "Quantity cannot be negative"],
    },
    totalStock: {
      type: Number,
      default: 0,
      min: [0, "Total stock cannot be negative"],
    },
    soldStock: {
      type: Number,
      default: 0,
      min: [0, "Sold stock cannot be negative"],
    },
    availableStock: {
      type: Number,
      default: 0,
      min: [0, "Available stock cannot be negative"],
    },
    // Pricing Fields
    basePrice: {
      type: Number,
      required: [true, "Base price is required"],
      min: [0, "Base price cannot be negative"],
    },
    rate: {
      type: Number,
      min: [0, "Rate cannot be negative"],
    },
    pricePerUnit: {
      type: Number,
      min: [0, "Price per unit cannot be negative"],
    },
    grossAmount: {
      type: Number,
      default: 0,
      min: [0, "Gross amount cannot be negative"],
    },
    // Payment Terms
    paymentTerms: {
      type: String,
      trim: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
    },
    bookingDate: {
      type: Date,
    },
    saleDate: {
      type: Date,
    },
    finalPrice: {
      type: Number,
      min: [0, "Final price cannot be negative"],
    },
    bookingAmount: {
      type: Number,
      default: 0,
      min: [0, "Booking amount cannot be negative"],
    },
    amountReceived: {
      type: Number,
      default: 0,
      min: [0, "Amount received cannot be negative"],
    },
    balance: {
      type: Number,
      default: 0,
    },
    registrationDate: {
      type: Date,
    },
    possessionDate: {
      type: Date,
    },
    remarks: {
      type: String,
      trim: true,
    },
    features: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
PlotSchema.index({ project: 1 });
PlotSchema.index({ status: 1 });
PlotSchema.index({ plotNumber: 1 });
PlotSchema.index({ customer: 1 });

// Calculate price per unit and other fields before save
PlotSchema.pre("save", function () {
  // Calculate price per unit
  if (this.basePrice && this.plotSize) {
    this.pricePerUnit = this.basePrice / this.plotSize;
  }

  // Set rate from basePrice if not provided
  if (!this.rate && this.basePrice) {
    this.rate = this.basePrice;
  }

  // Calculate gross amount
  if (this.quantity && this.rate) {
    this.grossAmount = this.quantity * this.rate;
  }

  // Calculate available stock
  if (this.totalStock !== undefined && this.soldStock !== undefined) {
    this.availableStock = this.totalStock - this.soldStock;
  }

  // Calculate balance
  if (this.finalPrice !== undefined) {
    this.balance = this.finalPrice - (this.amountReceived || 0);
  }
});

// Post-save middleware to create journal entry when plot is sold
PlotSchema.post("save", async function (doc) {
  // Only create journal entry when status changes to "Sold" and has final price
  if (doc.status === "Sold" && doc.finalPrice && doc.saleDate) {
    try {
      const AccountingService = require("../services/accountingService");

      if (doc.createdBy) {
        await AccountingService.createPlotSaleJournalEntry(doc, doc.createdBy);
      }
    } catch (error) {
      console.error(
        "Error creating journal entry for plot sale:",
        error.message
      );
      // Don't throw error to prevent plot update failure
    }
  }
});

module.exports = mongoose.model("Plot", PlotSchema);
