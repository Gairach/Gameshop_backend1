// src/controllers/userController.ts
import { Request, Response } from "express";
import { db } from "../firebase";
import bcrypt from "bcrypt";

// =======================
// Register User
// =======================
export const registerUser = async (req: Request, res: Response) => {
  try {
    const { username, password, email, fullname, phone } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);
    const docRef = db.collection("users").doc();
    const uid = docRef.id;

    const defaultImage =
      "https://www.shutterstock.com/image-vector/user-profile-icon-vector-avatar-600nw-2558760599.jpg";

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
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: (err as Error).message });
  }
};


// =======================
// Login User
// =======================
export const loginUser = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    const snapshot = await db
      .collection("users")
      .where("username", "==", username)
      .get();

    if (snapshot.empty) {
      return res.status(400).json({ error: "User not found" });
    }

    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();

    const match = await bcrypt.compare(password, userData.password);
    if (!match) {
      return res.status(400).json({ error: "Incorrect password" });
    }

    res.json({
      uid: userData.uid,
      username: userData.username,
      email: userData.email || '',        // เพิ่ม
      fullname: userData.fullname || '',  // เพิ่ม
      phone: userData.phone || '',        // เพิ่ม
      wallet: userData.wallet,
      imageProfile: userData.imageProfile || '',  // กำหนด default
      role: userData.role || 'member',
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: (err as Error).message });
  }
};

// =======================
// Get User by UID
// =======================
export const getUserById = async (req: Request, res: Response) => {
  try {
    const { uid } = req.params;

    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    const userData = userDoc.data();

    // ไม่ส่ง password กลับไป
    if (userData) delete (userData as any).password;

    res.status(200).json(userData);
  } catch (err) {
    console.error("Error fetching user:", err);
    res.status(500).json({ error: (err as Error).message });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const { uid, fullname, email, phone } = req.body;
    const imageProfile = (req.file as any)?.path;

    if (!uid) return res.status(400).json({ error: "UID is required" });

    const userRef = db.collection("users").doc(uid);
    const doc = await userRef.get();
    if (!doc.exists) return res.status(404).json({ error: "User not found" });

    await userRef.update({
      fullname,
      email,
      phone,
      ...(imageProfile && { imageProfile }), // อัปเดตรูปถ้ามี
    });

    const updatedDoc = await userRef.get();
    res.json(updatedDoc.data());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Update failed" });
  }
};


