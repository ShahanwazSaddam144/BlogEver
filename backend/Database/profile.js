const mongoose = require("mongoose");

const profileSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  desc: { type: String, required: true },
  age: { type: Number, required: true },
  role: { type: String, required: true },
});

module.exports = mongoose.model("Profile", profileSchema);
