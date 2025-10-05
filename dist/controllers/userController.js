"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfile = exports.getUserById = exports.loginUser = exports.registerUser = void 0;
const firebase_1 = require("../firebase");
const bcrypt_1 = __importDefault(require("bcrypt"));
// =======================
// Register User
// =======================
const registerUser = async (req, res) => {
    try {
        const { username, password, email, fullname, phone } = req.body;
        const hashedPassword = await bcrypt_1.default.hash(password, 10);
        const docRef = firebase_1.db.collection("users").doc();
        const uid = docRef.id;
        const defaultImage = "https://www.shutterstock.com/image-vector/user-profile-icon-vector-avatar-600nw-2558760599.jpg";
        await docRef.set({
            uid,
            username,
            fullname,
            phone,
            password: hashedPassword,
            email,
            imageProfile: defaultImage,
            wallet: 0,
            role: "member",
        });
        res.status(201).json({
            uid,
            message: "User registered successfully",
            imageProfile: defaultImage,
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};
exports.registerUser = registerUser;
// =======================
// Login User
// =======================
const loginUser = async (req, res) => {
    try {
        const { username, password } = req.body;
        const snapshot = await firebase_1.db
            .collection("users")
            .where("username", "==", username)
            .get();
        if (snapshot.empty) {
            return res.status(400).json({ error: "User not found" });
        }
        const userDoc = snapshot.docs[0];
        const userData = userDoc.data();
        const match = await bcrypt_1.default.compare(password, userData.password);
        if (!match) {
            return res.status(400).json({ error: "Incorrect password" });
        }
        res.json({
            uid: userData.uid,
            username: userData.username,
            email: userData.email || '', // เพิ่ม
            fullname: userData.fullname || '', // เพิ่ม
            phone: userData.phone || '', // เพิ่ม
            wallet: userData.wallet,
            imageProfile: userData.imageProfile || '', // กำหนด default
            role: userData.role || 'member',
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};
exports.loginUser = loginUser;
// =======================
// Get User by UID
// =======================
const getUserById = async (req, res) => {
    try {
        const { uid } = req.params;
        const userDoc = await firebase_1.db.collection("users").doc(uid).get();
        if (!userDoc.exists) {
            return res.status(404).json({ error: "User not found" });
        }
        const userData = userDoc.data();
        // ไม่ส่ง password กลับไป
        if (userData)
            delete userData.password;
        res.status(200).json(userData);
    }
    catch (err) {
        console.error("Error fetching user:", err);
        res.status(500).json({ error: err.message });
    }
};
exports.getUserById = getUserById;
const updateProfile = async (req, res) => {
    try {
        const { uid, fullname, email, phone } = req.body;
        const imageProfile = req.file?.path;
        if (!uid)
            return res.status(400).json({ error: "UID is required" });
        const userRef = firebase_1.db.collection("users").doc(uid);
        const doc = await userRef.get();
        if (!doc.exists)
            return res.status(404).json({ error: "User not found" });
        await userRef.update({
            fullname,
            email,
            phone,
            ...(imageProfile && { imageProfile }), // อัปเดตรูปถ้ามี
        });
        const updatedDoc = await userRef.get();
        res.json(updatedDoc.data());
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Update failed" });
    }
};
exports.updateProfile = updateProfile;
