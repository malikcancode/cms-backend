const mongoose = require("mongoose");

const SubAccountSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    trim: true,
  },
  type: {
    type: String,
    required: true,
    trim: true,
  },
});

const ListAccountSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    trim: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
});

const ChartOfAccountSchema = new mongoose.Schema(
  {
    mainAccountType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AccountType",
      required: true,
    },
    mainTypeCode: {
      type: String,
      required: true,
      trim: true,
    },
    mainAccountTypeText: {
      type: String,
      required: true,
      trim: true,
    },
    financialComponent: {
      type: String,
      required: true,
      trim: true,
    },
    subAccounts: [SubAccountSchema],
    listAccounts: [ListAccountSchema],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
ChartOfAccountSchema.index({ mainAccountType: 1 });
ChartOfAccountSchema.index({ mainTypeCode: 1 });

const ChartOfAccount = mongoose.model("ChartOfAccount", ChartOfAccountSchema);

module.exports = ChartOfAccount;
