const User = require("../models/User");
const jwt = require("jsonwebtoken");
const { blacklistToken } = require("../middleware/authMiddleware");

// Generate JWT Token with enhanced security
const generateToken = (userId) => {
  return jwt.sign(
    {
      id: userId,
      iat: Math.floor(Date.now() / 1000), // Issued at timestamp
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
      algorithm: "HS256", // Explicitly specify algorithm
    }
  );
};

// @desc    Register a new user (Admin only via Postman)
// @route   POST /api/auth/register
// @access  Public (but should be restricted in production)
exports.register = async (req, res) => {
  try {
    const { name, email, password, role, tenantId } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide name, email, and password",
      });
    }

    // Check if user already exists globally (no tenant scope for registration)
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    // Get or use provided tenantId
    let userTenantId = tenantId;

    // If no tenantId provided, try to get the first tenant (for fresh start)
    if (!userTenantId) {
      const Tenant = require("../models/Tenant");
      const tenant = await Tenant.findOne();
      if (!tenant) {
        return res.status(400).json({
          success: false,
          message:
            "No tenant found. Please create a portal first using /api/tenants/register",
        });
      }
      userTenantId = tenant.tenantId;
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role: role || "user",
      tenantId: userTenantId,
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({
      success: false,
      message: "Error registering user",
      error: error.message,
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    console.log("Login attempt received:", {
      email: req.body.email,
      timestamp: new Date().toISOString(),
    });
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      console.log("Login failed: Missing credentials");
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      });
    }

    // Find user by email only - system will automatically find their tenant
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Account is deactivated",
      });
    }

    // Verify password
    const isPasswordMatch = await user.comparePassword(password);
    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Generate token
    const token = generateToken(user._id);

    // Get tenant info
    const Tenant = require("../models/Tenant");
    const tenant = await Tenant.findOne({ tenantId: user.tenantId }).select(
      "-password"
    );

    console.log("Login successful for:", email);
    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId,
          customPermissions: user.customPermissions,
        },
        tenant: tenant
          ? {
              tenantId: tenant.tenantId,
              portalName: tenant.portalName,
            }
          : null,
        token,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Error logging in",
      error: error.message,
    });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        customPermissions: user.customPermissions,
      },
    });
  } catch (error) {
    console.error("Get me error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching user",
      error: error.message,
    });
  }
};

// @desc    Logout user (blacklist token)
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res) => {
  try {
    // Get token from request (set by protect middleware)
    const token = req.token;

    if (token) {
      // Add token to blacklist
      blacklistToken(token);
    }

    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      message: "Error logging out",
      error: error.message,
    });
  }
};
