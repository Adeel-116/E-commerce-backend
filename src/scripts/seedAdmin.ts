import dotenv from "dotenv";
import connectDB from "../config/db";
import { User } from "../models/UserModel";

dotenv.config();

const seedAdmin = async () => {
  await connectDB();
  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD?.trim();
  const name = process.env.ADMIN_NAME?.trim() || "Admin";
  if (!email || !password) {
    console.error("ADMIN_EMAIL and ADMIN_PASSWORD must required");
    process.exit(1);
  }
  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`Admin already exists: ${email}`);
    process.exit(0);
  }
  await User.create({ name, email, password, role: "admin" });
  console.log(`Admin created successfully: ${email}`);
  process.exit(0);
};

seedAdmin().catch((err) => {
  console.error(err);
  process.exit(1);
});
