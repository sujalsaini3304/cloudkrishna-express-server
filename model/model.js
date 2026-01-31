import mongoose from "mongoose";

const studentRegistrationSchema = new mongoose.Schema(
  {
    fullname: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },

    phone_number: {
      type: String,
      required: true,
    },

    college: {
      type: String,
      required: true,
      trim: true,
    },

    course: {
      type: String,
      required: true,
    },

    current_year: {
      type: String,
      required: true,
      enum: ["1st Year", "2nd Year", "3rd Year", "4th Year", "Graduated"],
    },

    area_of_interest: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    // Cloudinary URL (resume is optional in form)
    resume_url: {
      type: String,
      default: null,
    },

    resume_public_id: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "student",
  }
);


const adminRegistrationSchema = new mongoose.Schema({
  fullname: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },

  password: {
    type: String,
    required: true,
    trim: true,
    minlength: 6,
  },

  role: {
    type: String,
    default: "admin"
  },

  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active",
  },

  phone_number: {
    type: String,
    required: true,
    minlength:10,
  },

},
  {
    timestamps: true,
    collection: "admin",
  }
)


// studentRegistrationSchema.index({ email: 1 }, { unique: true });
const Student = mongoose.models.student || mongoose.model("Student", studentRegistrationSchema);
const Admin = mongoose.models.admin || mongoose.model("Admin", adminRegistrationSchema);

export default Student
export {
  Admin,
}
