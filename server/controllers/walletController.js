const User = require("../models/User");
const WalletTransaction = require("../models/WalletTransaction");
const { creditWallet } = require("../services/walletService");

const publicTransaction = (transaction) => ({
  id: transaction._id,
  type: transaction.type,
  amount: transaction.amount,
  reason: transaction.reason,
  ride: transaction.ride,
  balanceAfter: transaction.balanceAfter,
  createdAt: transaction.createdAt,
});

const getWallet = async (req, res) => {
  const user = await User.findById(req.user._id).select("walletBalance");
  const transactions = await WalletTransaction.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(20);

  res.json({
    success: true,
    message: "Wallet retrieved successfully",
    data: {
      balance: user.walletBalance,
      transactions: transactions.map(publicTransaction),
    },
  });
};

// NOTE: there is no real payment gateway wired in for wallet top-ups yet
// (same limitation as online ride payments elsewhere in this app). This
// credits the wallet directly so the feature is testable end-to-end; swap
// this for a Razorpay/Stripe order-confirm flow before accepting real money.
const topUpWallet = async (req, res) => {
  const amount = Number(req.body?.amount);

  if (!Number.isFinite(amount) || amount <= 0 || amount > 50000) {
    return res.status(400).json({ success: false, message: "Enter an amount between 1 and 50000" });
  }

  const balance = await creditWallet(req.user._id, amount, "topup");

  res.json({
    success: true,
    message: `Rs ${amount} added to your wallet`,
    data: { balance },
  });
};

module.exports = { getWallet, topUpWallet };
