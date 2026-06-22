const express  = require("express");
const mongoose = require("mongoose");
const auth     = require("../middleware/auth");
const router   = express.Router();

const OrderSchema = new mongoose.Schema(
  {
    user:          { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    items: [
      {
        product:  { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
        name:     String,
        price:    Number,
        quantity: { type: Number, default: 1, min: 1 },
      },
    ],
    total:         { type: Number, required: true },
    status:        { type: String, enum: ["pending","confirmed","shipped","delivered","cancelled"], default: "pending" },
    shippingAddr:  {
      street: String, city: String, state: String, zip: String, country: String,
    },
    paymentRef:    String,
  },
  { timestamps: true }
);
const Order = mongoose.model("Order", OrderSchema);

router.get("/", auth, async (req, res) => {
  const orders = await Order.find({ user: req.user.id }).sort("-createdAt").lean();
  res.json(orders);
});

router.post("/", auth, async (req, res) => {
  const { items, shippingAddr, paymentRef } = req.body;
  if (!Array.isArray(items) || !items.length)
    return res.status(400).json({ error: "items array required" });
  const total = items.reduce((sum, i) => sum + (i.price || 0) * (i.quantity || 1), 0);
  const order = await Order.create({ user: req.user.id, items, total, shippingAddr, paymentRef });
  res.status(201).json(order);
});

router.patch("/:id/status", auth, async (req, res) => {
  const { status } = req.body;
  const validStatuses = ["pending","confirmed","shipped","delivered","cancelled"];
  if (!validStatuses.includes(status)) return res.status(400).json({ error: "Invalid status" });
  const order = await Order.findOneAndUpdate({ _id: req.params.id, user: req.user.id }, { status }, { new: true });
  if (!order) return res.status(404).json({ error: "Order not found" });
  res.json(order);
});

module.exports = router;