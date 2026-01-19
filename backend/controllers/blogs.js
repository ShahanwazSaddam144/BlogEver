const express = require("express");
const Blog = require("../Database/blogs");
const jwt = require("jsonwebtoken");
const authMiddleware = require("../middleware/authMiddleare");
const blogs = require("../Database/blogs");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "a1f4b7d8e9c0f2a3b5c6d7e8f9a0b1c2";


// Fo Sending or Creating Blogs
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

// For User Accounts

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

// To fetch blogs according to Email of user
router.get("/blogs/by-email/:email", async (req, res) => {
  try {
    const { email } = req.params;

    const blogs = await Blog.find({ email }); 

    if (!blogs || blogs.length === 0) {
      return res.status(404).json({ message: "No blogs found" });
    }

    res.status(200).json({ blogs }); 
  } catch (err) {
    console.log("Server error:", err);
    res.status(500).json({ message: "Server Error" });
  }
});

// To get All Blogs
router.get("/blogs", async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ publishedAt: 1 }).limit(100);
    res.status(200).json({ blogs });
  } catch (err) {
    console.log("Fetch blogs error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

//For Deleting User Blogs by ID
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

// For Full Blog Screen
router.get("/blogs/:id", async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({ message: "Blog not found" });
    }

    res.status(200).json({ blog });
  } catch (err) {
    console.log("Fetch single blog error:", err);
    res.status(500).json({ message: "Server error" });
  }
});


module.exports = router;
