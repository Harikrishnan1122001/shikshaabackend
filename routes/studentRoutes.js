const express = require("express");
const router = express.Router();
const Student = require("../models/Student");
const Payment = require("../models/Payment");

// Helper: attach paid/balance totals to a student doc
async function withPaymentSummary(studentDoc) {
  const student = studentDoc.toObject ? studentDoc.toObject() : studentDoc;
  const agg = await Payment.aggregate([
    { $match: { student: student._id } },
    { $group: { _id: null, totalPaid: { $sum: "$amount" } } },
  ]);
  const totalPaid = agg.length ? agg[0].totalPaid : 0;
  return {
    ...student,
    totalPaid,
    balance: Math.max((student.totalFee || 0) - totalPaid, 0),
  };
}

// GET all students with filters: status, source, staff, courseEnquired, from/to date, search
router.get("/", async (req, res) => {
  try {
    const { status, source, staff, course, from, to, q } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (source) filter.source = source;
    if (staff) filter.assignedStaff = staff;
    if (course) filter.courseEnquired = new RegExp(course, "i");
    if (from || to) {
      filter.enquiryDate = {};
      if (from) filter.enquiryDate.$gte = new Date(from);
      if (to) filter.enquiryDate.$lte = new Date(to);
    }
    if (q) {
      filter.$or = [
        { name: new RegExp(q, "i") },
        { phone: new RegExp(q, "i") },
        { email: new RegExp(q, "i") },
      ];
    }

    const students = await Student.find(filter)
      .populate("assignedStaff", "name role")
      .sort({ enquiryDate: -1 });

    const withSummaries = await Promise.all(students.map(withPaymentSummary));
    res.json(withSummaries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Dashboard summary stats
router.get("/stats/summary", async (req, res) => {
  try {
    const [total, walkins, joined, followUps] = await Promise.all([
      Student.countDocuments(),
      Student.countDocuments({ source: "Walk-in" }),
      Student.countDocuments({ status: "Joined" }),
      Student.countDocuments({ status: "Follow-up" }),
    ]);
    const revenueAgg = await Payment.aggregate([
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const totalRevenue = revenueAgg.length ? revenueAgg[0].total : 0;
    res.json({ total, walkins, joined, followUps, totalRevenue });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single student with payment history
router.get("/:id", async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).populate(
      "assignedStaff",
      "name role"
    );
    if (!student) return res.status(404).json({ error: "Student not found" });
    const payments = await Payment.find({ student: student._id }).sort({ date: -1 });
    const summary = await withPaymentSummary(student);
    res.json({ ...summary, payments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE enquiry/student
router.post("/", async (req, res) => {
  try {
    const student = await Student.create(req.body);
    res.status(201).json(student);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// UPDATE student (status, joining details, assignment, follow-up, etc.)
router.put("/:id", async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate("assignedStaff", "name role");
    if (!student) return res.status(404).json({ error: "Student not found" });
    res.json(student);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE student
router.delete("/:id", async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) return res.status(404).json({ error: "Student not found" });
    await Payment.deleteMany({ student: student._id });
    res.json({ message: "Student deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Payment sub-resource ---

// GET payments for a student
router.get("/:id/payments", async (req, res) => {
  try {
    const payments = await Payment.find({ student: req.params.id }).sort({ date: -1 });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADD a payment for a student
router.post("/:id/payments", async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ error: "Student not found" });
    const payment = await Payment.create({ ...req.body, student: student._id });
    const summary = await withPaymentSummary(student);
    res.status(201).json({ payment, ...summary });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE a payment
router.delete("/:id/payments/:paymentId", async (req, res) => {
  try {
    const payment = await Payment.findOneAndDelete({
      _id: req.params.paymentId,
      student: req.params.id,
    });
    if (!payment) return res.status(404).json({ error: "Payment not found" });
    res.json({ message: "Payment removed" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
