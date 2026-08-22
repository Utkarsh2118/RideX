const pricingByVehicle = {
  bike: {
    baseFare: 30,
    perKmRate: 9,
    perMinuteRate: 1,
    minimumFare: 40,
  },
  auto: {
    baseFare: 45,
    perKmRate: 13,
    perMinuteRate: 1.5,
    minimumFare: 60,
  },
  cab: {
    baseFare: 80,
    perKmRate: 18,
    perMinuteRate: 2,
    minimumFare: 110,
  },
};

const calculateFare = ({ distanceKm, estimatedMinutes, vehicleType }) => {
  const pricing = pricingByVehicle[vehicleType];

  if (!pricing) {
    throw new Error("Unsupported vehicle type");
  }

  const distanceFare = distanceKm * pricing.perKmRate;
  const timeFare = estimatedMinutes * pricing.perMinuteRate;
  const calculatedFare = pricing.baseFare + distanceFare + timeFare;
  const fare = Math.max(pricing.minimumFare, calculatedFare);

  return {
    vehicleType,
    currency: "INR",
    distanceKm: Number(distanceKm.toFixed(2)),
    estimatedMinutes: Number(estimatedMinutes.toFixed(0)),
    breakdown: {
      baseFare: pricing.baseFare,
      distanceFare: Number(distanceFare.toFixed(2)),
      timeFare: Number(timeFare.toFixed(2)),
    },
    fare: Number(fare.toFixed(2)),
  };
};

module.exports = {
  calculateFare,
  pricingByVehicle,
};
