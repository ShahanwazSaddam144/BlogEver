const express = require("express");
const rateLimit = require("express-rate-limit");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const Auth = require("./controllers/auth");
const Profile = require("./controllers/profile");
const Blog = require("./controllers/blogs");
const app = express();
const port = process.env.PORT || 5000;

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: "Too many requests, Please try again",
  },
  standardHeaders: true,
  legacyHeaders: true,
});

app.use(cors());
app.use(express.json());
app.use(limiter);
dotenv.config();

// Routes
app.use('/api/auth', Auth);
app.use('/api', Profile);
app.use('/api', Blog);


mongoose
  .connect(process.env.MONGO_URI, {})
  .then(() => console.log("✅✅ MongoDB Connected"))
  .catch((err) => console.log("❌❌ MongoDB Connection Error:", err));

app.listen(port, (err) => {
  if (err) {
    console.log("❌❌ Error Connecting Server");
  } else {
    console.log(
      `✅✅ Server Running Successfully http://localhost:${port}`
    );
  }
});
