const Driver = require("../models/Driver");
const Ride = require("../models/Ride");
const { transitionRide } = require("../services/rideService");
const { emitRideStatus } = require("../socket/socketEmitter");

const activeStatuses = [
  "DRIVER_ASSIGNED",
  "DRIVER_ARRIVING",
  "DRIVER_ARRIVED",
  "RIDE_STARTED",
];

const publicRide = (ride) => ({
  id: ride._id,
  passenger: ride.passenger,
  driver: ride.driver,
  pickupLocation: ride.pickupLocation,
  destinationLocation: ride.destinationLocation,
  distanceKm: ride.distanceKm,
  estimatedDurationMinutes: ride.estimatedDurationMinutes,
  fare: ride.fare,
  currency: ride.currency,
  vehicleType: ride.vehicleType,
  paymentMethod: ride.paymentMethod,
  paymentStatus: ride.paymentStatus,
  rideStatus: ride.rideStatus,
  createdAt: ride.createdAt,
  updatedAt: ride.updatedAt,
});

const requireApprovedDriver = async (userId) => {
  const driver = await Driver.findOne({ user: userId, verificationStatus: "approved" });
  if (!driver) {
    const error = new Error("Approved driver profile not found");
    error.statusCode = 403;
    throw error;
  }
  return driver;
};

const getRideRequests = async (req, res) => {
  const driver = await requireApprovedDriver(req.user._id);
  const rides = await Ride.find({
    rideStatus: "SEARCHING_DRIVER",
    vehicleType: driver.vehicleType,
    driver: null,
    rejectedDrivers: { $ne: req.user._id },
  }).sort({ createdAt: 1 }).limit(20);

  res.json({
    success: true,
    message: "Ride requests retrieved successfully",
    data: { rides: rides.map(publicRide) },
  });
};

const acceptRide = async (req, res) => {
  const driver = await requireApprovedDriver(req.user._id);
  const hasActiveRide = await Ride.exists({ driver: req.user._id, rideStatus: { $in: activeStatuses } });

  if (hasActiveRide) {
    return res.status(409).json({ success: false, message: "Complete your current ride before accepting another" });
  }

  const ride = await Ride.findOneAndUpdate(
    {
      _id: req.params.rideId,
      rideStatus: "SEARCHING_DRIVER",
      driver: null,
      vehicleType: driver.vehicleType,
      rejectedDrivers: { $ne: req.user._id },
    },
    { driver: req.user._id, rideStatus: "DRIVER_ASSIGNED" },
    { new: true, runValidators: true },
  );

  if (!ride) {
    return res.status(409).json({ success: false, message: "Ride is no longer available" });
  }

  driver.isOnline = false;
  await driver.save();
  emitRideStatus(ride);

  res.json({ success: true, message: "Ride accepted successfully", data: { ride: publicRide(ride) } });
};

const rejectRide = async (req, res) => {
  await requireApprovedDriver(req.user._id);
  const ride = await Ride.findOneAndUpdate({
    _id: req.params.rideId,
    rideStatus: "SEARCHING_DRIVER",
    driver: null,
    rejectedDrivers: { $ne: req.user._id },
  }, { $addToSet: { rejectedDrivers: req.user._id } }, { new: true });

  if (!ride) return res.status(409).json({ success: false, message: "Ride is no longer available" });

  res.json({ success: true, message: "Ride request rejected", data: { ride: publicRide(ride) } });
};

const updateRideStatus = async (req, res) => {
  await requireApprovedDriver(req.user._id);
  const { status } = req.body && typeof req.body === "object" ? req.body : {};
  if (!["DRIVER_ARRIVING", "DRIVER_ARRIVED", "RIDE_STARTED", "RIDE_COMPLETED"].includes(status)) {
    return res.status(400).json({ success: false, message: "Invalid driver ride status" });
  }

  const ride = await Ride.findOne({ _id: req.params.rideId, driver: req.user._id });
  if (!ride) return res.status(404).json({ success: false, message: "Assigned ride not found" });

  transitionRide(ride, status);
  await ride.save();

  if (status === "RIDE_COMPLETED") {
    await Driver.findOneAndUpdate({ user: req.user._id }, { $inc: { totalRides: 1, totalEarnings: ride.fare }, isOnline: false });
  }

  emitRideStatus(ride);

  res.json({ success: true, message: "Ride status updated successfully", data: { ride: publicRide(ride) } });
};

const getMyActiveRide = async (req, res) => {
  const ride = await Ride.findOne({ driver: req.user._id, rideStatus: { $in: activeStatuses } });
  res.json({ success: true, message: "Active ride retrieved successfully", data: { ride: ride ? publicRide(ride) : null } });
};

module.exports = { getRideRequests, acceptRide, rejectRide, updateRideStatus, getMyActiveRide };
