/**
 * Seed / reset the 3 test accounts (rider, driver, admin) used for QA.
 *
 * Run it from the server/ folder, against the SAME MONGO_URI your
 * deployed backend uses:
 *
 *   node scripts/seedTestAccounts.js
 *
 * You can override the emails, password, and phone numbers with env
 * vars (handy for re-running with different test inboxes) or just
 * edit the DEFAULTS below directly.
 *
 *   TEST_PASSWORD=Test@1234 \
 *   RIDER_EMAIL=rider@test.com \
 *   DRIVER_EMAIL=driver@test.com \
 *   ADMIN_EMAIL=admin@test.com \
 *   node scripts/seedTestAccounts.js
 *
 * The script is idempotent (safe to run again): it upserts each
 * account and resets its password every time you run it, which also
 * doubles as your "reset the test password" command later.
 */

require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const connectDB = require("../config/db");
const User = require("../models/User");
const Driver = require("../models/Driver");

const DEFAULTS = {
  password: "Test@1234",
  rider: { name: "Test Rider", email: "user@gmail.com", phone: "+911111111111" },
  driver: { name: "Test Driver", email: "driver@gmail.com", phone: "+912222222222" },
  admin: { name: "Test Admin", email: "srivastava.utkarsh2118@gmail.com", phone: "+913333333333" },
};

const password = process.env.TEST_PASSWORD || DEFAULTS.password;

const accounts = [
  {
    role: "passenger",
    name: process.env.RIDER_NAME || DEFAULTS.rider.name,
    email: (process.env.RIDER_EMAIL || DEFAULTS.rider.email).toLowerCase(),
    phone: process.env.RIDER_PHONE || DEFAULTS.rider.phone,
  },
  {
    role: "driver",
    name: process.env.DRIVER_NAME || DEFAULTS.driver.name,
    email: (process.env.DRIVER_EMAIL || DEFAULTS.driver.email).toLowerCase(),
    phone: process.env.DRIVER_PHONE || DEFAULTS.driver.phone,
  },
  {
    role: "admin",
    name: process.env.ADMIN_NAME || DEFAULTS.admin.name,
    email: (process.env.ADMIN_EMAIL || DEFAULTS.admin.email).toLowerCase(),
    phone: process.env.ADMIN_PHONE || DEFAULTS.admin.phone,
  },
];

async function upsertUser({ role, name, email, phone }) {
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.findOneAndUpdate(
    { email },
    { name, email, phone, password: hashedPassword, role },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log(`✔ ${role.padEnd(9)} ${email}`);
  return user;
}

async function ensureDriverProfile(user) {
  await Driver.findOneAndUpdate(
    { user: user._id },
    {
      user: user._id,
      licenseNumber: "TEST-DL-0001",
      vehicleType: "cab",
      vehicleNumber: "PB65TEST01",
      vehicleModel: "Test Sedan",
      vehicleColor: "White",
      verificationStatus: "approved",
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  console.log("  └ driver profile approved & ready to go online");
}

(async () => {
  try {
    await connectDB();

    for (const account of accounts) {
      const user = await upsertUser(account);
      if (account.role === "driver") {
        await ensureDriverProfile(user);
      }
    }

    console.log("\nAll set. Shared test password:", password);
    console.log("Sign in at /login/user, /login/driver, /login/admin with the emails above.");
  } catch (error) {
    console.error("Seeding failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
})();