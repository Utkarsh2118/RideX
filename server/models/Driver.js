const mongoose = require("mongoose");

const locationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
    },
    coordinates: {
      type: [Number],
      validate: {
        validator: (coordinates) => {
          if (!Array.isArray(coordinates) || coordinates.length !== 2) {
            return false;
          }

          const [longitude, latitude] = coordinates;
          return longitude >= -180 && longitude <= 180 && latitude >= -90 && latitude <= 90;
        },
        message: "Location must contain valid longitude and latitude coordinates",
      },
    },
  },
  { _id: false }
);

const driverSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    licenseNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    vehicleType: {
      type: String,
      enum: ["bike", "auto", "cab"],
      required: true,
    },
    vehicleNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    vehicleModel: {
      type: String,
      required: true,
      trim: true,
    },
    vehicleColor: {
      type: String,
      required: true,
      trim: true,
    },
    documentImages: {
      type: [String],
      default: [],
    },
    verificationStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 300,
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    totalRides: {
      type: Number,
      min: 0,
      default: 0,
    },
    totalEarnings: {
      type: Number,
      min: 0,
      default: 0,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    currentLocation: {
      type: locationSchema,
      default: undefined,
    },
  },
  { timestamps: true }
);

driverSchema.index({ currentLocation: "2dsphere" });

driverSchema.pre("save", function resetAvailability(next) {
  if (this.isModified("verificationStatus") && this.verificationStatus !== "approved") {
    this.isOnline = false;
  }

  next();
});

module.exports = mongoose.model("Driver", driverSchema);
