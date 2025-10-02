// server.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ensure uploads folder exists
const UPLOAD_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

// serve uploads
app.use("/uploads", express.static(UPLOAD_DIR));

// MongoDB connection
mongoose.connect("mongodb+srv://sparkadmin:spark123@cluster0.pfh8acb.mongodb.net/SparkFormDB?retryWrites=true&w=majority&appName=Cluster0")
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.log("❌ DB Error:", err));

// multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// schema
const formSchema = new mongoose.Schema({
  name: { type: String, required: true },
  scholarNumber: { type: String, required: true, index: true },
  phone: { type: String, required: true, index: true },
  email: { type: String, required: true, index: true },
  year: { type: String, required: true },
  branch: { type: String, required: true },
  preference1: { type: String, required: true },
  preference2: { type: String, required: true },
  preference3: { type: String, required: true },
  language: { type: String, required: true },
  resume: { type: String, required: true } // store filename or URL
}, { timestamps: true });

const Form = mongoose.model("Form", formSchema);

// submit route
app.post("/submit", upload.single("resume"), async (req, res) => {
  try {
    const { name, email, phone, scholarNumber } = req.body;

    // check required fields
    if (!name || !email || !phone || !scholarNumber) {
      if (req.file) fs.unlinkSync(req.file.path); // cleanup
      return res.status(400).json({ success: false, message: "Required fields missing." });
    }

    // check duplicates
    const existing = await Form.findOne({
      $or: [{ scholarNumber }, { phone }, { email }]
    });

    if (existing) {
      if (req.file) fs.unlinkSync(req.file.path); // cleanup
      return res.status(400).json({
        success: false,
        message: "Form already submitted with this Scholar No. / Phone / Email."
      });
    }

    // resume required
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Resume file is required." });
    }

    // build resume path
    const resumePath = `/uploads/${req.file.filename}`;

    const newForm = new Form({
      ...req.body,
      resume: resumePath
    });

    await newForm.save();

    return res.status(201).json({ success: true, message: "Form submitted successfully!" });

  } catch (err) {
    console.error("❌ Error while submitting form:", err);
    // cleanup if error
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    return res.status(500).json({ success: false, message: "Server error, please try again later." });
  }
});

// simple test route
app.get("/", (req, res) => res.send("Backend is running 🚀"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
