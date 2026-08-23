const Driver = require("../models/Driver");
const Rating = require("../models/Rating");
const Ride = require("../models/Ride");

const publicRating = (rating) => ({
  id: rating._id,
  ride: rating.ride,
  reviewer: rating.reviewer,
  reviewedUser: rating.reviewedUser,
  rating: rating.rating,
  comment: rating.comment,
  createdAt: rating.createdAt,
});

const createRating = async (req, res) => {
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const score = body.rating;
  const comment = typeof body.comment === "string" ? body.comment.trim() : "";

  if (!Number.isInteger(score) || score < 1 || score > 5) {
    return res.status(400).json({ success: false, message: "Rating must be an integer from 1 to 5" });
  }

  if (comment.length > 500) {
    return res.status(400).json({ success: false, message: "Comment cannot exceed 500 characters" });
  }

  const ride = await Ride.findOne({
    _id: req.params.rideId,
    rideStatus: "RIDE_COMPLETED",
    driver: { $ne: null },
    $or: [{ passenger: req.user._id }, { driver: req.user._id }],
  });

  if (!ride) {
    return res.status(403).json({ success: false, message: "You can rate only a completed ride you participated in" });
  }

  const isPassenger = ride.passenger.toString() === req.user._id.toString();
  const reviewedUser = isPassenger ? ride.driver : ride.passenger;
  const rating = await Rating.create({ ride: ride._id, reviewer: req.user._id, reviewedUser, rating: score, comment });

  if (isPassenger) {
    const [summary] = await Rating.aggregate([
      { $match: { reviewedUser: ride.driver } },
      { $group: { _id: "$reviewedUser", average: { $avg: "$rating" } } },
    ]);
    await Driver.findOneAndUpdate({ user: ride.driver }, { rating: Number((summary?.average || 0).toFixed(2)) });
  }

  res.status(201).json({ success: true, message: "Rating submitted successfully", data: { rating: publicRating(rating) } });
};

const getRideRatings = async (req, res) => {
  const ride = await Ride.findOne({ _id: req.params.rideId, $or: [{ passenger: req.user._id }, { driver: req.user._id }] });
  if (!ride) return res.status(404).json({ success: false, message: "Ride not found" });

  const ratings = await Rating.find({ ride: ride._id }).sort({ createdAt: 1 });
  res.json({ success: true, message: "Ratings retrieved successfully", data: { ratings: ratings.map(publicRating) } });
};

module.exports = { createRating, getRideRatings };
