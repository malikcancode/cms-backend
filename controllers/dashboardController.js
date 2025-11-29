const Project = require("../models/Project");
const SalesInvoice = require("../models/SalesInvoice");
const Purchase = require("../models/Purchase");
const BankPayment = require("../models/BankPayment");

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

    // Get all projects for percentage calculations
    const allProjects = await Project.find();
    const completedProjects = await Project.countDocuments({
      status: "Completed",
    });

    // Calculate changes (mock data for now - you can implement month-over-month comparison)
    const expensesChange = "+5.2%";
    const salesChange = "+12.5%";
    const profitChange = "+8.3%";
    const projectsChange = `+${activeProjectsCount}`;

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

module.exports = {
  getDashboardStats,
  getRecentProjects,
};
