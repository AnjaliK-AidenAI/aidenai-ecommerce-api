require("express-async-errors");
const express = require("express");
const mongoose = require("mongoose");
const cors    = require("cors");
const helmet  = require("helmet");
const morgan  = require("morgan");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const authRoutes    = require("./routes/auth");
const productRoutes = require("./routes/products");
const orderRoutes   = require("./routes/orders");

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json({ limit: "10mb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use("/api/", rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true }));

mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/ecommerce")
  .then(() => console.log("[DB] MongoDB connected"))
  .catch(err => { console.warn("[DB] connection failed — running in degraded mode:", err.message); });

app.use("/api/auth",     authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders",   orderRoutes);

app.get("/health", (_req, res) =>
  res.json({ status: "healthy", db: mongoose.connection.readyState === 1 ? "up" : "down", ts: new Date().toISOString() })
);

app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: err.message || "Internal server error" });
});

if (require.main === module) app.listen(PORT, () => console.log(`E-Commerce API listening on :${PORT}`));
module.exports = app;