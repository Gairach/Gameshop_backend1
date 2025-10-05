"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/userRoutes.ts
const express_1 = __importDefault(require("express"));
const userController_1 = require("../controllers/userController");
const upload_1 = require("../middleware/upload");
const router = express_1.default.Router();
// ชื่อ field ต้องตรงกับ FormData ใน Angular
router.post("/register", (req, res) => {
    console.log("Headers:", req.headers['content-type']); // ต้องมี multipart/form-data
    upload_1.upload.single("imageProfile")(req, res, (err) => {
        if (err) {
            console.error("Multer error:", err);
            return res.status(400).json({ error: err.message });
        }
        console.log("req.body:", req.body);
        console.log("req.file:", req.file);
        (0, userController_1.registerUser)(req, res);
    });
});
router.post("/login", userController_1.loginUser);
// ✅ ดึงข้อมูล user จาก uid
router.get("/:uid", userController_1.getUserById);
router.post("/updateprofile", (req, res) => {
    // รับทั้ง text fields และ file
    upload_1.upload.single("imageProfile")(req, res, (err) => {
        if (err) {
            console.error("Multer error:", err);
            return res.status(400).json({ error: err.message });
        }
        (0, userController_1.updateProfile)(req, res);
    });
});
exports.default = router;
