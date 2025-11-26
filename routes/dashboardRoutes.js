const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  getDashboardStats,
  getRecentProjects,
} = require("../controllers/dashboardController");

// @route   GET /api/dashboard/stats
// @desc    Get dashboard statistics
// @access  Private
router.get("/stats", protect, getDashboardStats);

// @route   GET /api/dashboard/recent-projects
// @desc    Get recent projects
// @access  Private
router.get("/recent-projects", protect, getRecentProjects);

module.exports = router;
