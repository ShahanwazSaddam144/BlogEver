const mongoose = require("mongoose");

const blogschema = new mongoose.Schema({
    createdby: {type: String, required: true}, 
    name: { type: String, required: true },
    desc: { type: String, required: true },
    category: { type: String, required: true },
    publishedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Blog", blogschema);
