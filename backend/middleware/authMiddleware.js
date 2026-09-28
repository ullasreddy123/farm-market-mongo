const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select("-password");
      if (!req.user) {
        return res.status(401).json({ message: "User not found" });
      }
      return next();
    } catch (err) {
      return res.status(401).json({ message: "Not authorized, token failed" });
    }
  }

  return res.status(401).json({ message: "Not authorized, no token" });
};

const requireRole = (role) => (req, res, next) => {
  if (req.user?.role !== role) {
    return res.status(403).json({ message: `Only ${role}s can access this resource` });
  }
  next();
};

// Like `protect`, but never blocks the request — just attaches req.user
// if a valid token is present. Used by routes that serve both logged-in
// and anonymous users (e.g. the AI assistant, which helps new users
// register too).
const attachUserIfPresent = async (req, res, next) => {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer")) {
    try {
      const token = header.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select("-password");
    } catch (err) {
      // invalid/expired token — just proceed without a user
    }
  }
  next();
};

module.exports = { protect, requireRole, attachUserIfPresent };
