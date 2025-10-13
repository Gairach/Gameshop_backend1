import express, { Request, Response } from "express";
import { db } from "../firebase";
const router = express.Router();

// ดึงประวัติของผู้ใช้
// ดึงประวัติของ user
router.get("/:userId", async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        if (!userId) {
            return res.status(400).json({ error: "ไม่พบ userId" });
        }

        console.log("🔹 Fetch history for user:", userId);

        const snapshot = await db.collection("history")
            .where("userId", "==", userId)
            .orderBy("createdAt", "desc")
            .get();

        console.log("🔹 Documents found:", snapshot.size);

        const history = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.status(200).json(history);

    } catch (err) {
        console.error("❌ Error fetching history:", err);
        res.status(500).json({ error: "ไม่สามารถดึงประวัติได้" });
    }
});

// routes/history.ts (หรือ controller)
router.get("/admin/all", async (req, res) => {
  try {
    const snapshot = await db.collection("history").orderBy("createdAt", "desc").get();

    const transactions = await Promise.all(snapshot.docs.map(async doc => {
      const data = doc.data();
      const userDoc = await db.collection("users").doc(data.userId).get();
      const username = userDoc.exists ? userDoc.data()?.username : "Unknown";
      return {
        id: doc.id,
        userId: data.userId,
        username,           // เพิ่มตรงนี้
        type: data.type,
        detail: data.detail || '',
        amount: data.amount,
        createdAt: data.createdAt
      };
    }));

    res.status(200).json(transactions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ไม่สามารถดึงประวัติทั้งหมดได้" });
  }
});

export default router;
