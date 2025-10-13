import express from "express";
import { db } from "../firebase"; // ต้องเชื่อมกับ firebase config
const router = express.Router();

// เพิ่มเกมลงในรถเข็น (ตรวจสอบว่ามีอยู่แล้ว)
router.post("/add", async (req, res) => {
  try {
    const { userId, gameId, title, price, image } = req.body;

    if (!userId) return res.status(400).json({ error: "ไม่พบ userId" });

    // ตรวจสอบว่าผู้ใช้มีเกมนี้แล้วในคลัง
    const ownedSnapshot = await db.collection("ownedGames")
      .where("userId", "==", userId)
      .where("gameId", "==", gameId)
      .get();

    if (!ownedSnapshot.empty) {
      return res.status(400).json({ error: "คุณมีเกมนี้อยู่แล้วในคลัง" });
    }

    // ตรวจสอบว่าเกมอยู่ในตะกร้าแล้ว
    const cartSnapshot = await db.collection("carts")
      .where("userId", "==", userId)
      .where("gameId", "==", gameId)
      .get();

    if (!cartSnapshot.empty) {
      return res.status(400).json({ error: "เกมนี้อยู่ในตะกร้าแล้ว" });
    }

    const cartItem = { userId, gameId, title, price, image, createdAt: new Date() };
    const ref = await db.collection("carts").add(cartItem);

    res.status(200).json({ message: "เพิ่มสำเร็จ", id: ref.id, ...cartItem });
    console.log("🛒 เพิ่มสินค้าลงตะกร้าโดย:", userId);

  } catch (error) {
    console.error("❌ เพิ่มรถเข็นล้มเหลว:", error);
    res.status(500).json({ error: "เพิ่มรถเข็นล้มเหลว" });
  }
});

// ดึงข้อมูลรถเข็นของ user
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const snapshot = await db.collection("carts").where("userId", "==", userId).get();

    const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(items);

  } catch (error) {
    console.error("❌ ดึงรถเข็นล้มเหลว:", error);
    res.status(500).json({ error: "ดึงข้อมูลรถเข็นล้มเหลว" });
  }
});

// ลบสินค้าออกจากรถเข็น
router.delete("/:cartId", async (req, res) => {
  try {
    const { cartId } = req.params;
    await db.collection("carts").doc(cartId).delete();
    res.status(200).json({ message: "ลบสำเร็จ" });
  } catch (error) {
    res.status(500).json({ error: "ลบรถเข็นล้มเหลว" });
  }
});

// Checkout (ตรวจสอบเกมซ้ำ, หักเงิน, ย้ายไป ownedGames)
router.post("/checkout", async (req, res) => {
  try {
    const { userId, totalAmount, discountCode } = req.body;
    if (!userId || !totalAmount)
      return res.status(400).json({ error: "ข้อมูลไม่ครบถ้วน" });

    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();
    if (!userDoc.exists) return res.status(404).json({ error: "User not found" });

    let discountAmount = 0;
    let discountDoc: any = null;

    // ✅ ตรวจสอบโค้ดส่วนลด (ถ้ามี)
    if (discountCode) {
      const discountSnap = await db.collection("discountCodes")
        .where("code", "==", discountCode)
        .limit(1)
        .get();

      if (discountSnap.empty)
        return res.status(404).json({ error: "โค้ดไม่ถูกต้อง" });

      discountDoc = discountSnap.docs[0];
      const data = discountDoc.data() as any;

      if (data.status !== "active")
        return res.status(400).json({ error: "โค้ดหมดอายุ" });
      if (totalAmount < data.minTotal)
        return res.status(400).json({ error: `ต้องซื้อขั้นต่ำ ${data.minTotal} บาท` });
      if (data.usedCount >= data.maxUses) {
        await discountDoc.ref.update({ status: "expired" });
        return res.status(400).json({ error: "โค้ดใช้ครบจำนวนครั้งแล้ว" });
      }

      discountAmount = data.discountAmount;
    }

    // ✅ ดึงสินค้าในรถเข็น
    const cartSnapshot = await db.collection("carts").where("userId", "==", userId).get();
    const cartItems = cartSnapshot.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as any)
    }));

    if (cartItems.length === 0)
      return res.status(400).json({ error: "ไม่มีสินค้าในรถเข็น" });

    const batch = db.batch();
    const ownedGamesRef = db.collection("ownedGames");
    const historyRef = db.collection("history");
    const gamesRef = db.collection("games");
    const usedDiscountRef = db.collection("usedDiscounts");

    // ✅ ป้องกันยอดติดลบ
    let finalAmount = totalAmount - discountAmount;
    if (finalAmount < 0) finalAmount = 0;

    const wallet = userDoc.data()?.wallet || 0;
    if (wallet < finalAmount)
      return res.status(400).json({ error: "ยอดเงินไม่เพียงพอ" });

    // ✅ เพิ่มเกมทั้งหมดลง ownedGames
    cartItems.forEach(item => {
      const newDoc = ownedGamesRef.doc();
      batch.set(newDoc, {
        userId,
        gameId: item.gameId,
        title: item.title,
        price: item.price,
        image: item.image,
        purchasedAt: new Date().toISOString(),
      });

      // ลบออกจากรถเข็น
      batch.delete(db.collection("carts").doc(item.id));

      // เพิ่มยอดขาย
      const gameDocRef = gamesRef.doc(item.gameId);
      batch.update(gameDocRef, { salesCount: (item.salesCount || 0) + 1 });
    });

    // ✅ สร้างประวัติเดียวรวมทุกเกม
    const purchaseDetail = cartItems.map(i => i.title).join(", ");
    batch.set(historyRef.doc(), {
      userId,
      type: "purchase",
      detail: `ซื้อเกม: ${purchaseDetail}`,
      amount: -finalAmount, // ✅ แสดงจำนวนเงินเป็นลบ (เงินออก)
      discount: discountAmount,
      totalAmount,
      finalAmount,
      games: cartItems.map(i => ({
        gameId: i.gameId,
        title: i.title,
        price: i.price
      })),
      createdAt: new Date().toISOString(),
    });

    // ✅ อัปเดต wallet
    batch.update(userRef, { wallet: wallet - finalAmount });
    

    // ✅ อัปเดตสถานะโค้ดส่วนลด
    if (discountDoc) {
      const data = discountDoc.data() as any;
      batch.update(discountDoc.ref, {
        usedCount: data.usedCount + 1,
        status: (data.usedCount + 1 >= data.maxUses ? "expired" : "active")
      });
      batch.set(usedDiscountRef.doc(), {
        userId,
        discountId: discountDoc.id,
        discountCode,
        usedAt: new Date().toISOString()
      });
    }

    await batch.commit();

    res.json({ 
      message: "ชำระเงินสำเร็จ", 
      discountAmount, 
      totalAmount, 
      finalAmount,
      newWallet: wallet - finalAmount
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการชำระเงิน" });
  }
});




export default router;
