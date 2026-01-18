const express = require("express");
const router = express.Router();
const Profile = require("../Database/profile");
const jwt = require("jsonwebtoken");
const authMiddleware = require("../middleware/authMiddleare");
const JWT_SECRET = process.env.JWT_SECRET || "a1f4b7d8e9c0f2a3b5c6d7e8f9a0b1c2";

router.post("/profile", authMiddleware, async (req, res) => {
  try {
    const { desc, age, role } = req.body;
    const email = req.userEmail; 

    if (!desc || !age || !role) {
      return res.status(400).json({ message: "Please fill all fields" });
    }

    const existingProfile = await Profile.findOne({ email });
    if (existingProfile) {
      return res.status(400).json({ message: "Profile already exists" });
    }

    const profile = new Profile({ email, desc, age, role });
    await profile.save();

    res.status(201).json({ message: "Profile created", profile });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});


router.get("/profile", authMiddleware, async (req, res) => {
  try {
    const email = req.userEmail;
    const profile = await Profile.findOne({ email });
    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }
    res.status(200).json(profile);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});


router.get("/profile/:email", async (req, res) => {
  try {
    const { email } = req.params;

    const profile = await Profile.findOne({ email });

    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    res.status(200).json(profile);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});



router.put("/profile", authMiddleware, async (req, res) => {
  try {
    const { desc, age, role } = req.body;
    const email = req.userEmail;

    if (!desc || !age || !role) {
      return res.status(400).json({ message: "Please fill all fields" });
    }

    const updatedProfile = await Profile.findOneAndUpdate(
      { email },
      { desc, age, role },
      { new: true }
    );

    if (!updatedProfile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    res.status(200).json({
      message: "Profile updated",
      profile: updatedProfile,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});



module.exports = router;
