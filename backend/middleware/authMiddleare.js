const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "a1f4b7d8e9c0f2a3b5c6d7e8f9a0b1c2";

module.exports = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader)
      return res.status(401).json({ message: "No token provided" });

    const token = authHeader.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Invalid token" });

    const decoded = jwt.verify(token, JWT_SECRET);
    
    req.userEmail = decoded.email;
    req.userId = decoded.id;

    next();
  } catch (err) {
    console.log("Auth middleware error:", err);
    return res.status(401).json({ message: "Unauthorized" });
  }
};
