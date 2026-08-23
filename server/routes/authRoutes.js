const express = require("express");

const {
  registerUser,
  loginUser,
  getCurrentUser,
} = require("../controllers/authController");
const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

// Register
router.post("/register", registerUser);

// Login
router.post("/login", loginUser);

router.get("/me", protect, getCurrentUser);
router.get("/passenger-only", protect, authorizeRoles("passenger"), getCurrentUser);
router.get("/driver-only", protect, authorizeRoles("driver"), getCurrentUser);
router.get("/admin-only", protect, authorizeRoles("admin"), getCurrentUser);

module.exports = router;