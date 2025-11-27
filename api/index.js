require("dotenv").config();
const express = require("express");
const cors = require("cors");
const serverless = require("serverless-http");
const connectDB = require("../db/db");

const app = express();

// CORS Middleware - Must be first
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://cms-frontend-bay.vercel.app",
      process.env.FRONTEND_URL,
    ].filter(Boolean),
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log environment check
console.log("Environment check:", {
  hasMongoUri: !!process.env.MONGO_URI,
  hasJwtSecret: !!process.env.JWT_SECRET,
  nodeEnv: process.env.NODE_ENV,
  frontendUrl: process.env.FRONTEND_URL,
});

// Middleware to ensure DB connection for protected routes only
const ensureDbConnection = async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error("Database connection error:", error.message);
    res.status(503).json({
      success: false,
      error: "Service temporarily unavailable",
      message:
        "Database connection failed. Please check MongoDB Atlas settings.",
    });
  }
};

// Import Routes
const authRoutes = require("../routes/authRoutes");
const userRoutes = require("../routes/userRoutes");
const projectRoutes = require("../routes/projectRoutes");
const customerRoutes = require("../routes/customerRoutes");
const chartOfAccountRoutes = require("../routes/chartOfAccountRoutes");
const bankPaymentRoutes = require("../routes/bankPaymentRoutes");
const itemRoutes = require("../routes/itemRoutes");
const purchaseRoutes = require("../routes/purchaseRoutes");
const supplierRoutes = require("../routes/supplierRoutes");
const salesInvoiceRoutes = require("../routes/salesInvoiceRoutes");
const dashboardRoutes = require("../routes/dashboardRoutes");
const accountTypeRoutes = require("../routes/accountTypeRoutes");
const reportRoutes = require("../routes/reportRoutes");

// Mount routes with DB connection middleware
app.use("/api/auth", ensureDbConnection, authRoutes);
app.use("/api/users", ensureDbConnection, userRoutes);
app.use("/api/projects", ensureDbConnection, projectRoutes);
app.use("/api/customers", ensureDbConnection, customerRoutes);
app.use("/api/chartofaccounts", ensureDbConnection, chartOfAccountRoutes);
app.use("/api/bankpayments", ensureDbConnection, bankPaymentRoutes);
app.use("/api/items", ensureDbConnection, itemRoutes);
app.use("/api/purchases", ensureDbConnection, purchaseRoutes);
app.use("/api/suppliers", ensureDbConnection, supplierRoutes);
app.use("/api/sales-invoices", ensureDbConnection, salesInvoiceRoutes);
app.use("/api/dashboard", ensureDbConnection, dashboardRoutes);
app.use("/api/account-types", ensureDbConnection, accountTypeRoutes);
app.use("/api/reports", ensureDbConnection, reportRoutes);

// Root route - must come after other routes
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Construction Management System API",
    status: "Server is running",
    endpoints: {
      auth: "/api/auth",
      users: "/api/users",
      projects: "/api/projects",
      customers: "/api/customers",
      chartofaccounts: "/api/chartofaccounts",
      bankpayments: "/api/bankpayments",
      items: "/api/items",
      purchases: "/api/purchases",
      suppliers: "/api/suppliers",
      salesInvoices: "/api/sales-invoices",
      dashboard: "/api/dashboard",
      accountTypes: "/api/account-types",
      reports: "/api/reports",
      test: "/api/test",
    },
  });
});

// Basic API route - no DB required
app.get("/api/test", (req, res) => {
  res.status(200).json({
    message: "API is working",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// Health check endpoint
app.get("/api/health", async (req, res) => {
  try {
    await connectDB();
    res.status(200).json({
      status: "healthy",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: "unhealthy",
      database: "disconnected",
      error: error.message,
    });
  }
});

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    error: "Not Found",
    message: `Route ${req.method} ${req.url} not found`,
    availableEndpoints: {
      auth: "/api/auth",
      users: "/api/users",
      projects: "/api/projects",
      customers: "/api/customers",
      chartofaccounts: "/api/chartofaccounts",
      bankpayments: "/api/bankpayments",
      items: "/api/items",
      purchases: "/api/purchases",
      suppliers: "/api/suppliers",
      salesInvoices: "/api/sales-invoices",
      dashboard: "/api/dashboard",
      accountTypes: "/api/account-types",
      reports: "/api/reports",
    },
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err.message);
  res.status(500).json({
    error: "Internal server error",
    message: err.message,
  });
});

// Export the serverless handler
module.exports = serverless(app);
