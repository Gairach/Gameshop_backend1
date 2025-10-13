// routes/discounts.ts
import express from "express";
import { db } from "../firebase";
const router = express.Router();

// POST สร้างโค้ดใหม่
router.post("/add", async (req, res) => {
  try {
    const { code, discountAmount, maxUses, minTotal } = req.body;
    if (!code || !discountAmount || !maxUses) return res.status(400).json({ error: "ข้อมูลไม่ครบถ้วน" });

    const newCode = {
      code,
      discountAmount,
      maxUses,
      usedCount: 0,
      minTotal: minTotal || 0,
      status: "active",
      createdAt: new Date().toISOString()
    };

    const docRef = await db.collection("discountCodes").add(newCode);
    res.status(201).json({ message: "สร้างโค้ดสำเร็จ", id: docRef.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "เกิดข้อผิดพลาด" });
  }
});

// ✅ PUT อัปเดตโค้ดส่วนลด
router.put("/edit/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { code, discountAmount, maxUses, minTotal, status } = req.body;

    if (!id) return res.status(400).json({ error: "ไม่พบ id ของโค้ด" });

    const docRef = db.collection("discountCodes").doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: "ไม่พบโค้ดส่วนลด" });
    }

    const updatedData: any = {};
    if (code !== undefined) updatedData.code = code;
    if (discountAmount !== undefined) updatedData.discountAmount = discountAmount;
    if (maxUses !== undefined) updatedData.maxUses = maxUses;
    if (minTotal !== undefined) updatedData.minTotal = minTotal;
    if (status !== undefined) updatedData.status = status;

    updatedData.updatedAt = new Date().toISOString();

    await docRef.update(updatedData);

    res.json({ message: "อัปเดตโค้ดสำเร็จ", id });
  } catch (err) {
    console.error("อัปเดตโค้ดล้มเหลว:", err);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการอัปเดตโค้ด" });
  }
});


// ลบโค้ดส่วนลด
router.delete("/discountCodes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "ไม่พบ id ของโค้ด" });

    const docRef = db.collection("discountCodes").doc(id);
    const doc = await docRef.get();

    if (!doc.exists) return res.status(404).json({ error: "ไม่พบโค้ดส่วนลด" });

    await docRef.delete();

    res.json({ message: "ลบโค้ดสำเร็จ" });
  } catch (err) {
    console.error("ลบโค้ดล้มเหลว:", err);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการลบโค้ด" });
  }
});


// GET โค้ดทั้งหมด
router.get("/", async (req, res) => {
  try {
    const snapshot = await db.collection("discountCodes").get();
    const codes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(codes);
  } catch (err) {
    res.status(500).json({ error: "โหลดโค้ดล้มเหลว" });
  }
});

//  GET ดึงข้อมูลโค้ดตาม id
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) return res.status(400).json({ error: "ไม่พบ id ของโค้ด" });

    const docRef = db.collection("discountCodes").doc(id);
    const doc = await docRef.get();

    if (!doc.exists) return res.status(404).json({ error: "ไม่พบโค้ดส่วนลด" });

    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    console.error("โหลดข้อมูลโค้ดล้มเหลว:", err);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการโหลดข้อมูลโค้ด" });
  }
});

// POST ใช้โค้ด
router.post("/apply", async (req, res) => {
  try {
    const { code, totalAmount, userId } = req.body; // รับ userId ด้วยเพื่อตรวจสอบว่าผู้ใช้ใช้โค้ดไปแล้วหรือยัง
    if (!code || !totalAmount || !userId) {
      return res.status(400).json({ error: "ข้อมูลไม่ครบถ้วน" });
    }

    // ค้นหาโค้ด
    const snapshot = await db.collection("discountCodes")
      .where("code", "==", code)
      .limit(1)
      .get();

    if (snapshot.empty) return res.status(404).json({ error: "โค้ดไม่ถูกต้อง" });

    const doc = snapshot.docs[0];
    const data = doc.data() as any;

    // ตรวจสอบสถานะ
    if (data.status !== "active") return res.status(400).json({ error: "โค้ดหมดอายุ" });
    if (totalAmount < data.minTotal) return res.status(400).json({ error: `ต้องซื้อขั้นต่ำ ${data.minTotal} บาท` });

    // ตรวจสอบว่าผู้ใช้เคยใช้โค้ดนี้แล้วหรือยัง
    const userUsed = await db.collection("usedDiscounts")
      .where("userId", "==", userId)
      .where("discountId", "==", doc.id)
      .limit(1)
      .get();

    if (!userUsed.empty) {
      return res.status(400).json({ error: "คุณเคยใช้โค้ดนี้แล้ว" });
    }

    // ตรวจสอบจำนวนครั้งที่ใช้
    if (data.usedCount >= data.maxUses) {
      await doc.ref.update({ status: "expired" });
      return res.status(400).json({ error: "โค้ดใช้ครบจำนวนครั้งแล้ว" });
    }

    // ใช้โค้ดสำเร็จ -> เพิ่ม usedCount
    await doc.ref.update({
      usedCount: data.usedCount + 1,
      status: (data.usedCount + 1 >= data.maxUses ? "expired" : "active")
    });

    // บันทึกว่าผู้ใช้ใช้โค้ดแล้ว
    await db.collection("usedDiscounts").add({
      userId,
      discountId: doc.id,
      usedAt: new Date().toISOString()
    });

    res.json({ message: "ใช้โค้ดสำเร็จ", discountAmount: data.discountAmount });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการใช้โค้ด" });
  }
});

router.post("/validate", async (req, res) => {
  try {
    const { code, totalAmount } = req.body;
    if (!code) return res.status(400).json({ error: "กรุณากรอกโค้ด" });

    const snapshot = await db.collection("discountCodes")
      .where("code", "==", code)
      .limit(1)
      .get();

    if (snapshot.empty) return res.status(404).json({ error: "โค้ดไม่ถูกต้อง" });

    const doc = snapshot.docs[0];
    const data = doc.data() as any;

    if (data.status !== "active") return res.status(400).json({ error: "โค้ดหมดอายุ" });
    if (totalAmount < data.minTotal) return res.status(400).json({ error: `ต้องซื้อขั้นต่ำ ${data.minTotal} บาท` });

    // ส่งกลับส่วนลด แต่ไม่อัปเดต usedCount
    res.json({ discountAmount: data.discountAmount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "เกิดข้อผิดพลาด" });
  }
});


export default router;
