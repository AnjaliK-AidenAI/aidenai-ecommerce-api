const express  = require("express");
const mongoose = require("mongoose");
const auth     = require("../middleware/auth");
const Joi      = require("joi");
const router   = express.Router();

const ProductSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, maxlength: 2000 },
    price:       { type: Number, required: true, min: 0 },
    category:    { type: String, required: true, index: true },
    stock:       { type: Number, default: 0, min: 0 },
    images:      [String],
    tags:        [String],
    active:      { type: Boolean, default: true },
    createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);
ProductSchema.index({ name: "text", description: "text" });
const Product = mongoose.model("Product", ProductSchema);

const bodySchema = Joi.object({
  name:        Joi.string().min(2).max(100).required(),
  description: Joi.string().max(2000),
  price:       Joi.number().positive().required(),
  category:    Joi.string().required(),
  stock:       Joi.number().integer().min(0).default(0),
  images:      Joi.array().items(Joi.string().uri()),
  tags:        Joi.array().items(Joi.string()),
  active:      Joi.boolean(),
});

router.get("/", async (req, res) => {
  const { page = 1, limit = 20, category, q, minPrice, maxPrice, sort = "-createdAt" } = req.query;
  const filter = { active: true };
  if (category) filter.category = category;
  if (q) filter.$text = { $search: q };
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = +minPrice;
    if (maxPrice) filter.price.$lte = +maxPrice;
  }
  const [items, total] = await Promise.all([
    Product.find(filter).sort(sort).skip((+page - 1) * +limit).limit(+limit).lean(),
    Product.countDocuments(filter),
  ]);
  res.json({ items, total, page: +page, pages: Math.ceil(total / +limit) });
});

router.get("/:id", async (req, res) => {
  const p = await Product.findById(req.params.id).lean();
  if (!p) return res.status(404).json({ error: "Product not found" });
  res.json(p);
});

router.post("/", auth, async (req, res) => {
  const { error, value } = bodySchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  const p = await Product.create({ ...value, createdBy: req.user.id });
  res.status(201).json(p);
});

router.put("/:id", auth, async (req, res) => {
  const { error, value } = bodySchema.validate(req.body, { allowUnknown: false });
  if (error) return res.status(400).json({ error: error.details[0].message });
  const p = await Product.findByIdAndUpdate(req.params.id, value, { new: true, runValidators: true }).lean();
  if (!p) return res.status(404).json({ error: "Product not found" });
  res.json(p);
});

router.patch("/:id/stock", auth, async (req, res) => {
  const { delta } = req.body;
  if (typeof delta !== "number") return res.status(400).json({ error: "delta must be a number" });
  const p = await Product.findByIdAndUpdate(req.params.id, { $inc: { stock: delta } }, { new: true, runValidators: true }).lean();
  if (!p) return res.status(404).json({ error: "Product not found" });
  res.json(p);
});

router.delete("/:id", auth, async (req, res) => {
  const p = await Product.findByIdAndDelete(req.params.id);
  if (!p) return res.status(404).json({ error: "Product not found" });
  res.status(204).send();
});

module.exports = router;