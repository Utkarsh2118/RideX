const express = require("express");

const { createRating, getRideRatings } = require("../controllers/ratingController");
const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);
router.post("/:rideId", createRating);
router.get("/ride/:rideId", getRideRatings);

module.exports = router;
