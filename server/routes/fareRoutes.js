const express = require("express");

const { quoteFare } = require("../controllers/fareController");

const router = express.Router();

router.post("/quote", quoteFare);

module.exports = router;
