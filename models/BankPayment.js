const mongoose = require("mongoose");

const PaymentLineSchema = new mongoose.Schema({
  accountCode: {
    type: String,
    required: true,
    trim: true,
  },
  accountName: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
});

const BankPaymentSchema = new mongoose.Schema(
  {
    serialNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    cancel: {
      type: Boolean,
      default: false,
    },
    date: {
      type: Date,
      required: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
    },
    jobDescription: {
      type: String,
      trim: true,
    },
    employeeRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    bankAccount: {
      type: String,
      required: true,
      enum: [
        "Meezan Bank",
        "HBL",
        "Allied Bank",
        "UBL",
        "MCB",
        "Standard Chartered",
        "Faysal Bank",
        "Bank Alfalah",
      ],
    },
    bankAccountNumber: {
      type: String,
      trim: true,
    },
    chequeNo: {
      type: String,
      trim: true,
    },
    chequeDate: {
      type: Date,
    },
    paymentLines: [PaymentLineSchema],
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
BankPaymentSchema.index({ date: -1 });
BankPaymentSchema.index({ project: 1 });
BankPaymentSchema.index({ bankAccount: 1 });

// Generate serial number before saving
BankPaymentSchema.pre("save", async function () {
  if (!this.serialNo || this.serialNo === "") {
    const count = await mongoose.model("BankPayment").countDocuments();
    this.serialNo = `BP${String(count + 1).padStart(6, "0")}`;
  }
});

const BankPayment = mongoose.model("BankPayment", BankPaymentSchema);

module.exports = BankPayment;
