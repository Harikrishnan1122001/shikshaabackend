const express = require("express");
const router = express.Router();
const ExcelJS = require("exceljs");
const Student = require("../models/Student");
const Payment = require("../models/Payment");

// GET /api/export/students -> downloads an .xlsx of all students (respects same filters as list view)
router.get("/students", async (req, res) => {
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
      .sort({ enquiryDate: -1 })
      .lean();

    const studentIds = students.map((s) => s._id);
    const payments = await Payment.aggregate([
      { $match: { student: { $in: studentIds } } },
      { $group: { _id: "$student", totalPaid: { $sum: "$amount" } } },
    ]);
    const paidMap = new Map(payments.map((p) => [String(p._id), p.totalPaid]));

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Shikshaa CRM";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("Students");
    sheet.columns = [
      { header: "Enquiry Date", key: "enquiryDate", width: 14 },
      { header: "Source", key: "source", width: 10 },
      { header: "Name", key: "name", width: 22 },
      { header: "Phone", key: "phone", width: 14 },
      { header: "Email", key: "email", width: 24 },
      { header: "Address", key: "address", width: 26 },
      { header: "Course Enquired", key: "courseEnquired", width: 20 },
      { header: "Assigned Staff", key: "staff", width: 18 },
      { header: "Status", key: "status", width: 12 },
      { header: "Follow-up Date", key: "followUpDate", width: 14 },
      { header: "Joining Date", key: "joiningDate", width: 14 },
      { header: "Franchise", key: "franchiseName", width: 16 },
      { header: "Batch", key: "batch", width: 10 },
      { header: "Fee Quoted", key: "courseFeesQuoted", width: 12 },
      { header: "Total Fee", key: "totalFee", width: 12 },
      { header: "Paid", key: "totalPaid", width: 12 },
      { header: "Balance", key: "balance", width: 12 },
      { header: "Notes", key: "notes", width: 26 },
    ];
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1F3B57" },
    };
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

    students.forEach((s) => {
      const totalPaid = paidMap.get(String(s._id)) || 0;
      sheet.addRow({
        enquiryDate: s.enquiryDate ? new Date(s.enquiryDate).toLocaleDateString() : "",
        source: s.source,
        name: s.name,
        phone: s.phone,
        email: s.email,
        address: s.address,
        courseEnquired: s.courseEnquired,
        staff: s.assignedStaff ? s.assignedStaff.name : "",
        status: s.status,
        followUpDate: s.followUpDate ? new Date(s.followUpDate).toLocaleDateString() : "",
        joiningDate: s.joiningDate ? new Date(s.joiningDate).toLocaleDateString() : "",
        franchiseName: s.franchiseName,
        batch: s.batch,
        courseFeesQuoted: s.courseFeesQuoted || 0,
        totalFee: s.totalFee || 0,
        totalPaid,
        balance: Math.max((s.totalFee || 0) - totalPaid, 0),
        notes: s.notes,
      });
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Shikshaa_Students_${Date.now()}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
