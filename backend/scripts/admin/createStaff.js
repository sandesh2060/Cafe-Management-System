// backend/scripts/admin/createStaff.js
// Usage: node scripts/admin/createStaff.js
//
// Creates a staff user with username + password for testing the staff portal.
// Run once per staff member you want to seed.

import "dotenv/config";
import mongoose from "mongoose";
import User from "../../src/modules/user/user.model.js";

const CAFE_ID = process.env.DEFAULT_CAFE_ID || "6860cafe0000000000000001";

const STAFF_TO_CREATE = [
  {
    username: "waiter1",
    name: "Ram Waiter",
    role: "waiter",
    password: "waiter123",
  },
  {
    username: "kitchen1",
    name: "Shyam Kitchen",
    role: "kitchen",
    password: "kitchen123",
  },
  {
    username: "cashier1",
    name: "Sita Cashier",
    role: "cashier",
    password: "cashier123",
  },
  {
    username: "manager1",
    name: "Hari Manager",
    role: "manager",
    password: "manager123",
  },
];

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB\n");

  for (const s of STAFF_TO_CREATE) {
    const exists = await User.findOne({ username: s.username });
    if (exists) {
      console.log(`⚠  ${s.username} already exists — skipping`);
      continue;
    }
    await User.create({ ...s, cafeId: CAFE_ID, isActive: true });
    console.log(`✅ Created ${s.role}: ${s.username} / ${s.password}`);
  }

  await mongoose.disconnect();
  console.log("\nDone.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
