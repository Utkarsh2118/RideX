const Payment = require("../models/Payment");
const Ride = require("../models/Ride");

const publicPayment = (payment) => ({
  id: payment._id,
  ride: payment.ride,
  passenger: payment.passenger,
  amount: payment.amount,
  currency: payment.currency,
  method: payment.method,
  status: payment.status,
  transactionId: payment.transactionId,
  createdAt: payment.createdAt,
  updatedAt: payment.updatedAt,
});

const createPayment = async (req, res) => {
  const ride = await Ride.findOne({ _id: req.params.rideId, passenger: req.user._id });
  if (!ride) return res.status(404).json({ success: false, message: "Ride not found" });
  if (ride.rideStatus !== "RIDE_COMPLETED") return res.status(409).json({ success: false, message: "Payment is available after ride completion" });
  if (ride.paymentMethod !== "online") return res.status(400).json({ success: false, message: "This ride uses cash payment" });
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return res.status(503).json({ success: false, message: "Online payments are not configured" });
  }

  return res.status(501).json({ success: false, message: "Online payment provider integration is pending" });
};

const confirmCashPayment = async (req, res) => {
  const ride = await Ride.findOne({ _id: req.params.rideId, driver: req.user._id });
  if (!ride) return res.status(404).json({ success: false, message: "Assigned ride not found" });
  if (ride.rideStatus !== "RIDE_COMPLETED") return res.status(409).json({ success: false, message: "Cash can be confirmed after ride completion" });
  if (ride.paymentMethod !== "cash") return res.status(400).json({ success: false, message: "This ride uses online payment" });
  if (ride.paymentStatus === "paid") return res.status(409).json({ success: false, message: "Payment is already confirmed" });

  const payment = await Payment.findOneAndUpdate(
    { ride: ride._id },
    { ride: ride._id, passenger: ride.passenger, amount: ride.fare, currency: ride.currency, method: "cash", status: "paid" },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );
  ride.paymentStatus = "paid";
  await ride.save();

  res.json({ success: true, message: "Cash payment confirmed", data: { payment: publicPayment(payment) } });
};

const getPaymentHistory = async (req, res) => {
  const payments = await Payment.find({ passenger: req.user._id }).sort({ createdAt: -1 });
  res.json({ success: true, message: "Payment history retrieved successfully", data: { payments: payments.map(publicPayment) } });
};

module.exports = { createPayment, confirmCashPayment, getPaymentHistory };
