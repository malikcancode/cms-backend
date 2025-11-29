const SalesInvoice = require("../models/SalesInvoice");
const Purchase = require("../models/Purchase");
const BankPayment = require("../models/BankPayment");
const Item = require("../models/Item");

// @desc    Get Income Statement
// @route   GET /api/reports/income-statement
// @access  Private
const getIncomeStatement = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Build date filter
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.date = {};
      if (startDate) dateFilter.date.$gte = new Date(startDate);
      if (endDate) dateFilter.date.$lte = new Date(endDate);
    }

    // Get all sales invoices (Revenue)
    const salesInvoices = await SalesInvoice.find(dateFilter);
    const totalRevenue = salesInvoices.reduce(
      (sum, invoice) => sum + (invoice.netTotal || 0),
      0
    );

    // Get all purchases (Direct Costs)
    const purchases = await Purchase.find(dateFilter);
    const totalPurchases = purchases.reduce(
      (sum, purchase) => sum + (purchase.netAmount || 0),
      0
    );

    // Get all bank payments (Operating Expenses)
    const bankPayments = await BankPayment.find(dateFilter);

    // Categorize expenses
    const expenseCategories = {
      materialExpense: 0,
      labourWages: 0,
      transportationExpense: 0,
      administrativeExpenses: 0,
      utilities: 0,
      maintenance: 0,
      otherExpenses: 0,
    };

    bankPayments.forEach((payment) => {
      const amount = payment.amount || 0;
      const description = (payment.description || "").toLowerCase();

      if (
        description.includes("material") ||
        description.includes("cement") ||
        description.includes("steel")
      ) {
        expenseCategories.materialExpense += amount;
      } else if (
        description.includes("labour") ||
        description.includes("wage") ||
        description.includes("salary")
      ) {
        expenseCategories.labourWages += amount;
      } else if (
        description.includes("transport") ||
        description.includes("freight") ||
        description.includes("delivery")
      ) {
        expenseCategories.transportationExpense += amount;
      } else if (
        description.includes("admin") ||
        description.includes("office")
      ) {
        expenseCategories.administrativeExpenses += amount;
      } else if (
        description.includes("utility") ||
        description.includes("electricity") ||
        description.includes("water")
      ) {
        expenseCategories.utilities += amount;
      } else if (
        description.includes("maintenance") ||
        description.includes("repair")
      ) {
        expenseCategories.maintenance += amount;
      } else {
        expenseCategories.otherExpenses += amount;
      }
    });

    // Add purchases to material expense
    expenseCategories.materialExpense += totalPurchases;

    // Calculate totals
    const totalOperatingExpenses = Object.values(expenseCategories).reduce(
      (sum, val) => sum + val,
      0
    );

    const grossProfit = totalRevenue - totalOperatingExpenses;

    // For now, other income is from any received payments not categorized
    const otherIncome = salesInvoices.reduce(
      (sum, invoice) =>
        sum + (invoice.amountReceived || 0) - (invoice.netTotal || 0),
      0
    );

    const netIncome = grossProfit + otherIncome;

    res.status(200).json({
      success: true,
      data: {
        revenue: totalRevenue,
        expenses: expenseCategories,
        totalOperatingExpenses,
        grossProfit,
        otherIncome: otherIncome > 0 ? otherIncome : 0,
        netIncome,
        period: {
          startDate: startDate || "Beginning",
          endDate: endDate || "Present",
        },
      },
    });
  } catch (error) {
    console.error("Error fetching income statement:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching income statement",
      error: error.message,
    });
  }
};

// @desc    Get Inventory Report
// @route   GET /api/reports/inventory
// @access  Private
const getInventoryReport = async (req, res) => {
  try {
    // Get all items from inventory
    const items = await Item.find().sort({ name: 1 });

    // Get all purchases to calculate stock
    const purchases = await Purchase.find();

    // Get all sales invoices to calculate stock out
    const salesInvoices = await SalesInvoice.find().populate("items");

    // Calculate stock for each item
    const inventoryReport = await Promise.all(
      items.map(async (item) => {
        // Calculate total purchased quantity
        const purchasedQty = purchases
          .filter((p) => p.itemCode === item.itemCode)
          .reduce((sum, p) => sum + (p.quantity || 0), 0);

        // Calculate total sold quantity from sales invoices
        let soldQty = 0;
        salesInvoices.forEach((invoice) => {
          const invoiceItems = invoice.items || [];
          invoiceItems.forEach((invItem) => {
            if (invItem.itemCode === item.itemCode) {
              soldQty += invItem.quantity || 0;
            }
          });
        });

        // Get current stock from Item model (already managed by purchase/sales operations)
        const currentStock = item.currentStock || 0;

        // Calculate stock value
        const stockValue = currentStock * (item.sellingPrice || 0);

        // Determine status based on actual stock levels
        let status = "In Stock";
        if (currentStock <= 0) {
          status = "Out of Stock";
        } else if (currentStock <= (item.minStockLevel || 0)) {
          status = "Low Stock";
        }

        return {
          itemId: item._id,
          itemCode: item.itemCode,
          itemName: item.name,
          category: item.categoryName,
          unit: item.measurement,
          openingStock: 0, // No longer tracking opening stock separately
          purchased: purchasedQty,
          sold: soldQty,
          currentStock,
          rate: item.sellingPrice || 0,
          stockValue,
          minStockLevel: item.minStockLevel || 0,
          status,
        };
      })
    );

    // Calculate summary
    const totalItems = inventoryReport.length;
    const totalInventoryValue = inventoryReport.reduce(
      (sum, item) => sum + item.stockValue,
      0
    );
    const lowStockItems = inventoryReport.filter(
      (item) => item.status === "Low Stock"
    ).length;
    const outOfStockItems = inventoryReport.filter(
      (item) => item.status === "Out of Stock"
    ).length;

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalItems,
          totalInventoryValue,
          lowStockItems,
          outOfStockItems,
          inStockItems: totalItems - lowStockItems - outOfStockItems,
        },
        inventory: inventoryReport,
      },
    });
  } catch (error) {
    console.error("Error fetching inventory report:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching inventory report",
      error: error.message,
    });
  }
};

// @desc    Get Supplier Ledger Report
// @route   GET /api/reports/supplier-ledger/:supplierId
// @access  Private
const getSupplierLedger = async (req, res) => {
  try {
    const { supplierId } = req.params;
    const { startDate, endDate } = req.query;

    // Get supplier details
    const Supplier = require("../models/Supplier");
    const supplier = await Supplier.findById(supplierId);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      });
    }

    // Build date filter
    const dateFilter = { vendorName: supplier.name };
    if (startDate || endDate) {
      dateFilter.date = {};
      if (startDate) dateFilter.date.$gte = new Date(startDate);
      if (endDate) dateFilter.date.$lte = new Date(endDate);
    }

    // Get all purchases for this supplier
    const purchases = await Purchase.find(dateFilter).sort({ date: 1 });

    // Get all payments made to this supplier (from bank payments)
    const paymentFilter = {
      $or: [
        { payTo: supplier.name },
        { payTo: { $regex: supplier.name, $options: "i" } },
      ],
    };
    if (startDate || endDate) {
      paymentFilter.date = {};
      if (startDate) paymentFilter.date.$gte = new Date(startDate);
      if (endDate) paymentFilter.date.$lte = new Date(endDate);
    }

    const payments = await BankPayment.find(paymentFilter).sort({ date: 1 });

    // Calculate totals
    const totalPurchases = purchases.reduce(
      (sum, p) => sum + (p.netAmount || 0),
      0
    );
    const totalPayments = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const balance = totalPurchases - totalPayments;

    // Build transaction ledger (combine purchases and payments)
    const transactions = [];

    purchases.forEach((purchase) => {
      transactions.push({
        date: purchase.date,
        type: "Purchase",
        reference: purchase.purchaseNo || "N/A",
        description: `${purchase.itemName || "Purchase"} - Qty: ${
          purchase.quantity
        }`,
        debit: purchase.netAmount || 0,
        credit: 0,
        itemCode: purchase.itemCode,
        itemName: purchase.itemName,
        quantity: purchase.quantity,
        rate: purchase.rate,
      });
    });

    payments.forEach((payment) => {
      transactions.push({
        date: payment.date,
        type: "Payment",
        reference: payment.voucherNo || "N/A",
        description: payment.description || "Payment",
        debit: 0,
        credit: payment.amount || 0,
        paymentMethod: payment.paymentMethod,
        bankName: payment.bankName,
      });
    });

    // Sort by date
    transactions.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calculate running balance
    let runningBalance = 0;
    transactions.forEach((transaction) => {
      runningBalance += transaction.debit - transaction.credit;
      transaction.balance = runningBalance;
    });

    res.status(200).json({
      success: true,
      data: {
        supplier: {
          id: supplier._id,
          code: supplier.code,
          name: supplier.name,
          company: supplier.company,
          category: supplier.category,
          email: supplier.email,
          phone: supplier.phone,
          address: supplier.address,
          city: supplier.city,
          country: supplier.country,
          status: supplier.status,
        },
        summary: {
          totalPurchases,
          totalPayments,
          balance,
          purchaseCount: purchases.length,
          paymentCount: payments.length,
        },
        transactions,
        period: {
          startDate: startDate || "Beginning",
          endDate: endDate || "Present",
        },
      },
    });
  } catch (error) {
    console.error("Error fetching supplier ledger:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching supplier ledger",
      error: error.message,
    });
  }
};

// @desc    Get Project Ledger Report
// @route   GET /api/reports/project-ledger/:projectId
// @access  Private
const getProjectLedger = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { startDate, endDate } = req.query;

    const AccountingService = require("../services/accountingService");
    const Project = require("../models/Project");

    // Verify project exists
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const ledger = await AccountingService.getProjectLedger(
      projectId,
      startDate,
      endDate
    );

    res.status(200).json({
      success: true,
      data: {
        project: {
          id: project._id,
          name: project.name,
          code: project.code,
          client: project.client,
          estimatedCost: project.estimatedCost,
          status: project.status,
        },
        ...ledger,
      },
    });
  } catch (error) {
    console.error("Error fetching project ledger:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching project ledger",
      error: error.message,
    });
  }
};

// @desc    Get Customer Ledger Report
// @route   GET /api/reports/customer-ledger/:customerId
// @access  Private
const getCustomerLedger = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { startDate, endDate } = req.query;

    const AccountingService = require("../services/accountingService");

    const ledger = await AccountingService.getCustomerLedger(
      customerId,
      startDate,
      endDate
    );

    res.status(200).json({
      success: true,
      data: ledger,
    });
  } catch (error) {
    console.error("Error fetching customer ledger:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching customer ledger",
      error: error.message,
    });
  }
};

// @desc    Get Supplier Ledger Report (New Version using AccountingService)
// @route   GET /api/reports/supplier-ledger-v2/:supplierCode
// @access  Private
const getSupplierLedgerV2 = async (req, res) => {
  try {
    const { supplierCode } = req.params;
    const { startDate, endDate } = req.query;

    const AccountingService = require("../services/accountingService");

    const ledger = await AccountingService.getSupplierLedger(
      supplierCode,
      startDate,
      endDate
    );

    res.status(200).json({
      success: true,
      data: ledger,
    });
  } catch (error) {
    console.error("Error fetching supplier ledger:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching supplier ledger",
      error: error.message,
    });
  }
};

// @desc    Get Inventory Report (New Version using AccountingService)
// @route   GET /api/reports/inventory-v2
// @access  Private
const getInventoryReportV2 = async (req, res) => {
  try {
    const AccountingService = require("../services/accountingService");

    const report = await AccountingService.getInventoryReport();

    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error("Error fetching inventory report:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching inventory report",
      error: error.message,
    });
  }
};

// @desc    Record customer payment receipt
// @route   POST /api/reports/payment-receipt
// @access  Private
const recordPaymentReceipt = async (req, res) => {
  try {
    const {
      customerId,
      customerName,
      amount,
      paymentMethod,
      bankName,
      invoiceRef,
      date,
      reference,
      description,
    } = req.body;

    // Validation
    if (!customerId || !customerName || !amount || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: "Please provide customer, amount, and payment method",
      });
    }

    const AccountingService = require("../services/accountingService");
    const Customer = require("../models/Customer");
    const SalesInvoice = require("../models/SalesInvoice");

    // Verify customer exists
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // If invoice reference provided, update the invoice
    if (invoiceRef) {
      const invoice = await SalesInvoice.findOne({ serialNo: invoiceRef });
      if (invoice) {
        invoice.amountReceived += amount;
        invoice.balance = invoice.netTotal - invoice.amountReceived;

        // Update status
        if (invoice.amountReceived >= invoice.netTotal) {
          invoice.status = "paid";
          invoice.balance = 0;
        } else if (invoice.amountReceived > 0) {
          invoice.status = "partial";
        }

        await invoice.save();
      }
    }

    // Update customer balance
    await Customer.findByIdAndUpdate(customerId, {
      $inc: { balance: -amount },
    });

    // Create journal entry
    const payment = {
      customerName,
      amount,
      paymentMethod,
      bankName,
      invoiceRef,
      date: date || new Date(),
      reference: reference || `PR-${Date.now()}`,
      description: description || `Payment received from ${customerName}`,
    };

    const journalEntry = await AccountingService.createPaymentReceiptEntry(
      payment,
      req.user._id
    );

    res.status(201).json({
      success: true,
      message: "Payment receipt recorded successfully",
      data: {
        journalEntry: journalEntry.entryNumber,
        amount: amount,
        customer: customerName,
      },
    });
  } catch (error) {
    console.error("Error recording payment receipt:", error);
    res.status(500).json({
      success: false,
      message: "Error recording payment receipt",
      error: error.message,
    });
  }
};

// @desc    Record supplier payment
// @route   POST /api/reports/supplier-payment
// @access  Private
const recordSupplierPayment = async (req, res) => {
  try {
    const {
      supplierCode,
      supplierName,
      amount,
      paymentMethod,
      bankName,
      purchaseRef,
      date,
      reference,
      description,
    } = req.body;

    // Validation
    if (!supplierCode || !supplierName || !amount || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: "Please provide supplier, amount, and payment method",
      });
    }

    const AccountingService = require("../services/accountingService");
    const Supplier = require("../models/Supplier");
    const Purchase = require("../models/Purchase");

    // Verify supplier exists
    const supplier = await Supplier.findOne({ code: supplierCode });
    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      });
    }

    // If purchase reference provided, update the purchase
    if (purchaseRef) {
      const purchase = await Purchase.findOne({ purchaseOrderNo: purchaseRef });
      if (purchase) {
        purchase.amountPaid = (purchase.amountPaid || 0) + amount;

        // Update payment status
        if (purchase.amountPaid >= purchase.netAmount) {
          purchase.paymentStatus = "paid";
        } else if (purchase.amountPaid > 0) {
          purchase.paymentStatus = "partial";
        }

        // Add to payments array
        purchase.payments.push({
          amount: amount,
          date: date || new Date(),
          description: description || `Payment to ${supplierName}`,
        });

        await purchase.save();
      }
    }

    // Create journal entry
    const payment = {
      supplierName,
      amount,
      paymentMethod,
      bankName,
      purchaseRef,
      date: date || new Date(),
      reference: reference || `SP-${Date.now()}`,
      description: description || `Payment to ${supplierName}`,
    };

    const journalEntry = await AccountingService.createSupplierPaymentEntry(
      payment,
      req.user._id
    );

    res.status(201).json({
      success: true,
      message: "Supplier payment recorded successfully",
      data: {
        journalEntry: journalEntry.entryNumber,
        amount: amount,
        supplier: supplierName,
      },
    });
  } catch (error) {
    console.error("Error recording supplier payment:", error);
    res.status(500).json({
      success: false,
      message: "Error recording supplier payment",
      error: error.message,
    });
  }
};

module.exports = {
  getIncomeStatement,
  getInventoryReport,
  getSupplierLedger,
  getProjectLedger,
  getCustomerLedger,
  getSupplierLedgerV2,
  getInventoryReportV2,
  recordPaymentReceipt,
  recordSupplierPayment,
};
