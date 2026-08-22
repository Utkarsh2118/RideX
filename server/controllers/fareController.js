const { calculateFare } = require("../services/fareService");

const quoteFare = (req, res) => {
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const { distanceKm, estimatedMinutes, vehicleType } = body;

  if (
    typeof distanceKm !== "number" ||
    !Number.isFinite(distanceKm) ||
    distanceKm <= 0 ||
    distanceKm > 1000
  ) {
    return res.status(400).json({
      success: false,
      message: "distanceKm must be a number between 0 and 1000",
    });
  }

  if (
    typeof estimatedMinutes !== "number" ||
    !Number.isFinite(estimatedMinutes) ||
    estimatedMinutes <= 0 ||
    estimatedMinutes > 24 * 60
  ) {
    return res.status(400).json({
      success: false,
      message: "estimatedMinutes must be a number between 0 and 1440",
    });
  }

  if (!["bike", "auto", "cab"].includes(vehicleType)) {
    return res.status(400).json({
      success: false,
      message: "vehicleType must be bike, auto, or cab",
    });
  }

  const quote = calculateFare({ distanceKm, estimatedMinutes, vehicleType });

  res.status(200).json({
    success: true,
    message: "Fare calculated successfully",
    data: { quote },
  });
};

module.exports = { quoteFare };
