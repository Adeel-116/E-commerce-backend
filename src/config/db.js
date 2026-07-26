const mongoose = require("mongoose");
const dns = require("dns");

dns.setServers(["4.4.4.4", "8.8.8.8"]);

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) return;
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    throw error;
  }
};

module.exports = connectDB;
