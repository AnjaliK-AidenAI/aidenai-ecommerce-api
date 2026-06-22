const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer "))
    return res.status(401).json({ error: "Authorization header missing or malformed" });
  try {
    req.user = jwt.verify(header.slice(7), process.env.JWT_SECRET || "change-me");
    next();
  } catch {
    res.status(401).json({ error: "Token invalid or expired" });
  }
};