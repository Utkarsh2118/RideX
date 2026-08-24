const PromoCode = require("../models/PromoCode");
const { previewPromo } = require("../services/promoService");

const publicPromo = (promo) => ({
  id: promo._id,
  code: promo.code,
  description: promo.description,
  discountType: promo.discountType,
  discountValue: promo.discountValue,
  maxDiscount: promo.maxDiscount,
  minFare: promo.minFare,
  usageLimit: promo.usageLimit,
  usedCount: promo.usedCount,
  expiresAt: promo.expiresAt,
  isActive: promo.isActive,
  createdAt: promo.createdAt,
});

const validatePromoCode = async (req, res) => {
  const { code, fare } = req.body && typeof req.body === "object" ? req.body : {};
  const parsedFare = Number(fare);

  if (!Number.isFinite(parsedFare) || parsedFare <= 0) {
    return res.status(400).json({ success: false, message: "A valid fare is required to check a promo code" });
  }

  const result = await previewPromo(code, req.user._id, parsedFare);

  if (!result.valid) {
    return res.status(400).json({ success: false, message: result.message });
  }

  res.json({
    success: true,
    message: result.message,
    data: { discount: result.discount, finalFare: result.finalFare },
  });
};

const createPromoCode = async (req, res) => {
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const { code, description, discountType, discountValue, maxDiscount, minFare, usageLimit, expiresAt } = body;

  if (!code || typeof code !== "string") {
    return res.status(400).json({ success: false, message: "A promo code is required" });
  }
  if (!["flat", "percent"].includes(discountType)) {
    return res.status(400).json({ success: false, message: "discountType must be flat or percent" });
  }
  if (typeof discountValue !== "number" || discountValue <= 0) {
    return res.status(400).json({ success: false, message: "discountValue must be a positive number" });
  }

  try {
    const promo = await PromoCode.create({
      code: code.trim().toUpperCase(),
      description,
      discountType,
      discountValue,
      maxDiscount: maxDiscount ?? null,
      minFare: minFare ?? 0,
      usageLimit: usageLimit ?? null,
      expiresAt: expiresAt ?? null,
    });

    res.status(201).json({ success: true, message: "Promo code created", data: { promo: publicPromo(promo) } });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "This promo code already exists" });
    }
    throw error;
  }
};

const listPromoCodes = async (req, res) => {
  const promos = await PromoCode.find().sort({ createdAt: -1 });
  res.json({ success: true, message: "Promo codes retrieved successfully", data: { promos: promos.map(publicPromo) } });
};

const setPromoActive = async (req, res) => {
  const promo = await PromoCode.findByIdAndUpdate(
    req.params.promoId,
    { isActive: Boolean(req.body?.isActive) },
    { new: true }
  );
  if (!promo) return res.status(404).json({ success: false, message: "Promo code not found" });
  res.json({ success: true, message: "Promo code updated", data: { promo: publicPromo(promo) } });
};

module.exports = { validatePromoCode, createPromoCode, listPromoCodes, setPromoActive };
