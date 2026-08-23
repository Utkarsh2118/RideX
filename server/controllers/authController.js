const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^\+?[1-9]\d{9,14}$/;

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
});

// ===============================
// REGISTER USER
// ===============================
const registerUser = async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!name || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    if (name.length < 2 || name.length > 80 || !emailPattern.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid name and email",
      });
    }

    if (!phonePattern.test(phone) || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid phone number and password of at least 8 characters",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { phone }],
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email or phone already registered",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    // Every normal registration starts as passenger
    const user = await User.create({
      name,
      email,
      phone,
      password: hashedPassword,
      role: "passenger",
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: { user: publicUser(user) },
    });
  } catch (error) {
    throw error;
  }
};

// ===============================
// LOGIN USER
// ===============================
const loginUser = async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Compare entered password with hashed password
    const isPasswordCorrect = await bcrypt.compare(
      password,
      user.password
    );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Create JWT token
    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    // Send response
    res.status(200).json({
      success: true,
      message: "Login successful",
      data: { token, user: publicUser(user) },
    });
  } catch (error) {
    throw error;
  }
};

const getCurrentUser = (req, res) => {
  res.status(200).json({
    success: true,
    message: "User retrieved successfully",
    data: { user: publicUser(req.user) },
  });
};

// ===============================
// EXPORT CONTROLLERS
// ===============================
module.exports = {
  registerUser,
  loginUser,
  getCurrentUser,
};