const express = require("express");

const {
  validatePromoCode,
  createPromoCode,
  listPromoCodes,
  setPromoActive,
} = require("../controllers/promoController");
const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(protect);
router.post("/validate", authorizeRoles("passenger"), validatePromoCode);
router.get("/", authorizeRoles("admin"), listPromoCodes);
router.post("/", authorizeRoles("admin"), createPromoCode);
router.patch("/:promoId", authorizeRoles("admin"), setPromoActive);

module.exports = router;
