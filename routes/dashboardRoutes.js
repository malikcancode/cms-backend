const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  getDashboardStats,
  getRecentProjects,
  getPlotStats,
  getInventoryStats,
} = require("../controllers/dashboardController");

// @route   GET /api/dashboard/stats
// @desc    Get dashboard statistics
// @access  Private
router.get("/stats", protect, getDashboardStats);

// @route   GET /api/dashboard/recent-projects
// @desc    Get recent projects
// @access  Private
router.get("/recent-projects", protect, getRecentProjects);

// @route   GET /api/dashboard/plot-stats
// @desc    Get plot statistics
// @access  Private
router.get("/plot-stats", protect, getPlotStats);

// @route   GET /api/dashboard/inventory-stats
// @desc    Get inventory statistics (materials only)
// @access  Private
router.get("/inventory-stats", protect, getInventoryStats);

module.exports = router;
