require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./db/db");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://construction-management-system-soft.vercel.app",
    ], // Vite default port and production URL
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
connectDB();

// Routes
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const projectRoutes = require("./routes/projectRoutes");
const customerRoutes = require("./routes/customerRoutes");
const chartOfAccountRoutes = require("./routes/chartOfAccountRoutes");
const bankPaymentRoutes = require("./routes/bankPaymentRoutes");
const itemRoutes = require("./routes/itemRoutes");
const purchaseRoutes = require("./routes/purchaseRoutes");
const supplierRoutes = require("./routes/supplierRoutes");
const salesInvoiceRoutes = require("./routes/salesInvoiceRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const accountTypeRoutes = require("./routes/accountTypeRoutes");
const reportRoutes = require("./routes/reportRoutes");

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

// Root route
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

// Basic API route
app.get("/api/test", (req, res) => {
  res.status(200).json({ message: "API is working" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err.message);
  res.status(500).json({ error: "Internal server error" });
});

// Start server
app.listen(PORT, () => {
  console.log(`✓ Server running on port ${PORT}`);
  console.log(`✓ Environment: ${process.env.NODE_ENV}`);
});
