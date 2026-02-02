import express from "express"
import dotenv from "dotenv"
import Student from "../model/model.js"
import imagekit from "../config/imagekit.js";
import { Admin, FormField } from "../model/model.js"
import jwt from "jsonwebtoken"
import bcrypt from "bcryptjs"
import verifyAdminToken from "../middlewares/jwt.middleware.js"
import { decrypt, encrypt } from "../utils/crypto.js";

const router = express.Router()
dotenv.config({
  path: ".env"
})


// Fetch student by its id registered in the MongoDB database
router.get("/student/:id", verifyAdminToken, async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).lean();

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    // Decrypt resume_url if exists
    if (student.resume_url) {
      try {
        student.resume_url = decrypt(student.resume_url);
      } catch (err) {
        console.error("Resume decrypt failed:", err);
        student.resume_url = null;
      }
    }

    res.status(200).json(student);
  } catch (error) {
    res.status(400).json({ error: "Invalid student ID" });
  }
});


// Fetch all students with pagination and search
router.get("/students", verifyAdminToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const status = req.query.status || 'all';

    const query = {};

    // Search logic
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { fullname: searchRegex },
        { email: searchRegex },
        { college: searchRegex },
        { phone_number: searchRegex }
      ];
    }

    // Status filter
    if (status !== 'all') {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    // Parallel execution for count and fetch
    const [total, students] = await Promise.all([
      Student.countDocuments(query),
      Student.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
    ]);

    const decryptedStudents = students.map((student) => {
      if (student.resume_url) {
        try {
          student.resume_url = decrypt(student.resume_url);
        } catch (err) {
          console.error("Resume decrypt failed:", err);
          student.resume_url = null;
        }
      }
      return student;
    });

    res.status(200).json({
      success: true,
      data: decryptedStudents,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Fetch students error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch students",
      error: error.message
    });
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
      message: "Both resume_url and resume_public_id are required",
    });
  }

  try {
    // Encrypt resume URL
    const encryptedResumeUrl = encrypt(resume_url);

    const student = await Student.findByIdAndUpdate(
      studentId,
      {
        resume_url: encryptedResumeUrl,
        resume_public_id,
      }
    );

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Resume info updated securely",
    });
  } catch (error) {
    console.error("Resume update error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
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


router.delete("/student/:id", verifyAdminToken, async (req, res) => {
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


router.put("/edit/student/:id", verifyAdminToken, async (req, res) => {
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
      status: req.body.status,
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


// Fetch current admin profile (protected)
router.get("/fetch/admin", async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin?.id).select("-password");

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found"
      });
    }

    return res.status(200).json({
      success: true,
      admin
    });
  } catch (error) {
    console.error("Fetch admin error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

// Fetch all admins (protected)
router.get("/fetch/admins", async (req, res) => {
  try {
    const admins = await Admin.find().select("-password").sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: admins
    });
  } catch (error) {
    console.error("Fetch admins error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});


router.post("/admin/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Basic validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }

    // Find admin by email
    const admin = await Admin.findOne({ email: email.toLowerCase() });

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    // Compare password
    const isPasswordMatch = await bcrypt.compare(password, admin.password);

    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: admin._id,
        fullname: admin.fullname,
        email: admin.email,
        role: admin.role,
        status: admin.status
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Success response
    return res.status(200).json({
      success: true,
      message: "Admin login successful",
      token,
      admin: {
        id: admin._id,
        fullname: admin.fullname,
        email: admin.email
      }
    });

  } catch (error) {
    console.error("Admin login error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});








router.post("/admin/register", async (req, res) => {
  try {
    const { fullname, email, password, phone_number } = req.body;

    // Validate input
    if (!fullname || !email || !password || !phone_number) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters"
      });
    }

    if (!(phone_number.length == 10)) {
      return res.status(400).json({
        success: false,
        message: "Phone number must be at least 10 characters"
      });
    }

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: email.toLowerCase() });

    if (existingAdmin) {
      return res.status(409).json({
        success: false,
        message: "Admin already exists with this email"
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin
    const admin = await Admin.create({
      fullname: fullname.trim(),
      email: email.toLowerCase(),
      password: hashedPassword,
      phone_number: phone_number
    });

    // Success response (never return password)
    return res.status(201).json({
      success: true,
      message: "Admin registered successfully",
      admin: {
        id: admin._id,
        fullname: admin.fullname,
        email: admin.email,
        createdAt: admin.createdAt
      }
    });

  } catch (error) {
    console.error("Admin registration error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});




// Edit admin (protected)
router.put("/admin/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Trim & normalize inputs
    const updatedData = {
      fullname: req.body.fullname?.trim(),
      email: req.body.email?.toLowerCase().trim(),
      phone_number: req.body.phone_number?.trim(),
      status: req.body.status,
    };

    // Check if admin exists
    const admin = await Admin.findById(id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found"
      });
    }

    // Prevent duplicate email (except self)
    if (updatedData.email && updatedData.email !== admin.email) {
      const emailExists = await Admin.findOne({
        email: updatedData.email,
        _id: { $ne: id },
      });

      if (emailExists) {
        return res.status(409).json({
          success: false,
          message: "Email is already registered"
        });
      }
    }

    // Handle password update if provided
    if (req.body.password) {
      if (req.body.password.length < 6) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 6 characters"
        });
      }
      updatedData.password = await bcrypt.hash(req.body.password, 10);
    }

    // Update admin
    await Admin.findByIdAndUpdate(id, updatedData, {
      new: true,
      runValidators: true,
    });

    return res.status(200).json({
      success: true,
      message: "Admin updated successfully"
    });

  } catch (error) {
    console.error("Edit admin error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

// Delete admin (protected)
router.delete("/admin/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Find admin
    const admin = await Admin.findById(id);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found"
      });
    }

    // Delete admin from MongoDB
    await Admin.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Admin deleted successfully"
    });

  } catch (error) {
    console.error("Delete admin error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

// ==================== PUBLIC FORM FIELDS ROUTE (NO AUTH) ====================

// Get all form fields for registration form (public endpoint)
router.get("/form-fields/public/all", async (req, res) => {
  try {
    // Fetch all form field types
    const formFields = await FormField.find({});

    // Create response object with all types
    const response = {
      colleges: [],
      courses: [],
      years: [],
      interests: [],
      countryCodes: []
    };

    // Map database types to response keys
    formFields.forEach(field => {
      if (field.type === 'colleges') {
        response.colleges = field.values || [];
      } else if (field.type === 'courses') {
        response.courses = field.values || [];
      } else if (field.type === 'years') {
        response.years = field.values || [];
      } else if (field.type === 'interests') {
        response.interests = field.values || [];
      } else if (field.type === 'countryCodes') {
        response.countryCodes = field.values || [];
      }
    });

    return res.status(200).json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error("Get public form fields error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});


// ==================== FORM FIELD MANAGEMENT ROUTES ====================

// Get all form fields for a specific type
router.get("/form-fields/:type", verifyAdminToken, async (req, res) => {
  try {
    const { type } = req.params;

    // Validate type
    const validTypes = ['colleges', 'courses', 'years', 'interests', 'countryCodes'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid type. Must be one of: colleges, courses, years, interests, countryCodes"
      });
    }

    // Find or create the form field document
    let formField = await FormField.findOne({ type });

    if (!formField) {
      // Create with empty array if doesn't exist
      formField = await FormField.create({ type, values: [] });
    }

    return res.status(200).json({
      success: true,
      data: formField.values
    });

  } catch (error) {
    console.error("Get form fields error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

// Add a new value to form field
router.post("/form-fields/:type", verifyAdminToken, async (req, res) => {
  try {
    const { type } = req.params;
    const { value } = req.body;

    // Validate type
    const validTypes = ['colleges', 'courses', 'years', 'interests', 'countryCodes'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid type. Must be one of: colleges, courses, years, interests"
      });
    }

    // Validate value
    if (!value || typeof value !== 'string' || !value.trim()) {
      return res.status(400).json({
        success: false,
        message: "Value is required and must be a non-empty string"
      });
    }

    // Find or create the form field document
    let formField = await FormField.findOne({ type });

    if (!formField) {
      formField = await FormField.create({ type, values: [value.trim()] });
    } else {
      // Check for duplicates
      if (formField.values.includes(value.trim())) {
        return res.status(409).json({
          success: false,
          message: "This value already exists"
        });
      }

      // Add new value
      formField.values.push(value.trim());
      await formField.save();
    }

    return res.status(201).json({
      success: true,
      message: "Value added successfully",
      data: formField.values
    });

  } catch (error) {
    console.error("Add form field error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

// Update a value in form field
router.put("/form-fields/:type/:index", verifyAdminToken, async (req, res) => {
  try {
    const { type, index } = req.params;
    const { value } = req.body;

    // Validate type
    const validTypes = ['colleges', 'courses', 'years', 'interests', 'countryCodes'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid type. Must be one of: colleges, courses, years, interests, countryCodes"
      });
    }

    // Validate value
    if (!value || typeof value !== 'string' || !value.trim()) {
      return res.status(400).json({
        success: false,
        message: "Value is required and must be a non-empty string"
      });
    }

    // Find the form field document
    const formField = await FormField.findOne({ type });

    if (!formField) {
      return res.status(404).json({
        success: false,
        message: "Form field not found"
      });
    }

    // Validate index
    const idx = parseInt(index);
    if (isNaN(idx) || idx < 0 || idx >= formField.values.length) {
      return res.status(400).json({
        success: false,
        message: "Invalid index"
      });
    }

    // Check for duplicates (excluding current index)
    const trimmedValue = value.trim();
    const duplicateIndex = formField.values.findIndex((v, i) => v === trimmedValue && i !== idx);
    if (duplicateIndex !== -1) {
      return res.status(409).json({
        success: false,
        message: "This value already exists"
      });
    }

    // Update value
    formField.values[idx] = trimmedValue;
    await formField.save();

    return res.status(200).json({
      success: true,
      message: "Value updated successfully",
      data: formField.values
    });

  } catch (error) {
    console.error("Update form field error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

// Delete a value from form field
router.delete("/form-fields/:type/:index", verifyAdminToken, async (req, res) => {
  try {
    const { type, index } = req.params;

    // Validate type
    const validTypes = ['colleges', 'courses', 'years', 'interests', 'countryCodes'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid type. Must be one of: colleges, courses, years, interests, countryCodes"
      });
    }

    // Find the form field document
    const formField = await FormField.findOne({ type });

    if (!formField) {
      return res.status(404).json({
        success: false,
        message: "Form field not found"
      });
    }

    // Validate index
    const idx = parseInt(index);
    if (isNaN(idx) || idx < 0 || idx >= formField.values.length) {
      return res.status(400).json({
        success: false,
        message: "Invalid index"
      });
    }

    // Remove value
    const deletedValue = formField.values[idx];
    formField.values.splice(idx, 1);
    await formField.save();

    return res.status(200).json({
      success: true,
      message: `"${deletedValue}" deleted successfully`,
      data: formField.values
    });

  } catch (error) {
    console.error("Delete form field error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});



export default router