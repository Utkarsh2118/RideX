const Driver = require("../models/Driver");
const User = require("../models/User");

const publicDriver = (driver) => ({
  id: driver._id,
  user: driver.user,
  licenseNumber: driver.licenseNumber,
  vehicleType: driver.vehicleType,
  vehicleNumber: driver.vehicleNumber,
  vehicleModel: driver.vehicleModel,
  vehicleColor: driver.vehicleColor,
  documentImages: driver.documentImages,
  verificationStatus: driver.verificationStatus,
  rejectionReason: driver.rejectionReason,
  rating: driver.rating,
  totalRides: driver.totalRides,
  totalEarnings: driver.totalEarnings,
  isOnline: driver.isOnline,
  currentLocation: driver.currentLocation,
});

const validateOnboarding = (body) => {
  const requiredFields = [
    "licenseNumber",
    "vehicleType",
    "vehicleNumber",
    "vehicleModel",
    "vehicleColor",
  ];

  if (requiredFields.some((field) => typeof body[field] !== "string" || !body[field].trim())) {
    return "License and vehicle details are required";
  }

  if (!["bike", "auto", "cab"].includes(body.vehicleType)) {
    return "Vehicle type must be bike, auto, or cab";
  }

  if (body.documentImages !== undefined) {
    if (!Array.isArray(body.documentImages) || body.documentImages.length > 5) {
      return "Document images must be an array containing at most 5 items";
    }

    if (body.documentImages.some((image) => typeof image !== "string" || !image.trim())) {
      return "Document images must contain valid URLs or paths";
    }
  }

  return null;
};

const submitOnboarding = async (req, res) => {
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const validationError = validateOnboarding(body);

  if (validationError) {
    return res.status(400).json({ success: false, message: validationError });
  }

  const existingDriver = await Driver.findOne({ user: req.user._id });
  if (existingDriver && existingDriver.verificationStatus === "approved") {
    return res.status(409).json({
      success: false,
      message: "Your driver profile is already approved",
    });
  }

  const driver = await Driver.findOneAndUpdate(
    { user: req.user._id },
    {
      user: req.user._id,
      licenseNumber: body.licenseNumber.trim(),
      vehicleType: body.vehicleType,
      vehicleNumber: body.vehicleNumber.trim(),
      vehicleModel: body.vehicleModel.trim(),
      vehicleColor: body.vehicleColor.trim(),
      documentImages: body.documentImages || [],
      verificationStatus: "pending",
      rejectionReason: undefined,
      isOnline: false,
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );

  res.status(existingDriver ? 200 : 201).json({
    success: true,
    message: existingDriver
      ? "Driver onboarding resubmitted for verification"
      : "Driver onboarding submitted for verification",
    data: { driver: publicDriver(driver) },
  });
};

const getMyDriverProfile = async (req, res) => {
  const driver = await Driver.findOne({ user: req.user._id });

  if (!driver) {
    return res.status(404).json({ success: false, message: "Driver profile not found" });
  }

  res.json({ success: true, message: "Driver profile retrieved successfully", data: { driver: publicDriver(driver) } });
};

const setOnlineStatus = async (req, res) => {
  const { isOnline } = req.body && typeof req.body === "object" ? req.body : {};

  if (typeof isOnline !== "boolean") {
    return res.status(400).json({ success: false, message: "isOnline must be a boolean" });
  }

  const driver = await Driver.findOne({ user: req.user._id });
  if (!driver || driver.verificationStatus !== "approved") {
    return res.status(403).json({ success: false, message: "Only approved drivers can change online status" });
  }

  driver.isOnline = isOnline;
  await driver.save();

  res.json({ success: true, message: `Driver is now ${isOnline ? "online" : "offline"}`, data: { driver: publicDriver(driver) } });
};

const listDrivers = async (req, res) => {
  const filter = {};
  if (req.query.status) {
    if (!["pending", "approved", "rejected"].includes(req.query.status)) {
      return res.status(400).json({ success: false, message: "Invalid verification status" });
    }
    filter.verificationStatus = req.query.status;
  }

  const drivers = await Driver.find(filter).sort({ createdAt: -1 });
  res.json({ success: true, message: "Drivers retrieved successfully", data: { drivers: drivers.map(publicDriver) } });
};

const reviewDriver = async (req, res) => {
  const { status, rejectionReason } = req.body && typeof req.body === "object" ? req.body : {};

  if (!["approved", "rejected"].includes(status)) {
    return res.status(400).json({ success: false, message: "Status must be approved or rejected" });
  }

  if (status === "rejected" && (typeof rejectionReason !== "string" || !rejectionReason.trim())) {
    return res.status(400).json({ success: false, message: "A rejection reason is required" });
  }

  const driver = await Driver.findById(req.params.driverId);
  if (!driver) {
    return res.status(404).json({ success: false, message: "Driver profile not found" });
  }

  driver.verificationStatus = status;
  driver.rejectionReason = status === "rejected" ? rejectionReason.trim() : undefined;
  driver.isOnline = false;
  await driver.save();

  await User.findByIdAndUpdate(driver.user, { role: status === "approved" ? "driver" : "passenger" });

  res.json({ success: true, message: `Driver ${status} successfully`, data: { driver: publicDriver(driver) } });
};

module.exports = {
  submitOnboarding,
  getMyDriverProfile,
  setOnlineStatus,
  listDrivers,
  reviewDriver,
};
