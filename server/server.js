require("dotenv").config();

const express = require("express");
const connectDB = require("./config/db");

const app = express();

const PORT = process.env.PORT || 5000;

connectDB();

app.get("/", (req, res) => {
  res.send("RideX Backend is Running 🚀");
});

app.listen(PORT, () => {
  console.log(`RideX server running on port ${PORT}`);
});