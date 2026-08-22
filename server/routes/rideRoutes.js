const express = require("express");

const {
  createRide,
  getMyRides,
  getRideById,
  cancelRide,
} = require("../controllers/rideController");
const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(protect, authorizeRoles("passenger"));

router.post("/", createRide);
router.get("/", getMyRides);
router.get("/:rideId", getRideById);
router.patch("/:rideId/cancel", cancelRide);

module.exports = router;
