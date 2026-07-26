const mongoose = require("mongoose");
// const dns = require("dns");

// dns.setServers(["4.4.4.4", "8.8.8.8"]);

// Serverless functions can run many concurrent invocations of this module in
// the same warm container. Without this cache, every invocation that arrives
// before the first connect() resolves starts its own separate connection —
// caching the in-flight promise on `global` ensures they all await the same
// connection instead of each paying the full Atlas handshake cost.
let cached = global._mongooseConn;
if (!cached) {
  cached = global._mongooseConn = { conn: null, promise: null };
}

const connectDB = async () => {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(process.env.MONGO_URI, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 10000,
      })
      .then((conn) => {
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        return conn;
      })
      .catch((error) => {
        cached.promise = null;
        console.error(`Error: ${error.message}`);
        throw error;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
};

module.exports = connectDB;
