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

const emitUserNotification = (notification) => {
  if (!io) return;

  io.to(`user:${notification.recipient}`).emit("notification:new", {
    id: notification._id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    ride: notification.ride,
    createdAt: notification.createdAt,
  });
};

module.exports = { setSocketServer, emitRideStatus, emitUserNotification };
