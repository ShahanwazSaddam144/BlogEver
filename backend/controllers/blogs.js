const express = require("express");
const Blog = require("../Database/blogs");
const jwt = require("jsonwebtoken");
const authMiddleware = require("../middleware/authMiddleare");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "a1f4b7d8e9c0f2a3b5c6d7e8f9a0b1c2";


router.post("/blogs", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, JWT_SECRET);
    const {createdby, name, desc, category, publishedAt } = req.body;

    const newBlog = new Blog({
      createdby,
      name,
      desc,
      category,
      publishedAt,
      email: decoded.email, 
    });

    await newBlog.save();
    res.json({ message: "Blog created successfully" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
});


router.get("/my-blogs", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, JWT_SECRET);

    const blogs = await Blog.find({ email: decoded.email }).sort({ publishedAt: -1 });

    res.json({ blogs });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
});


router.get("/blogs", async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ publishedAt: -1 });
    res.status(200).json({ blogs });
  } catch (err) {
    console.log("Fetch blogs error:", err);
    res.status(500).json({ message: "Server error" });
  }
});


router.delete("/my-blogs/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const blog = await Blog.findOne({ _id: id, email: req.userEmail });
    if (!blog) {
      return res.status(401).json({ message: "Unauthorized or blog not found" });
    }

    await Blog.deleteOne({ _id: id });
    res.status(200).json({ message: "Blog deleted successfully" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
});


module.exports = router;
