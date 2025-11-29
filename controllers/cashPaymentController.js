const CashPayment = require("../models/CashPayment");
const Project = require("../models/Project");
const User = require("../models/User");
const ChartOfAccount = require("../models/ChartOfAccount");

// @desc    Get all cash payments
// @route   GET /api/cash-payments
// @access  Private
exports.getAllCashPayments = async (req, res) => {
  try {
    const cashPayments = await CashPayment.find()
      .populate("project", "name code")
      .populate("employeeRef", "name email")
      .populate("createdBy", "name email")
      .sort({ date: -1 });

    res.status(200).json({
      success: true,
      count: cashPayments.length,
      data: cashPayments,
    });
  } catch (error) {
    console.error("Get all cash payments error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching cash payments",
      error: error.message,
    });
  }
};

// @desc    Get single cash payment by ID
// @route   GET /api/cash-payments/:id
// @access  Private
exports.getCashPaymentById = async (req, res) => {
  try {
    const cashPayment = await CashPayment.findById(req.params.id)
      .populate("project", "name code client")
      .populate("employeeRef", "name email")
      .populate("createdBy", "name email");

    if (!cashPayment) {
      return res.status(404).json({
        success: false,
        message: "Cash payment not found",
      });
    }

    res.status(200).json({
      success: true,
      data: cashPayment,
    });
  } catch (error) {
    console.error("Get cash payment by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching cash payment",
      error: error.message,
    });
  }
};

// @desc    Create new cash payment
// @route   POST /api/cash-payments
// @access  Private
exports.createCashPayment = async (req, res) => {
  try {
    const {
      date,
      project,
      jobDescription,
      employeeRef,
      paymentLines,
      remarks,
    } = req.body;

    // Validation
    if (!date || !paymentLines || paymentLines.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide date and at least one payment line",
      });
    }

    // Verify project if provided
    if (project) {
      const projectExists = await Project.findById(project);
      if (!projectExists) {
        return res.status(404).json({
          success: false,
          message: "Project not found",
        });
      }
    }

    // Verify employee reference if provided
    if (employeeRef) {
      const userExists = await User.findById(employeeRef);
      if (!userExists) {
        return res.status(404).json({
          success: false,
          message: "Employee reference not found",
        });
      }
    }

    // Verify all account codes exist or can be created
    for (const line of paymentLines) {
      if (!line.accountCode || !line.accountName || !line.amount) {
        return res.status(400).json({
          success: false,
          message:
            "Each payment line must have accountCode, accountName, and amount",
        });
      }
    }

    // Calculate total amount
    const totalAmount = paymentLines.reduce(
      (sum, line) => sum + line.amount,
      0
    );

    // Create cash payment data
    const cashPaymentData = {
      date: new Date(date),
      project: project || null,
      jobDescription: jobDescription || "",
      employeeRef: employeeRef || null,
      paymentLines: paymentLines,
      totalAmount: totalAmount,
      remarks: remarks || "",
      createdBy: req.user._id,
    };

    // Create new cash payment
    const cashPayment = await CashPayment.create(cashPaymentData);

    // Populate references before sending response
    await cashPayment.populate("project", "name code");
    await cashPayment.populate("employeeRef", "name email");
    await cashPayment.populate("createdBy", "name email");

    res.status(201).json({
      success: true,
      message: "Cash payment created successfully",
      data: cashPayment,
    });
  } catch (error) {
    console.error("Create cash payment error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating cash payment",
      error: error.message,
      details: error.errors
        ? Object.keys(error.errors).map((key) => ({
            field: key,
            message: error.errors[key].message,
          }))
        : undefined,
    });
  }
};

// @desc    Update cash payment
// @route   PUT /api/cash-payments/:id
// @access  Private
exports.updateCashPayment = async (req, res) => {
  try {
    const cashPayment = await CashPayment.findById(req.params.id);

    if (!cashPayment) {
      return res.status(404).json({
        success: false,
        message: "Cash payment not found",
      });
    }

    const {
      date,
      project,
      jobDescription,
      employeeRef,
      paymentLines,
      remarks,
      cancel,
    } = req.body;

    // Update fields
    if (date) cashPayment.date = new Date(date);
    if (project !== undefined) cashPayment.project = project;
    if (jobDescription !== undefined)
      cashPayment.jobDescription = jobDescription;
    if (employeeRef !== undefined) cashPayment.employeeRef = employeeRef;
    if (remarks !== undefined) cashPayment.remarks = remarks;
    if (typeof cancel === "boolean") cashPayment.cancel = cancel;

    if (paymentLines && paymentLines.length > 0) {
      // Recalculate total amount
      const totalAmount = paymentLines.reduce(
        (sum, line) => sum + line.amount,
        0
      );
      cashPayment.paymentLines = paymentLines;
      cashPayment.totalAmount = totalAmount;
    }

    await cashPayment.save();

    // Populate references before sending response
    await cashPayment.populate("project", "name code");
    await cashPayment.populate("employeeRef", "name email");
    await cashPayment.populate("createdBy", "name email");

    res.status(200).json({
      success: true,
      message: "Cash payment updated successfully",
      data: cashPayment,
    });
  } catch (error) {
    console.error("Update cash payment error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating cash payment",
      error: error.message,
    });
  }
};

// @desc    Delete cash payment
// @route   DELETE /api/cash-payments/:id
// @access  Private
exports.deleteCashPayment = async (req, res) => {
  try {
    const cashPayment = await CashPayment.findById(req.params.id);

    if (!cashPayment) {
      return res.status(404).json({
        success: false,
        message: "Cash payment not found",
      });
    }

    await CashPayment.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Cash payment deleted successfully",
    });
  } catch (error) {
    console.error("Delete cash payment error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting cash payment",
      error: error.message,
    });
  }
};

// @desc    Get cash payments by project
// @route   GET /api/cash-payments/project/:projectId
// @access  Private
exports.getCashPaymentsByProject = async (req, res) => {
  try {
    const cashPayments = await CashPayment.find({
      project: req.params.projectId,
    })
      .populate("project", "name code")
      .populate("employeeRef", "name email")
      .populate("createdBy", "name email")
      .sort({ date: -1 });

    res.status(200).json({
      success: true,
      count: cashPayments.length,
      data: cashPayments,
    });
  } catch (error) {
    console.error("Get cash payments by project error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching cash payments",
      error: error.message,
    });
  }
};

// @desc    Get cash payments by date range
// @route   GET /api/cash-payments/daterange?startDate=&endDate=
// @access  Private
exports.getCashPaymentsByDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Please provide both startDate and endDate",
      });
    }

    const cashPayments = await CashPayment.find({
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    })
      .populate("project", "name code")
      .populate("employeeRef", "name email")
      .populate("createdBy", "name email")
      .sort({ date: -1 });

    res.status(200).json({
      success: true,
      count: cashPayments.length,
      data: cashPayments,
    });
  } catch (error) {
    console.error("Get cash payments by date range error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching cash payments",
      error: error.message,
    });
  }
};
