// src/routes/userRoutes.ts
import express from "express";
import { registerUser, loginUser, getUserById, updateProfile, topup, getAllUsers } from "../controllers/userController";
import { upload } from "../middleware/upload";

const router = express.Router();

// ชื่อ field ต้องตรงกับ FormData ใน Angular
router.post("/register", (req, res) => {
  console.log("Headers:", req.headers['content-type']); // ต้องมี multipart/form-data
  upload.single("imageProfile")(req, res, (err) => {
    if (err) {
      console.error("Multer error:", err);
      return res.status(400).json({ error: err.message });
    }
    console.log("req.body:", req.body);
    console.log("req.file:", req.file);
    registerUser(req, res);
  });
});

router.post("/login", loginUser);
router.get("/", getAllUsers);

// ✅ ดึงข้อมูล user จาก uid
router.get("/:uid", getUserById);
router.post("/topup", topup);
router.post("/updateprofile", (req, res) => {
  // รับทั้ง text fields และ file
  upload.single("imageProfile")(req, res, (err) => {
    if (err) {
      console.error("Multer error:", err);
      return res.status(400).json({ error: err.message });
    }
    updateProfile(req, res);
  });
});



export default router;
