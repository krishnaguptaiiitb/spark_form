const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const axios = require("axios");
const path = require("path");   // ✅ moved up so we can use in file filter

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB connection
mongoose.connect("mongodb+srv://sparkadmin:spark123@cluster0.pfh8acb.mongodb.net/SparkFormDB?retryWrites=true&w=majority&appName=Cluster0")
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.log("❌ DB Error:", err));


// ✅ Multer with file size + extension restrictions
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 }, // 100KB limit
  fileFilter: (req, file, cb) => {
    const allowed = [".pdf", ".doc", ".docx"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext)) {
      return cb(new Error("Only PDF, DOC, or DOCX files are allowed"));
    }
    cb(null, true);
  }
});


// ✅ Schema updated: resume is stored as Buffer instead of path
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

  resume: { data: Buffer, contentType: String }
}, { timestamps: true });

const Form = mongoose.model("Form", formSchema);


// ✅ Submit route updated
app.post("/submit", upload.single("resume"), async (req, res) => {
  try {
    // ✅ Verify captcha
    const captcha = req.body["g-recaptcha-response"];
    if (!captcha) {
      return res.status(400).json({ success: false, message: "Captcha is required" });
    }

    try {
      const verifyURL = `https://www.google.com/recaptcha/api/siteverify?secret=6LdYFt0rAAAAANjeTkVTCR6-R09pl8xZvCyxUOPz&response=${captcha}`;
      const { data } = await axios.post(verifyURL);

      if (!data.success) {
        return res.status(400).json({ success: false, message: "Captcha verification failed" });
      }
    } catch (err) {
      return res.status(500).json({ success: false, message: "Captcha verification error" });
    }

    const { name, email, phone, scholarNumber } = req.body;

    if (!name || !email || !phone || !scholarNumber) {
      return res.status(400).json({ success: false, message: "Required fields missing." });
    }

    // check duplicates
    const existing = await Form.findOne({
      $or: [{ scholarNumber }, { phone }, { email }]
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Form already submitted with this Scholar No. / Phone / Email."
      });
    }

    // 🔹 UPDATED error if resume missing
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Resume file is required (PDF/DOC/DOCX, Max size 100KB)."
      });
    }

    // ✅ Save resume buffer directly into Mongo
    const newForm = new Form({
      ...req.body,
      resume: {
        data: req.file.buffer,
        contentType: req.file.mimetype
      }
    });

    await newForm.save();

    return res.status(201).json({ success: true, message: "Form submitted successfully!" });

  } catch (err) {
    console.error("❌ Error while submitting form:", err);

    // 🔹 UPDATED error for file too large
    return res.status(500).json({
      success: false,
      message: err.message.includes("File too large")
        ? "Please compress your resume to under 100KB and try again."
        : "Server error, please try again later."
    });
  }
});


// ✅ Route to download resume later
app.get("/resume/:id", async (req, res) => {
  try {
    const form = await Form.findById(req.params.id);
    if (!form || !form.resume || !form.resume.data) {
      return res.status(404).send("Resume not found");
    }

    res.set("Content-Type", form.resume.contentType);
    res.send(form.resume.data);
  } catch (err) {
    res.status(500).send("Error fetching resume");
  }
});


// ✅ Serve admin page only with secret key
app.get("/admin/:secret", (req, res) => {
  const secretKey = "spark2025"; // 🔑 choose your own secret
  if (req.params.secret !== secretKey) {
    return res.status(403).send("Forbidden");
  }
  res.sendFile(path.join(__dirname, "admin.html"));
});

// ✅ API to fetch submissions (also protected by secret key)
app.get("/submissions/:secret", async (req, res) => {
  const secretKey = "spark2025"; // must match same secret
  if (req.params.secret !== secretKey) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  try {
    const forms = await Form.find().sort({ createdAt: -1 });
    res.json(forms);
  } catch (err) {
    console.error("❌ Error fetching submissions:", err);
    res.status(500).json({ success: false, message: "Error fetching submissions" });
  }
});


// simple test route
app.get("/", (req, res) => res.send("Backend is running 🚀"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
