const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    amount: { type: Number, required: true },
    type: {
      type: String,
      enum: ["Advance", "Installment", "Balance", "Full"],
      default: "Installment",
    },
    mode: {
      type: String,
      enum: ["Cash", "Card", "UPI", "Bank Transfer", "Cheque", "Other"],
      default: "Cash",
    },
    date: { type: Date, default: Date.now },
    remarks: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);
