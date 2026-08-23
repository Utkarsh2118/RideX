let io;

const setSocketServer = (socketServer) => {
  io = socketServer;
};

const emitRideStatus = (ride) => {
  if (!io) return;

  io.to(`ride:${ride._id}`).emit("ride:status", {
    rideId: ride._id,
    rideStatus: ride.rideStatus,
    driverId: ride.driver,
    updatedAt: new Date().toISOString(),
  });
};

module.exports = { setSocketServer, emitRideStatus };
