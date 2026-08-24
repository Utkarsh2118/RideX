const PromoCode = require("../models/PromoCode");

const computeDiscount = (promo, fare) => {
  let discount = promo.discountType === "flat"
    ? promo.discountValue
    : (fare * promo.discountValue) / 100;

  if (promo.maxDiscount != null) {
    discount = Math.min(discount, promo.maxDiscount);
  }

  discount = Math.min(discount, fare);
  return Math.round(discount * 100) / 100;
};

// Validates a promo code for a given user/fare WITHOUT marking it used.
// Use this for the "Apply" preview button on the booking screen.
const previewPromo = async (code, userId, fare) => {
  if (!code || typeof code !== "string") {
    return { valid: false, message: "Enter a promo code" };
  }

  const promo = await PromoCode.findOne({ code: code.trim().toUpperCase() });

  if (!promo || !promo.isActive) {
    return { valid: false, message: "Invalid promo code" };
  }
  if (promo.expiresAt && promo.expiresAt < new Date()) {
    return { valid: false, message: "This promo code has expired" };
  }
  if (promo.usageLimit != null && promo.usedCount >= promo.usageLimit) {
    return { valid: false, message: "This promo code has been fully redeemed" };
  }
  if (promo.usedBy.some((usedUserId) => usedUserId.equals(userId))) {
    return { valid: false, message: "You have already used this promo code" };
  }
  if (fare < promo.minFare) {
    return { valid: false, message: `Minimum fare of Rs ${promo.minFare} required for this code` };
  }

  const discount = computeDiscount(promo, fare);
  return {
    valid: true,
    promo,
    discount,
    finalFare: Math.max(0, Math.round((fare - discount) * 100) / 100),
    message: `Rs ${discount} off applied`,
  };
};

// Re-validates and marks the promo as used. Called at ride-creation time,
// right after previewPromo, so both must be called inside the same request.
const redeemPromo = async (promo, userId) => {
  await PromoCode.updateOne(
    { _id: promo._id },
    { $inc: { usedCount: 1 }, $addToSet: { usedBy: userId } }
  );
};

module.exports = { previewPromo, redeemPromo };
