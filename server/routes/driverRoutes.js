const express = require("express");

const {
  submitOnboarding,
  getMyDriverProfile,
  setOnlineStatus,
  listDrivers,
  reviewDriver,
} = require("../controllers/driverController");
const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(protect);

router.post("/onboarding", authorizeRoles("passenger", "driver"), submitOnboarding);
router.get("/me/status", authorizeRoles("passenger", "driver"), getMyDriverProfile);
router.get("/me", authorizeRoles("driver"), getMyDriverProfile);
router.patch("/me/online", authorizeRoles("driver"), setOnlineStatus);
router.get("/", authorizeRoles("admin"), listDrivers);
router.patch("/:driverId/verification", authorizeRoles("admin"), reviewDriver);

module.exports = router;
