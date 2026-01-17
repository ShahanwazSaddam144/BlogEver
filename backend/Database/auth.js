const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: String,
    email: String,
    password: String,
    tokens: [
      {
        token: String,
      },
    ],
    isVerified: { type: Boolean, default: false },
    verifyToken: { type: String, default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);
