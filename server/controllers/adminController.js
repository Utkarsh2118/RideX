const Driver = require("../models/Driver");
const Ride = require("../models/Ride");
const User = require("../models/User");

const publicUser = (user) => ({ id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role, createdAt: user.createdAt });
const publicRide = (ride) => ({ id: ride._id, passenger: ride.passenger, driver: ride.driver, vehicleType: ride.vehicleType, fare: ride.fare, paymentStatus: ride.paymentStatus, rideStatus: ride.rideStatus, createdAt: ride.createdAt });
const pageParams = (query) => ({ page: Math.max(Number.parseInt(query.page, 10) || 1, 1), limit: Math.min(Math.max(Number.parseInt(query.limit, 10) || 20, 1), 100) });

const getStats = async (req, res) => {
  const [totalUsers, totalDrivers, verifiedDrivers, pendingDrivers, activeRides, completedRides, cancelledRides, revenueResult] = await Promise.all([
    User.countDocuments(),
    Driver.countDocuments(),
    Driver.countDocuments({ verificationStatus: "approved" }),
    Driver.countDocuments({ verificationStatus: "pending" }),
    Ride.countDocuments({ rideStatus: { $nin: ["RIDE_COMPLETED", "CANCELLED"] } }),
    Ride.countDocuments({ rideStatus: "RIDE_COMPLETED" }),
    Ride.countDocuments({ rideStatus: "CANCELLED" }),
    Ride.aggregate([{ $match: { rideStatus: "RIDE_COMPLETED", paymentStatus: "paid" } }, { $group: { _id: null, total: { $sum: "$fare" } } }]),
  ]);

  res.json({ success: true, message: "Admin statistics retrieved successfully", data: { stats: { totalUsers, totalDrivers, verifiedDrivers, pendingDrivers, activeRides, completedRides, cancelledRides, totalRevenue: revenueResult[0]?.total || 0 } } });
};

const getUsers = async (req, res) => {
  const { page, limit } = pageParams(req.query);
  const [users, total] = await Promise.all([User.find().select("-password").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit), User.countDocuments()]);
  res.json({ success: true, message: "Users retrieved successfully", data: { users: users.map(publicUser), page, limit, total } });
};

const getRides = async (req, res) => {
  const { page, limit } = pageParams(req.query);
  const filter = req.query.status ? { rideStatus: req.query.status } : {};
  const [rides, total] = await Promise.all([Ride.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit), Ride.countDocuments(filter)]);
  res.json({ success: true, message: "Rides retrieved successfully", data: { rides: rides.map(publicRide), page, limit, total } });
};

module.exports = { getStats, getUsers, getRides };
