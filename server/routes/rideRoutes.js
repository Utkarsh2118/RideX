const express = require("express");

const {
  createRide,
  matchRide,
  getMyRides,
  getRideById,
  cancelRide,
  getRideDriverInfo,
} = require("../controllers/rideController");
const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(protect, authorizeRoles("passenger"));

router.post("/", createRide);
router.get("/", getMyRides);
router.post("/:rideId/match", matchRide);
router.get("/:rideId", getRideById);
router.get("/:rideId/driver", getRideDriverInfo);
router.patch("/:rideId/cancel", cancelRide);

module.exports = router;