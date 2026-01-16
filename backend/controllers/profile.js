const express = require("express");
const router = express.Router();
const Profile = require("../Database/profile");

router.post("/profile", async (req, res) => {
  try {
    const { email, desc, age, role } = req.body;

    if (!email || !desc || !age || !role) {
      return res.status(400).json({ message: "Please fill all fields" });
    }

    const existingProfile = await Profile.findOne({ email });
    if (existingProfile) return res.status(400).json({ message: "Profile already exists" });

    const profile = new Profile({
      email,
      desc,
      age,
      role,
    });

    await profile.save();
    res.status(201).json({ message: "Profile created", profile });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/profile", async (req, res) => {
  try {
    const { email } = req.query; 

    if (!email) return res.status(400).json({ message: "Email is required" });

    const profile = await Profile.findOne({ email });
    if (!profile) return res.status(404).json({ message: "Profile not found" });

    res.status(200).json(profile);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
