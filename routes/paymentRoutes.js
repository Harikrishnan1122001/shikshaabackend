const express = require("express");
const router = express.Router();
const Payment = require("../models/Payment");
const Student = require("../models/Student");

// Build a Mongo filter for payments based on query params
async function buildFilter(query) {
  const { type, mode, from, to, staff, q } = query;
  const filter = {};
  if (type) filter.type = type;
  if (mode) filter.mode = mode;
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(to);
  }

  if (staff || q) {
    const studentFilter = {};
    if (staff) studentFilter.assignedStaff = staff;
    if (q) {
      studentFilter.$or = [
        { name: new RegExp(q, "i") },
        { phone: new RegExp(q, "i") },
      ];
    }
    const matchingStudents = await Student.find(studentFilter).select("_id");
    filter.student = { $in: matchingStudents.map((s) => s._id) };
  }

  return filter;
}

// GET /api/payments — list all payments across all students, with filters
router.get("/", async (req, res) => {
  try {
    const filter = await buildFilter(req.query);
    const payments = await Payment.find(filter)
      .populate({
        path: "student",
        select: "name phone assignedStaff status",
        populate: { path: "assignedStaff", select: "name" },
      })
      .sort({ date: -1 });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/payments/summary — totals across all (filtered) payments
router.get("/summary", async (req, res) => {
  try {
    const filter = await buildFilter(req.query);
    const [totalAgg, byType] = await Promise.all([
      Payment.aggregate([
        { $match: filter },
        { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
      ]),
      Payment.aggregate([
        { $match: filter },
        { $group: { _id: "$type", total: { $sum: "$amount" } } },
      ]),
    ]);
    res.json({
      total: totalAgg.length ? totalAgg[0].total : 0,
      count: totalAgg.length ? totalAgg[0].count : 0,
      byType: byType.reduce((acc, r) => ({ ...acc, [r._id]: r.total }), {}),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
