const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  getIncomeStatement,
  getInventoryReport,
  getSupplierLedger,
} = require("../controllers/reportController");

// @route   GET /api/reports/income-statement
// @desc    Get income statement
// @access  Private
router.get("/income-statement", protect, getIncomeStatement);

// @route   GET /api/reports/inventory
// @desc    Get inventory report
// @access  Private
router.get("/inventory", protect, getInventoryReport);

// @route   GET /api/reports/supplier-ledger/:supplierId
// @desc    Get supplier ledger report
// @access  Private
router.get("/supplier-ledger/:supplierId", protect, getSupplierLedger);

module.exports = router;
