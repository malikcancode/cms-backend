const Project = require("../models/Project");
const SalesInvoice = require("../models/SalesInvoice");
const Purchase = require("../models/Purchase");
const BankPayment = require("../models/BankPayment");
const Plot = require("../models/Plot");
const Item = require("../models/Item");

// @desc    Get dashboard statistics
// @route   GET /api/dashboard/stats
// @access  Private
const getDashboardStats = async (req, res) => {
  try {
    // Get all sales invoices
    const salesInvoices = await SalesInvoice.find();
    const totalSales = salesInvoices.reduce(
      (sum, invoice) => sum + (invoice.netTotal || 0),
      0
    );

    // Get all purchases and bank payments for total expenses
    const purchases = await Purchase.find();
    const purchaseExpenses = purchases.reduce(
      (sum, purchase) => sum + (purchase.netAmount || 0),
      0
    );

    // Get all bank payments (not cancelled)
    const bankPayments = await BankPayment.find({ cancel: false });
    const bankPaymentExpenses = bankPayments.reduce(
      (sum, payment) => sum + (payment.totalAmount || 0),
      0
    );

    // Total expenses = purchases + bank payments
    const totalExpenses = purchaseExpenses + bankPaymentExpenses;

    // Calculate net profit
    const netProfit = totalSales - totalExpenses;

    // Get active projects count
    const activeProjectsCount = await Project.countDocuments({
      status: "Active",
    });

    // Calculate month-over-month changes
    const now = new Date();
    const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayLastMonth = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1
    );
    const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Last month's sales
    const lastMonthSales = await SalesInvoice.find({
      date: { $gte: firstDayLastMonth, $lte: lastDayLastMonth },
    });
    const lastMonthSalesTotal = lastMonthSales.reduce(
      (sum, invoice) => sum + (invoice.netTotal || 0),
      0
    );

    // Last month's purchases
    const lastMonthPurchases = await Purchase.find({
      date: { $gte: firstDayLastMonth, $lte: lastDayLastMonth },
    });
    const lastMonthPurchaseExpenses = lastMonthPurchases.reduce(
      (sum, purchase) => sum + (purchase.netAmount || 0),
      0
    );

    // Last month's bank payments
    const lastMonthBankPayments = await BankPayment.find({
      cancel: false,
      date: { $gte: firstDayLastMonth, $lte: lastDayLastMonth },
    });
    const lastMonthBankPaymentExpenses = lastMonthBankPayments.reduce(
      (sum, payment) => sum + (payment.totalAmount || 0),
      0
    );

    const lastMonthExpenses =
      lastMonthPurchaseExpenses + lastMonthBankPaymentExpenses;
    const lastMonthProfit = lastMonthSalesTotal - lastMonthExpenses;

    // Calculate percentage changes
    const calculateChange = (current, previous) => {
      if (previous === 0) {
        return current > 0 ? "+100%" : "0%";
      }
      const change = ((current - previous) / previous) * 100;
      const sign = change >= 0 ? "+" : "";
      return `${sign}${change.toFixed(1)}%`;
    };

    const expensesChange = calculateChange(totalExpenses, lastMonthExpenses);
    const salesChange = calculateChange(totalSales, lastMonthSalesTotal);
    const profitChange = calculateChange(netProfit, lastMonthProfit);

    // Get last month's active projects count
    const lastMonthActiveProjects = await Project.countDocuments({
      status: "Active",
      createdAt: { $lt: firstDayThisMonth },
    });

    const projectsDiff = activeProjectsCount - lastMonthActiveProjects;
    const projectsChange =
      projectsDiff >= 0 ? `+${projectsDiff}` : `${projectsDiff}`;

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalExpenses,
          expensesChange,
          totalSales,
          salesChange,
          netProfit,
          profitChange,
          activeProjects: activeProjectsCount,
          projectsChange,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching dashboard statistics",
      error: error.message,
    });
  }
};

// @desc    Get recent projects for dashboard
// @route   GET /api/dashboard/recent-projects
// @access  Private
const getRecentProjects = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;

    // Get recent projects sorted by creation date
    const projects = await Project.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("createdBy", "name");

    // Calculate spent amount for each project from purchases and bank payments
    const projectsWithDetails = await Promise.all(
      projects.map(async (project) => {
        // Get all purchases for this project
        const projectPurchases = await Purchase.find({
          project: project._id,
        });

        // Calculate total from purchases
        const purchaseSpent = projectPurchases.reduce(
          (sum, purchase) => sum + (purchase.netAmount || 0),
          0
        );

        // Get all bank payments for this project (not cancelled)
        const projectBankPayments = await BankPayment.find({
          project: project._id,
          cancel: false,
        });

        // Calculate total from bank payments
        const bankPaymentSpent = projectBankPayments.reduce(
          (sum, payment) => sum + (payment.totalAmount || 0),
          0
        );

        // Get all sales invoices for this project (revenue)
        const projectInvoices = await SalesInvoice.find({
          project: project._id,
        });

        // Calculate total revenue
        const revenue = projectInvoices.reduce(
          (sum, invoice) => sum + (invoice.netTotal || 0),
          0
        );

        // Total spent = purchases + bank payments
        const spent = purchaseSpent + bankPaymentSpent;

        // Calculate progress percentage based on budget
        const budget = project.valueOfJob || project.estimatedCost || 0;
        const progress = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;

        return {
          _id: project._id,
          name: project.name,
          status: project.status,
          progress: Math.round(progress),
          budget: budget,
          spent: spent,
          revenue: revenue,
          client: project.client,
          jobIncharge: project.jobIncharge,
          startDate: project.startDate,
          completionDate: project.completionDate,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: projectsWithDetails,
    });
  } catch (error) {
    console.error("Error fetching recent projects:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching recent projects",
      error: error.message,
    });
  }
};

// @desc    Get plot statistics for dashboard
// @route   GET /api/dashboard/plot-stats
// @access  Private
const getPlotStats = async (req, res) => {
  try {
    // Get all plots, not just active ones, to show sold plots too
    const plots = await Plot.find();

    const stats = {
      total: plots.length,
      available: plots.filter((p) => p.status === "Available").length,
      booked: plots.filter((p) => p.status === "Booked").length,
      sold: plots.filter((p) => p.status === "Sold").length,
      underConstruction: plots.filter((p) => p.status === "Under Construction")
        .length,
      totalInventoryValue: plots
        .filter((p) => p.status === "Available")
        .reduce((sum, p) => sum + (p.basePrice || 0), 0),
      totalSalesValue: plots
        .filter((p) => p.status === "Sold")
        .reduce(
          (sum, p) => sum + (p.grossAmount || p.finalPrice || p.basePrice || 0),
          0
        ),
      totalReceived: plots
        .filter((p) => p.status === "Sold" || p.status === "Booked")
        .reduce((sum, p) => sum + (p.amountReceived || 0), 0),
      totalOutstanding: plots
        .filter((p) => p.status === "Sold" || p.status === "Booked")
        .reduce((sum, p) => sum + (p.balance || 0), 0),
    };

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching plot stats:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching plot statistics",
      error: error.message,
    });
  }
};

// @desc    Get inventory statistics (materials only, no plots)
// @route   GET /api/dashboard/inventory-stats
// @access  Private
const getInventoryStats = async (req, res) => {
  try {
    // Get only materials, equipment, services - exclude Plots
    const items = await Item.find({
      isActive: true,
      itemType: { $ne: "Plot" },
    });

    const stats = {
      totalItems: items.length,
      lowStockCount: items.filter(
        (item) =>
          item.currentStock > 0 &&
          item.currentStock <= (item.minStockLevel || 0)
      ).length,
      outOfStockCount: items.filter((item) => item.currentStock <= 0).length,
      totalInventoryValue: items.reduce(
        (sum, item) =>
          sum + (item.currentStock || 0) * (item.purchasePrice || 0),
        0
      ),
      categories: [...new Set(items.map((item) => item.categoryName))].length,
    };

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching inventory stats:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching inventory statistics",
      error: error.message,
    });
  }
};

module.exports = {
  getDashboardStats,
  getRecentProjects,
  getPlotStats,
  getInventoryStats,
};
