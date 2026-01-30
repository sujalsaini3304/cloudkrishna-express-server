import express from "express"
import dotenv from "dotenv"
import Student from "../model/model.js"
// import cloudinary from "../config/cloudinary.js"
import upload from "../middlewares/multer.js"
import { sendSubmissionEmail } from "../utils/mailer.js"
import { v4 as uuidv4 } from "uuid"
import imagekit from "../config/imagekit.js";

const router = express.Router()
dotenv.config({
  path: ".env"
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

// Just insert into db without email send and imagekit file upload designing best system architecture

router.post("/register/student", async (req, res) => {
  try {
    const student = await Student.create({
      fullname: req.body.fullname,
      email: req.body.email,
      phone_number: req.body.phone_number,
      college: req.body.college,
      course: req.body.course,
      current_year: req.body.current_year,
      area_of_interest: req.body.area_of_interest,
      status: "pending",
    });

    return res.status(201).json({
      success: true,
      message: "Student registered successfully",
      data: student,
    });

  } catch (error) {
    // Duplicate email
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Email already exists",
      });
    }

    console.error("Register error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});



router.patch("/student/:id/resume", async (req, res) => {
  const studentId = req.params.id;
  const { resume_url, resume_public_id } = req.body;

  if (!resume_url || !resume_public_id) {
    return res.status(400).json({
      success: false,
      message: "Both resume_url and resume_public_id are required"
    });
  }

  try {
    const student = await Student.findByIdAndUpdate(
      studentId,
      { resume_url, resume_public_id },
      // { new: true } // return the updated document
    );

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Resume info updated successfully",
      // data: {
      //   _id: student._id,
      //   resume_url: student.resume_url,
      //   resume_public_id: student.resume_public_id
      // }
    });
  } catch (error) {
    console.error("Resume update error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});


router.get("/imagekit/auth", (req, res) => {
  try {
    const authenticationParameters = imagekit.getAuthenticationParameters();
    // returns token, expire timestamp, signature
    return res.status(200).json(authenticationParameters);
  } catch (err) {
    console.error("ImageKit auth error:", err);
    return res.status(500).json({ success: false, message: "Failed to generate ImageKit auth" });
  }
});


router.delete("/student/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Find student
    const student = await Student.findById(id);

    if (!student) {
      return res.status(404).json({
        error: "Student not found",
      });
    }

    // Delete resume from ImageKit (if exists)
    if (student.resume_public_id) {
      try {
        await imagekit.deleteFile(student.resume_public_id);
      } catch (err) {
        console.error("ImageKit delete failed:", err.message);
        // Continue deletion even if ImageKit fails
      }
    }

    // Delete student from MongoDB
    await Student.findByIdAndDelete(id);

    return res.status(200).json({
      message: "Student and resume deleted successfully",
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Failed to delete student",
    });
  }
});


router.put("/edit/student/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Trim & normalize inputs
    const updatedData = {
      fullname: req.body.fullname?.trim(),
      email: req.body.email?.toLowerCase().trim(),
      phone_number: req.body.phone_number?.trim(),
      college: req.body.college?.trim(),
      course: req.body.course,
      current_year: req.body.current_year,
      area_of_interest: req.body.area_of_interest,
      status:req.body.status,
    };

    // Check if student exists
    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({
        error: "Student not found",
      });
    }

    // Prevent duplicate email (except self)
    if (updatedData.email && updatedData.email !== student.email) {
      const emailExists = await Student.findOne({
        email: updatedData.email,
        _id: { $ne: id },
      });

      if (emailExists) {
        return res.status(409).json({
          error: "Email is already registered",
        });
      }
    }

    // Update student
    await Student.findByIdAndUpdate(id, updatedData, {
      new: true,
      runValidators: true,
    });

    return res.status(200).json({
      message: "Student updated successfully",
    });

  } catch (error) {
    console.error("Edit student error:", error);
    return res.status(500).json({
      error: "Failed to update student",
    });
  }
});





export default router