require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const driverRoutes = require("./routes/driverRoutes");
const fareRoutes = require("./routes/fareRoutes");
const rideRoutes = require("./routes/rideRoutes");
const driverRideRoutes = require("./routes/driverRideRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const ratingRoutes = require("./routes/ratingRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const adminRoutes = require("./routes/adminRoutes");
const errorMiddleware = require("./middleware/errorMiddleware");
const registerSocketServer = require("./socket/socketServer");
const { setSocketServer } = require("./socket/socketEmitter");

const app = express();
const httpServer = http.createServer(app);
const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
const io = new Server(httpServer, {
  cors: {
    origin: clientUrl,
  },
});

const PORT = process.env.PORT || 5000;

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET must be configured");
}

connectDB();

app.use(helmet());
app.use(cors({ origin: clientUrl }));
app.use(express.json({ limit: "100kb" }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { success: false, message: "Too many authentication attempts" },
});

app.use("/api/auth", authLimiter);

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
app.use("/api/admin", adminRoutes);

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