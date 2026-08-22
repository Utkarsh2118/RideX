const Driver = require("../models/Driver");
const { transitionRide } = require("./rideService");

const MAX_MATCH_DISTANCE_METERS = 10000;
const MAX_MATCH_RESULTS = 10;

const publicMatch = (driver) => ({
  id: driver._id,
  user: driver.user,
  vehicleType: driver.vehicleType,
  vehicleModel: driver.vehicleModel,
  vehicleColor: driver.vehicleColor,
  rating: driver.rating,
  totalRides: driver.totalRides,
  distanceMeters: driver.distanceMeters,
});

const findNearbyDrivers = async (pickupLocation, vehicleType) => {
  const drivers = await Driver.aggregate([
    {
      $geoNear: {
        near: pickupLocation,
        distanceField: "distanceMeters",
        maxDistance: MAX_MATCH_DISTANCE_METERS,
        spherical: true,
        query: {
          verificationStatus: "approved",
          isOnline: true,
          vehicleType,
        },
      },
    },
    { $limit: MAX_MATCH_RESULTS },
  ]);

  return drivers.map(publicMatch);
};

const matchDriversForRide = async (ride) => {
  const drivers = await findNearbyDrivers(ride.pickupLocation, ride.vehicleType);

  if (ride.rideStatus === "REQUESTED") {
    transitionRide(ride, "SEARCHING_DRIVER");
    await ride.save();
  }

  return drivers;
};

module.exports = {
  findNearbyDrivers,
  matchDriversForRide,
  MAX_MATCH_DISTANCE_METERS,
};
