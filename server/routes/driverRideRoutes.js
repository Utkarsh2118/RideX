const express = require("express");

const {
  getRideRequests,
  acceptRide,
  rejectRide,
  updateRideStatus,
  getMyActiveRide,
} = require("../controllers/driverRideController");
const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(protect, authorizeRoles("driver"));

router.get("/requests", getRideRequests);
router.get("/active", getMyActiveRide);
router.post("/:rideId/accept", acceptRide);
router.post("/:rideId/reject", rejectRide);
router.patch("/:rideId/status", updateRideStatus);

module.exports = router;
