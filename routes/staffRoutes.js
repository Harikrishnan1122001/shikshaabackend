const express = require("express");
const router = express.Router();
const Staff = require("../models/Staff");

// GET all staff
router.get("/", async (req, res) => {
  try {
    const staff = await Staff.find().sort({ name: 1 });
    res.json(staff);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE staff
router.post("/", async (req, res) => {
  try {
    const staff = await Staff.create(req.body);
    res.status(201).json(staff);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// UPDATE staff
router.put("/:id", async (req, res) => {
  try {
    const staff = await Staff.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!staff) return res.status(404).json({ error: "Staff not found" });
    res.json(staff);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE (deactivate) staff
router.delete("/:id", async (req, res) => {
  try {
    const staff = await Staff.findByIdAndUpdate(
      req.params.id,
      { active: false },
      { new: true }
    );
    if (!staff) return res.status(404).json({ error: "Staff not found" });
    res.json({ message: "Staff deactivated", staff });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
