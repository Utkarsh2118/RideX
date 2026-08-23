const express = require("express");

const { createPayment, confirmCashPayment, getPaymentHistory } = require("../controllers/paymentController");
const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(protect);
router.get("/history", authorizeRoles("passenger"), getPaymentHistory);
router.post("/:rideId/create", authorizeRoles("passenger"), createPayment);
router.post("/:rideId/confirm-cash", authorizeRoles("driver"), confirmCashPayment);

module.exports = router;
