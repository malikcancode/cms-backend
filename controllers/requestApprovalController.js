const RequestApproval = require("../models/RequestApproval");
const Project = require("../models/Project");
const User = require("../models/User");
const SalesInvoice = require("../models/SalesInvoice");
const CashPayment = require("../models/CashPayment");
const BankPayment = require("../models/BankPayment");
const Purchase = require("../models/Purchase");
const Plot = require("../models/Plot");
const Customer = require("../models/Customer");
const Supplier = require("../models/Supplier");

// @desc    Create a new request for any entity creation/editing
// @route   POST /api/request-approvals
// @access  Private (Operator and Custom users)
exports.createRequest = async (req, res) => {
  try {
    const { requestType, requestData, entityId, projectId } = req.body;

    // Validation
    if (!requestType || !requestData) {
      return res.status(400).json({
        success: false,
        message: "Please provide requestType and requestData",
      });
    }

    // Validate request type
    const validTypes = [
      "create_project",
      "edit_project",
      "create_sales_invoice",
      "edit_sales_invoice",
      "create_cash_payment",
      "edit_cash_payment",
      "create_bank_payment",
      "edit_bank_payment",
      "create_purchase",
      "edit_purchase",
      "create_plot",
      "edit_plot",
      "create_customer",
      "edit_customer",
      "create_supplier",
      "edit_supplier",
      "create_user",
      "edit_user",
    ];

    if (!validTypes.includes(requestType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid request type. Must be one of: ${validTypes.join(
          ", "
        )}`,
      });
    }

    // If it's an edit request, entityId or projectId is required
    const isEditRequest = requestType.startsWith("edit_");
    if (isEditRequest && !entityId && !projectId) {
      return res.status(400).json({
        success: false,
        message: "entityId is required for edit requests",
      });
    }

    // Check if entity exists for edit requests
    if (isEditRequest) {
      const id = entityId || projectId;
      let entity;

      if (requestType === "edit_project") entity = await Project.findById(id);
      else if (requestType === "edit_sales_invoice")
        entity = await SalesInvoice.findById(id);
      else if (requestType === "edit_cash_payment")
        entity = await CashPayment.findById(id);
      else if (requestType === "edit_bank_payment")
        entity = await BankPayment.findById(id);
      else if (requestType === "edit_purchase")
        entity = await Purchase.findById(id);
      else if (requestType === "edit_plot") entity = await Plot.findById(id);
      else if (requestType === "edit_customer")
        entity = await Customer.findById(id);
      else if (requestType === "edit_supplier")
        entity = await Supplier.findById(id);
      else if (requestType === "edit_user") entity = await User.findById(id);

      if (!entity) {
        return res.status(404).json({
          success: false,
          message: "Entity not found",
        });
      }
    }

    // Check if user already has a pending request for the same entity
    if (isEditRequest) {
      const id = entityId || projectId;
      const existingRequest = await RequestApproval.findOne({
        userId: req.user.id,
        $or: [{ entityId: id }, { projectId: id }],
        status: "pending",
      });

      if (existingRequest) {
        return res.status(400).json({
          success: false,
          message: "You already have a pending request for this entity",
        });
      }
    }

    // Create the request
    const request = await RequestApproval.create({
      userId: req.user.id,
      requestType,
      requestData,
      entityId: entityId || projectId || null,
      projectId: projectId || null, // Backward compatibility
    });

    // Populate user details
    await request.populate("userId", "name email role");

    if (requestType === "edit_project") {
      await request.populate("projectId", "name code");
    }

    res.status(201).json({
      success: true,
      message: "Request created successfully. Waiting for admin approval.",
      data: request,
    });
  } catch (error) {
    console.error("Create request error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating request",
      error: error.message,
    });
  }
};

// @desc    Get all requests for the logged-in user
// @route   GET /api/request-approvals/my-requests
// @access  Private
exports.getMyRequests = async (req, res) => {
  try {
    const requests = await RequestApproval.find({ userId: req.user.id })
      .populate("userId", "name email role")
      .populate("projectId", "name code")
      .populate("approvedBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: requests.length,
      data: requests,
    });
  } catch (error) {
    console.error("Get my requests error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching requests",
      error: error.message,
    });
  }
};

// @desc    Get all pending requests (Admin only)
// @route   GET /api/request-approvals/pending
// @access  Private/Admin
exports.getPendingRequests = async (req, res) => {
  try {
    const requests = await RequestApproval.find({ status: "pending" })
      .populate("userId", "name email role customPermissions")
      .populate("projectId", "name code")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: requests.length,
      data: requests,
    });
  } catch (error) {
    console.error("Get pending requests error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching pending requests",
      error: error.message,
    });
  }
};

// @desc    Get all requests (Admin only)
// @route   GET /api/request-approvals
// @access  Private/Admin
exports.getAllRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};

    if (status) {
      filter.status = status;
    }

    const requests = await RequestApproval.find(filter)
      .populate("userId", "name email role customPermissions")
      .populate("projectId", "name code")
      .populate("approvedBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: requests.length,
      data: requests,
    });
  } catch (error) {
    console.error("Get all requests error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching requests",
      error: error.message,
    });
  }
};

// @desc    Approve a request and create/update project
// @route   PUT /api/request-approvals/:id/approve
// @access  Private/Admin
exports.approveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminResponse } = req.body;

    // Find the request
    const request = await RequestApproval.findById(id).populate(
      "userId",
      "name email role"
    );

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Request not found",
      });
    }

    // Check if already processed
    if (request.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Request has already been ${request.status}`,
      });
    }

    let entity;
    const entityId = request.entityId || request.projectId;

    // Handle based on request type
    const requestTypeHandlers = {
      // Project handlers
      create_project: async () => {
        entity = await Project.create({
          ...request.requestData,
          createdBy: request.userId._id,
        });
        await entity.populate("createdBy", "name email role");
      },
      edit_project: async () => {
        entity = await Project.findById(entityId);
        if (!entity) throw new Error("Project not found");
        Object.assign(entity, request.requestData);
        await entity.save();
        await entity.populate("createdBy", "name email role");
      },

      // Sales Invoice handlers
      create_sales_invoice: async () => {
        entity = await SalesInvoice.create({
          ...request.requestData,
          createdBy: request.userId._id,
        });
      },
      edit_sales_invoice: async () => {
        entity = await SalesInvoice.findById(entityId);
        if (!entity) throw new Error("Sales Invoice not found");
        Object.assign(entity, request.requestData);
        await entity.save();
      },

      // Cash Payment handlers
      create_cash_payment: async () => {
        entity = await CashPayment.create({
          ...request.requestData,
          createdBy: request.userId._id,
        });
      },
      edit_cash_payment: async () => {
        entity = await CashPayment.findById(entityId);
        if (!entity) throw new Error("Cash Payment not found");
        Object.assign(entity, request.requestData);
        await entity.save();
      },

      // Bank Payment handlers
      create_bank_payment: async () => {
        entity = await BankPayment.create({
          ...request.requestData,
          createdBy: request.userId._id,
        });
      },
      edit_bank_payment: async () => {
        entity = await BankPayment.findById(entityId);
        if (!entity) throw new Error("Bank Payment not found");
        Object.assign(entity, request.requestData);
        await entity.save();
      },

      // Purchase handlers
      create_purchase: async () => {
        entity = await Purchase.create({
          ...request.requestData,
          createdBy: request.userId._id,
        });
      },
      edit_purchase: async () => {
        entity = await Purchase.findById(entityId);
        if (!entity) throw new Error("Purchase not found");
        Object.assign(entity, request.requestData);
        await entity.save();
      },

      // Plot handlers
      create_plot: async () => {
        entity = await Plot.create({
          ...request.requestData,
          createdBy: request.userId._id,
        });
      },
      edit_plot: async () => {
        entity = await Plot.findById(entityId);
        if (!entity) throw new Error("Plot not found");
        Object.assign(entity, request.requestData);
        await entity.save();
      },

      // Customer handlers
      create_customer: async () => {
        entity = await Customer.create(request.requestData);
      },
      edit_customer: async () => {
        entity = await Customer.findById(entityId);
        if (!entity) throw new Error("Customer not found");
        Object.assign(entity, request.requestData);
        await entity.save();
      },

      // Supplier handlers
      create_supplier: async () => {
        entity = await Supplier.create(request.requestData);
      },
      edit_supplier: async () => {
        entity = await Supplier.findById(entityId);
        if (!entity) throw new Error("Supplier not found");
        Object.assign(entity, request.requestData);
        await entity.save();
      },

      // User handlers
      create_user: async () => {
        entity = await User.create(request.requestData);
      },
      edit_user: async () => {
        entity = await User.findById(entityId);
        if (!entity) throw new Error("User not found");
        Object.assign(entity, request.requestData);
        await entity.save();
      },
    };

    // Execute the appropriate handler
    const handler = requestTypeHandlers[request.requestType];
    if (handler) {
      await handler();
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid request type",
      });
    }

    // Update request status
    request.status = "approved";
    request.adminResponse = adminResponse || "Approved";
    request.approvedBy = req.user.id;
    request.approvedAt = new Date();
    await request.save();

    await request.populate("approvedBy", "name email");
    if (request.projectId) {
      await request.populate("projectId", "name code");
    }

    res.status(200).json({
      success: true,
      message: "Request approved and entity processed successfully",
      data: {
        request,
        entity,
      },
    });
  } catch (error) {
    console.error("Approve request error:", error);
    res.status(500).json({
      success: false,
      message: "Error approving request",
      error: error.message,
    });
  }
};

// @desc    Reject a request
// @route   PUT /api/request-approvals/:id/reject
// @access  Private/Admin
exports.rejectRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminResponse } = req.body;

    // Find the request
    const request = await RequestApproval.findById(id)
      .populate("userId", "name email role")
      .populate("projectId", "name code");

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Request not found",
      });
    }

    // Check if already processed
    if (request.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Request has already been ${request.status}`,
      });
    }

    // Validate admin response
    if (!adminResponse) {
      return res.status(400).json({
        success: false,
        message: "Please provide a reason for rejection",
      });
    }

    // Update request status
    request.status = "rejected";
    request.adminResponse = adminResponse;
    request.approvedBy = req.user.id;
    request.approvedAt = new Date();
    await request.save();

    await request.populate("approvedBy", "name email");

    res.status(200).json({
      success: true,
      message: "Request rejected successfully",
      data: request,
    });
  } catch (error) {
    console.error("Reject request error:", error);
    res.status(500).json({
      success: false,
      message: "Error rejecting request",
      error: error.message,
    });
  }
};

// @desc    Delete a request
// @route   DELETE /api/request-approvals/:id
// @access  Private (Admin or request owner)
exports.deleteRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const request = await RequestApproval.findById(id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Request not found",
      });
    }

    // Check if user is admin or the request owner
    if (
      req.user.role !== "admin" &&
      request.userId.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this request",
      });
    }

    await request.deleteOne();

    res.status(200).json({
      success: true,
      message: "Request deleted successfully",
    });
  } catch (error) {
    console.error("Delete request error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting request",
      error: error.message,
    });
  }
};

// @desc    Get request statistics (Admin only)
// @route   GET /api/request-approvals/stats
// @access  Private/Admin
exports.getRequestStats = async (req, res) => {
  try {
    const stats = await RequestApproval.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const formattedStats = {
      pending: 0,
      approved: 0,
      rejected: 0,
      total: 0,
    };

    stats.forEach((stat) => {
      formattedStats[stat._id] = stat.count;
      formattedStats.total += stat.count;
    });

    res.status(200).json({
      success: true,
      data: formattedStats,
    });
  } catch (error) {
    console.error("Get request stats error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching request statistics",
      error: error.message,
    });
  }
};
