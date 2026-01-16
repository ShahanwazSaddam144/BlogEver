const express = require("express");
const User = require("../Database/auth");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "a1f4b7d8e9c0f2a3b5c6d7e8f9a0b1c2";

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

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      tokens: [],
    });

    const token = jwt.sign({ id: newUser._id, email: newUser.email }, JWT_SECRET, { expiresIn: "7d" });
    newUser.tokens.push({ token });

    await newUser.save();

    res.status(201).json({
      success: true,
      user: { name: newUser.name, email: newUser.email },
      token,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Please fill all fields" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
    user.tokens.push({ token });
    await user.save();

    res.status(200).json({
      success: true,
      user: { name: user.name, email: user.email },
      token,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/login-status", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ loggedIn: false });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findOne({ _id: decoded.id, "tokens.token": token });
    if (!user) return res.status(401).json({ loggedIn: false });

    res.status(200).json({
      loggedIn: true,
      userId: decoded.id,
      email: decoded.email,
    });
  } catch (err) {
    res.status(401).json({ loggedIn: false });
  }
});

router.post("/logout", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(400).json({ success: false, message: "No token provided" });

    const token = authHeader.split(" ")[1];

    const user = await User.findOne({ "tokens.token": token });
    if (!user) return res.status(400).json({ success: false, message: "Invalid token" });

    user.tokens = user.tokens.filter(t => t.token !== token);
    await user.save();

    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/delete-account", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ success: false, message: "No token provided" });

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findOne({ _id: decoded.id, "tokens.token": token });
    if (!user) return res.status(401).json({ success: false, message: "Invalid token" });

    await User.deleteOne({ _id: decoded.id });

    res.status(200).json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
