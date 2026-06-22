const express    = require("express");
const mongoose   = require("mongoose");
const bcrypt     = require("bcryptjs");
const jwt        = require("jsonwebtoken");
const Joi        = require("joi");
const router     = express.Router();

const UserSchema = new mongoose.Schema(
  {
    name:         { type: String, required: true, trim: true },
    email:        { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true, select: false },
    role:         { type: String, enum: ["customer", "admin"], default: "customer" },
  },
  { timestamps: true }
);
const User = mongoose.model("User", UserSchema);

const registerSchema = Joi.object({
  name:     Joi.string().min(2).max(60).required(),
  email:    Joi.string().email().required(),
  password: Joi.string().min(8).required(),
});

const loginSchema = Joi.object({
  email:    Joi.string().email().required(),
  password: Joi.string().required(),
});

const signToken = user =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || "change-me", { expiresIn: "24h" });

router.post("/register", async (req, res) => {
  const { error, value } = registerSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  const exists = await User.exists({ email: value.email });
  if (exists) return res.status(409).json({ error: "Email already registered" });
  const passwordHash = await bcrypt.hash(value.password, 12);
  const user = await User.create({ name: value.name, email: value.email, passwordHash });
  res.status(201).json({ token: signToken(user), user: { id: user._id, name: user.name, role: user.role } });
});

router.post("/login", async (req, res) => {
  const { error, value } = loginSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  const user = await User.findOne({ email: value.email }).select("+passwordHash");
  if (!user || !(await bcrypt.compare(value.password, user.passwordHash)))
    return res.status(401).json({ error: "Invalid credentials" });
  res.json({ token: signToken(user), user: { id: user._id, name: user.name, role: user.role } });
});

module.exports = router;