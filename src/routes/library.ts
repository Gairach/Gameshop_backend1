// routes/library.ts
import express from "express";
import { db } from "../firebase";
const router = express.Router();

// ดึง ownedGames ของ user ตาม userId
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const snapshot = await db
      .collection("ownedGames")
      .where("userId", "==", userId)   // เฉพาะ user นี้
      .orderBy("purchasedAt", "desc")  // เรียงล่าสุดก่อน
      .get();

    const ownedGames = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(ownedGames);
  } catch (err) {
    console.error("โหลด ownedGames ล้มเหลว:", err);
    res.status(500).json({ error: "โหลด ownedGames ล้มเหลว" });
  }
});

export default router;
