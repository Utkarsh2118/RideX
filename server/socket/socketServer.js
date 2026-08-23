const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Driver = require("../models/Driver");
const Ride = require("../models/Ride");
const { transitionRide } = require("../services/rideService");

const validStatuses = [
  "DRIVER_ARRIVING",
  "DRIVER_ARRIVED",
  "RIDE_STARTED",
  "RIDE_COMPLETED",
];

const isValidLocation = (location) => {
  if (!location || location.type !== "Point" || !Array.isArray(location.coordinates) || location.coordinates.length !== 2) {
    return false;
  }

  const [longitude, latitude] = location.coordinates;
  return Number.isFinite(longitude) && Number.isFinite(latitude) &&
    longitude >= -180 && longitude <= 180 && latitude >= -90 && latitude <= 90;
};

const socketError = (message) => ({ success: false, message });

const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Unauthorized"));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || typeof decoded !== "object" || !decoded.id) {
      return next(new Error("Unauthorized"));
    }

    const user = await User.findById(decoded.id).select("-password");
    if (!user) return next(new Error("Unauthorized"));

    socket.user = user;
    next();
  } catch (error) {
    next(new Error(error.name === "TokenExpiredError" ? "Token expired" : "Unauthorized"));
  }
};

const getAuthorizedRide = async (socket, rideId) => {
  if (!rideId || !require("mongoose").isValidObjectId(rideId)) return null;

  return Ride.findOne({
    _id: rideId,
    $or: [{ passenger: socket.user._id }, { driver: socket.user._id }],
  });
};

const registerSocketServer = (io) => {
  io.use(authenticateSocket);

  io.on("connection", (socket) => {
    socket.on("ride:subscribe", async ({ rideId } = {}, acknowledge) => {
      const ride = await getAuthorizedRide(socket, rideId);
      if (!ride) return acknowledge?.(socketError("Ride not found or unauthorized"));

      socket.join(`ride:${ride._id}`);
      acknowledge?.({ success: true, message: "Subscribed to ride updates" });
      socket.emit("ride:state", {
        rideId: ride._id,
        rideStatus: ride.rideStatus,
        driverLocation: null,
      });
    });

    socket.on("ride:unsubscribe", ({ rideId } = {}) => {
      if (rideId) socket.leave(`ride:${rideId}`);
    });

    socket.on("driver:location", async ({ rideId, location } = {}, acknowledge) => {
      if (socket.user.role !== "driver" || !isValidLocation(location)) {
        return acknowledge?.(socketError("Unauthorized or invalid driver location"));
      }

      const ride = await Ride.findOne({ _id: rideId, driver: socket.user._id });
      if (!ride || ride.rideStatus === "RIDE_COMPLETED" || ride.rideStatus === "CANCELLED") {
        return acknowledge?.(socketError("Ride is not available for location updates"));
      }

      const driver = await Driver.findOneAndUpdate(
        { user: socket.user._id, verificationStatus: "approved" },
        { currentLocation: location },
        { new: true },
      );
      if (!driver) return acknowledge?.(socketError("Approved driver profile not found"));

      io.to(`ride:${ride._id}`).emit("driver:location", {
        rideId: ride._id,
        location,
        updatedAt: new Date().toISOString(),
      });
      acknowledge?.({ success: true, message: "Driver location updated" });
    });

    socket.on("driver:status", async ({ rideId, status } = {}, acknowledge) => {
      if (socket.user.role !== "driver" || !validStatuses.includes(status)) {
        return acknowledge?.(socketError("Unauthorized or invalid ride status"));
      }

      const ride = await Ride.findOne({ _id: rideId, driver: socket.user._id });
      if (!ride) return acknowledge?.(socketError("Ride not found or unauthorized"));

      try {
        transitionRide(ride, status);
        await ride.save();
      } catch (error) {
        return acknowledge?.(socketError(error.message));
      }

      io.to(`ride:${ride._id}`).emit("ride:status", {
        rideId: ride._id,
        rideStatus: ride.rideStatus,
        updatedAt: new Date().toISOString(),
      });
      acknowledge?.({ success: true, message: "Ride status updated" });
    });
  });
};

module.exports = registerSocketServer;
