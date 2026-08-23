const express = require("express");

const { getStats, getUsers, getRides } = require("../controllers/adminController");
const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(protect, authorizeRoles("admin"));
router.get("/stats", getStats);
router.get("/users", getUsers);
router.get("/rides", getRides);

module.exports = router;
