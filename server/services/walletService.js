const User = require("../models/User");
const WalletTransaction = require("../models/WalletTransaction");

const creditWallet = async (userId, amount, reason, rideId = null) => {
  const roundedAmount = Math.round(amount * 100) / 100;
  if (roundedAmount <= 0) {
    const error = new Error("Credit amount must be greater than zero");
    error.statusCode = 400;
    throw error;
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { $inc: { walletBalance: roundedAmount } },
    { new: true }
  );

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  await WalletTransaction.create({
    user: userId,
    type: "credit",
    amount: roundedAmount,
    reason,
    ride: rideId,
    balanceAfter: user.walletBalance,
  });

  return user.walletBalance;
};

const debitWallet = async (userId, amount, reason, rideId = null) => {
  const roundedAmount = Math.round(amount * 100) / 100;
  if (roundedAmount <= 0) {
    const error = new Error("Debit amount must be greater than zero");
    error.statusCode = 400;
    throw error;
  }

  const user = await User.findOneAndUpdate(
    { _id: userId, walletBalance: { $gte: roundedAmount } },
    { $inc: { walletBalance: -roundedAmount } },
    { new: true }
  );

  if (!user) {
    const error = new Error("Insufficient wallet balance");
    error.statusCode = 402;
    throw error;
  }

  await WalletTransaction.create({
    user: userId,
    type: "debit",
    amount: roundedAmount,
    reason,
    ride: rideId,
    balanceAfter: user.walletBalance,
  });

  return user.walletBalance;
};

module.exports = { creditWallet, debitWallet };
