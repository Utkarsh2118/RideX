const mongoose = require("mongoose");

const pointSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["Point"],
      required: true,
      default: "Point",
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: (coordinates) => {
          if (!Array.isArray(coordinates) || coordinates.length !== 2) return false;
          const [longitude, latitude] = coordinates;
          return longitude >= -180 && longitude <= 180 && latitude >= -90 && latitude <= 90;
        },
        message: "Location must contain valid longitude and latitude coordinates",
      },
    },
  },
  { _id: false }
);

const rideSchema = new mongoose.Schema(
  {
    passenger: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    rejectedDrivers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }],
    pickupLocation: {
      type: pointSchema,
      required: true,
    },
    destinationLocation: {
      type: pointSchema,
      required: true,
    },
    distanceKm: {
      type: Number,
      required: true,
      min: 0,
    },
    estimatedDurationMinutes: {
      type: Number,
      required: true,
      min: 0,
    },
    fare: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "INR",
    },
    vehicleType: {
      type: String,
      enum: ["bike", "auto", "cab"],
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "online", "wallet"],
      required: true,
    },
    promoCode: {
      type: String,
      uppercase: true,
      trim: true,
      default: null,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    rideStatus: {
      type: String,
      enum: [
        "REQUESTED",
        "SEARCHING_DRIVER",
        "DRIVER_ASSIGNED",
        "DRIVER_ARRIVING",
        "DRIVER_ARRIVED",
        "RIDE_STARTED",
        "RIDE_COMPLETED",
        "CANCELLED",
      ],
      default: "REQUESTED",
      index: true,
    },
    cancellationReason: {
      type: String,
      trim: true,
      maxlength: 300,
    },
  },
  { timestamps: true }
);

rideSchema.index({ pickupLocation: "2dsphere" });
rideSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Ride", rideSchema);