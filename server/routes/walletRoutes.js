const express = require("express");

const { getWallet, topUpWallet } = require("../controllers/walletController");
const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(protect);
router.get("/", authorizeRoles("passenger"), getWallet);
router.post("/topup", authorizeRoles("passenger"), topUpWallet);

module.exports = router;
