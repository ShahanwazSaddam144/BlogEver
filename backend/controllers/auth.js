const express = require("express");
const User = require("../Database/auth");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET; 

// Signup
router.post("/signIn", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Please fill all fields" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, password: hashedPassword });
    await newUser.save();

    const token = jwt.sign({ id: newUser._id }, JWT_SECRET, { expiresIn: "7d" });

    res.status(201).json({ success: true, user: { name, email }, token });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Please fill all fields" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid email or password" });

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "7d" });

    res.status(200).json({ success: true, user: { name: user.name, email: user.email }, token });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Get login status
router.get("/login-status", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ loggedIn: false });

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) return res.status(401).json({ loggedIn: false });

      res.status(200).json({ loggedIn: true, userId: decoded.id });
    });
  } catch (err) {
    res.status(500).json({ loggedIn: false, message: "Server error", error: err.message });
  }token
});

// Logout (frontend just discards )
router.post("/logout", async (req, res) => {
  res.status(200).json({ success: true, message: "Logged out successfully" });
});

module.exports = router;
