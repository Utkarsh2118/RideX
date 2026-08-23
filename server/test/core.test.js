const test = require("node:test");
const assert = require("node:assert/strict");
const { calculateFare } = require("../services/fareService");
const { canTransition, transitionRide } = require("../services/rideService");

test("calculates different fares for each vehicle type", () => {
  const bikeFare = calculateFare({ distanceKm: 10, estimatedMinutes: 25, vehicleType: "bike" });
  const cabFare = calculateFare({ distanceKm: 10, estimatedMinutes: 25, vehicleType: "cab" });

  assert.equal(bikeFare.fare, 145);
  assert.equal(cabFare.fare, 310);
  assert.equal(bikeFare.currency, "INR");
});

test("enforces valid ride lifecycle transitions", () => {
  assert.equal(canTransition("REQUESTED", "SEARCHING_DRIVER"), true);
  assert.equal(canTransition("RIDE_COMPLETED", "CANCELLED"), false);

  const ride = { rideStatus: "DRIVER_ARRIVED" };
  transitionRide(ride, "RIDE_STARTED");
  assert.equal(ride.rideStatus, "RIDE_STARTED");
  assert.throws(() => transitionRide(ride, "DRIVER_ARRIVING"), /Cannot move ride/);
});
