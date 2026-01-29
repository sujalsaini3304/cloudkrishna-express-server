import express from "express"
import dotenv from "dotenv"
import Student from "../model/model.js"
import cloudinary from "../config/cloudinary.js"
import upload from "../middlewares/multer.js"
import { sendSubmissionEmail } from "../utils/mailer.js"
import { v4 as uuidv4 } from "uuid"

const router = express.Router()
dotenv.config({
  path: ".env"
})

// Express server status
router.get("/", (req, res) => {
  res.status(200).json({
    "message": "Express server is running."
  })
})

// Fetch student by its id registered in the MongoDB database
router.get("/student/:id", async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    res.status(200).json(student);
  } catch (error) {
    res.status(400).json({ error: "Invalid student ID" });
  }
});

// Fetch all students
router.get("/students", async (req, res) => {
  try {
    const students = await Student.find().sort({ createdAt: -1 });
    res.status(200).json(students);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch students" });
  }
});


// Register student
router.post("/register/student", upload.single("resume"), async (req, res) => {
  try {
    // 🔹 Normalize email
    const email = req.body.email?.toLowerCase().trim();

    // 🔹 Check if email already exists
    const existingStudent = await Student.findOne({ email });
    if (existingStudent) {
      return res.status(409).json({
        error: "Email is already registered",
      });
    }

    // 🔹 Upload resume (optional)
    let resumeURL = null;
    let resumePublicId = null;

    if (req.file) {
      if (req.file.size > 3 * 1024 * 1024) {
        return res.status(400).json({
          error: "Resume size must be less than 3 MB",
        });
      }

      resumePublicId = uuidv4();
      const fileExtension = req.file.originalname.split(".").pop();
      const fullPublicId = `${resumePublicId}.${fileExtension}`;

      const uploadResult = await new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              folder: "cloudkrishna/student_resumes/" + email,
              public_id: fullPublicId,
              resource_type: "auto",
              overwrite: true,
            },
            (err, result) => {
              if (err) reject(err);
              else resolve(result);
            }
          )
          .end(req.file.buffer);
      });

      resumeURL = uploadResult.secure_url;
      resumePublicId = fullPublicId;
    }

    // 🔹 Create student document
    const student = await Student.create({
      fullname: req.body.fullname,
      email,
      phone_number: req.body.phone_number,
      college: req.body.college,
      course: req.body.course,
      current_year: req.body.current_year,
      area_of_interest: req.body.area_of_interest,
      resume_url: resumeURL,
      resume_public_id: resumePublicId,
      status: "pending",
    });

    // Send email (awaited to ensure execution, but caught so registration doesn't fail)
    try {
      await sendSubmissionEmail(
        student.email,
        student.fullname,
        student._id.toString()
      );
    } catch (emailError) {
      console.error("Failed to send registration email:", emailError.message);
      // We don't throw properly here because we still want the registration to succeed
      // but we log specifically that the email failed.
    }

    return res.status(201).json({
      message: "Student registered successfully",
      id: student._id,
      resume: resumeURL,
    });


  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Failed to register student",
    });
  }

});







export default router