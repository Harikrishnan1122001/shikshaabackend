const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
  {
    // --- Enquiry details ---
    enquiryDate: { type: Date, default: Date.now },
    source: {
      type: String,
      enum: ["Walk-in", "Call", "Online", "Reference"],
      default: "Walk-in",
    },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    phoneVerified: { type: Boolean, default: false },
    phoneVerifiedAt: { type: Date },
    address: { type: String, trim: true },
    email: { type: String, trim: true },
    courseEnquired: { type: String, trim: true },

    // --- Assignment & status ---
    assignedStaff: { type: mongoose.Schema.Types.ObjectId, ref: "Staff" },
    status: {
      type: String,
      enum: ["Enquiry", "Follow-up", "Joined", "Dropped"],
      default: "Enquiry",
    },
    followUpDate: { type: Date },
    notes: { type: String, trim: true },

    // --- Joining / fee details ---
    courseFeesQuoted: { type: Number, default: 0 },
    totalFee: { type: Number, default: 0 },
    joiningDate: { type: Date },
    franchiseName: { type: String, trim: true },
    batch: { type: String, trim: true },
  },
  { timestamps: true }
);

studentSchema.index({ name: "text", phone: "text", email: "text" });

module.exports = mongoose.model("Student", studentSchema);
