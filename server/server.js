require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const driverRoutes = require("./routes/driverRoutes");
const fareRoutes = require("./routes/fareRoutes");
const rideRoutes = require("./routes/rideRoutes");
const driverRideRoutes = require("./routes/driverRideRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const ratingRoutes = require("./routes/ratingRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const errorMiddleware = require("./middleware/errorMiddleware");
const registerSocketServer = require("./socket/socketServer");
const { setSocketServer } = require("./socket/socketEmitter");

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
  },
});

const PORT = process.env.PORT || 5000;

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET must be configured");
}

connectDB();

app.use(express.json());

app.get("/", (req, res) => {
  res.send("RideX Backend is Running 🚀");
});

app.use("/api/auth", authRoutes);
app.use("/api/drivers", driverRoutes);
app.use("/api/fares", fareRoutes);
app.use("/api/rides", rideRoutes);
app.use("/api/driver-rides", driverRideRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/ratings", ratingRoutes);
app.use("/api/notifications", notificationRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

app.use(errorMiddleware);

registerSocketServer(io);
setSocketServer(io);

httpServer.listen(PORT, () => {
  console.log(`RideX server running on port ${PORT}`);
});