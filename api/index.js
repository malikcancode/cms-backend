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
      "https://cms-backend-rouge.vercel.app",
      process.env.FRONTEND_URL,
      process.env.BACKEND_URL,
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

// Connect to DB once when the serverless function initializes
connectDB().catch((error) => {
  console.error("Initial DB connection failed:", error.message);
});

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

// Mount routes - DB connection is handled globally
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/chartofaccounts", chartOfAccountRoutes);
app.use("/api/bankpayments", bankPaymentRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/purchases", purchaseRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/sales-invoices", salesInvoiceRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/account-types", accountTypeRoutes);
app.use("/api/reports", reportRoutes);

// API base route
app.get("/api", (req, res) => {
  res.status(200).json({
    message: "Construction Management System API",
    status: "Server is running",
    version: "1.0.0",
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
    },
  });
});

// Root route - redirect to /api
app.get("/", (req, res) => {
  res.redirect(301, "/api");
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
app.get("/api/health", (req, res) => {
  const mongoose = require("mongoose");
  const isConnected = mongoose.connection.readyState === 1;

  res.status(isConnected ? 200 : 503).json({
    status: isConnected ? "healthy" : "unhealthy",
    database: isConnected ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  });
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
