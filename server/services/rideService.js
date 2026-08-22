const rideTransitions = {
  REQUESTED: ["SEARCHING_DRIVER", "CANCELLED"],
  SEARCHING_DRIVER: ["DRIVER_ASSIGNED", "CANCELLED"],
  DRIVER_ASSIGNED: ["DRIVER_ARRIVING", "CANCELLED"],
  DRIVER_ARRIVING: ["DRIVER_ARRIVED", "CANCELLED"],
  DRIVER_ARRIVED: ["RIDE_STARTED", "CANCELLED"],
  RIDE_STARTED: ["RIDE_COMPLETED"],
  RIDE_COMPLETED: [],
  CANCELLED: [],
};

const canTransition = (currentStatus, nextStatus) =>
  rideTransitions[currentStatus]?.includes(nextStatus) || false;

const transitionRide = (ride, nextStatus) => {
  if (!canTransition(ride.rideStatus, nextStatus)) {
    const error = new Error(`Cannot move ride from ${ride.rideStatus} to ${nextStatus}`);
    error.statusCode = 409;
    throw error;
  }

  ride.rideStatus = nextStatus;
  return ride;
};

module.exports = {
  canTransition,
  transitionRide,
  rideTransitions,
};
