const Ride = require("../models/Ride");
const { calculateFare } = require("../services/fareService");
const { transitionRide } = require("../services/rideService");
const { matchDriversForRide } = require("../services/driverMatchingService");
const { previewPromo, redeemPromo } = require("../services/promoService");
const { debitWallet, creditWallet } = require("../services/walletService");

const validVehicleTypes = ["bike", "auto", "cab"];
const validPaymentMethods = ["cash", "online", "wallet"];

const isValidPoint = (point) => {
  if (!point || point.type !== "Point" || !Array.isArray(point.coordinates) || point.coordinates.length !== 2) {
    return false;
  }

  const [longitude, latitude] = point.coordinates;
  return Number.isFinite(longitude) && Number.isFinite(latitude) &&
    longitude >= -180 && longitude <= 180 && latitude >= -90 && latitude <= 90;
};

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
  promoCode: ride.promoCode,
  discountAmount: ride.discountAmount,
  rideStatus: ride.rideStatus,
  cancellationReason: ride.cancellationReason,
  createdAt: ride.createdAt,
  updatedAt: ride.updatedAt,
});

const createRide = async (req, res) => {
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const { pickupLocation, destinationLocation, distanceKm, estimatedDurationMinutes, vehicleType, paymentMethod, promoCode } = body;

  if (!isValidPoint(pickupLocation) || !isValidPoint(destinationLocation)) {
    return res.status(400).json({ success: false, message: "Pickup and destination must be valid map points" });
  }

  if (typeof distanceKm !== "number" || !Number.isFinite(distanceKm) || distanceKm <= 0 || distanceKm > 1000) {
    return res.status(400).json({ success: false, message: "distanceKm must be a number between 0 and 1000" });
  }

  if (typeof estimatedDurationMinutes !== "number" || !Number.isFinite(estimatedDurationMinutes) || estimatedDurationMinutes <= 0 || estimatedDurationMinutes > 1440) {
    return res.status(400).json({ success: false, message: "estimatedDurationMinutes must be a number between 0 and 1440" });
  }

  if (!validVehicleTypes.includes(vehicleType) || !validPaymentMethods.includes(paymentMethod)) {
    return res.status(400).json({ success: false, message: "Invalid vehicle type or payment method" });
  }

  const quote = calculateFare({ distanceKm, estimatedMinutes: estimatedDurationMinutes, vehicleType });

  let finalFare = quote.fare;
  let discountAmount = 0;
  let appliedPromo = null;

  if (promoCode) {
    const promoResult = await previewPromo(promoCode, req.user._id, quote.fare);
    if (!promoResult.valid) {
      return res.status(400).json({ success: false, message: promoResult.message });
    }
    discountAmount = promoResult.discount;
    finalFare = promoResult.finalFare;
    appliedPromo = promoResult.promo;
  }

  if (paymentMethod === "wallet") {
    try {
      await debitWallet(req.user._id, finalFare, "ride_payment");
    } catch (error) {
      return res.status(error.statusCode || 402).json({ success: false, message: error.message });
    }
  }

  const ride = await Ride.create({
    passenger: req.user._id,
    pickupLocation,
    destinationLocation,
    distanceKm: quote.distanceKm,
    estimatedDurationMinutes: quote.estimatedMinutes,
    fare: finalFare,
    currency: quote.currency,
    vehicleType,
    paymentMethod,
    promoCode: appliedPromo ? appliedPromo.code : null,
    discountAmount,
    paymentStatus: paymentMethod === "wallet" ? "paid" : "pending",
    rideStatus: "REQUESTED",
  });

  if (appliedPromo) {
    await redeemPromo(appliedPromo, req.user._id);
  }

  const matchedDrivers = await matchDriversForRide(ride);

  res.status(201).json({
    success: true,
    message: matchedDrivers.length ? "Ride created and drivers found" : "Ride created; searching for drivers",
    data: { ride: publicRide(ride), matchedDrivers },
  });
};

const matchRide = async (req, res) => {
  const ride = await Ride.findOne({ _id: req.params.rideId, passenger: req.user._id });
  if (!ride) return res.status(404).json({ success: false, message: "Ride not found" });

  if (!["REQUESTED", "SEARCHING_DRIVER"].includes(ride.rideStatus)) {
    return res.status(409).json({ success: false, message: "Ride is not available for driver matching" });
  }

  const matchedDrivers = await matchDriversForRide(ride);
  res.json({
    success: true,
    message: matchedDrivers.length ? "Nearby drivers found" : "No nearby drivers are currently available",
    data: { ride: publicRide(ride), matchedDrivers },
  });
};

const getMyRides = async (req, res) => {
  const rides = await Ride.find({ passenger: req.user._id }).sort({ createdAt: -1 });
  res.json({ success: true, message: "Rides retrieved successfully", data: { rides: rides.map(publicRide) } });
};

const getRideById = async (req, res) => {
  const ride = await Ride.findOne({ _id: req.params.rideId, passenger: req.user._id });
  if (!ride) return res.status(404).json({ success: false, message: "Ride not found" });
  res.json({ success: true, message: "Ride retrieved successfully", data: { ride: publicRide(ride) } });
};

const cancelRide = async (req, res) => {
  const ride = await Ride.findOne({ _id: req.params.rideId, passenger: req.user._id });
  if (!ride) return res.status(404).json({ success: false, message: "Ride not found" });

  transitionRide(ride, "CANCELLED");
  ride.cancellationReason = typeof req.body?.reason === "string" ? req.body.reason.trim().slice(0, 300) : "Cancelled by passenger";

  if (ride.paymentMethod === "wallet" && ride.paymentStatus === "paid") {
    await creditWallet(req.user._id, ride.fare, "ride_refund", ride._id);
    ride.paymentStatus = "refunded";
  }

  await ride.save();

  res.json({ success: true, message: "Ride cancelled successfully", data: { ride: publicRide(ride) } });
};

module.exports = { createRide, matchRide, getMyRides, getRideById, cancelRide };