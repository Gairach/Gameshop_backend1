import express, { Request, Response } from "express";
import { db } from "../firebase";
import { upload } from "../middleware/upload";
const router = express.Router();

// เพิ่มเกมใหม่
router.post("/add", upload.single("image"), async (req: Request, res: Response) => {
  try {
    const { title, description, price, category } = req.body;
    if (!title || !price) return res.status(400).json({ error: "กรุณากรอกข้อมูลให้ครบถ้วน" });

    const imageUrl = req.file?.path || "";

    const newGame = {
      title,
      description: description || "",
      price: Number(price),
      category: category || "Other",
      image: imageUrl,
      createdAt: new Date().toISOString(),
    };

    const docRef = await db.collection("games").add(newGame);
    res.status(201).json({ message: "เพิ่มเกมสำเร็จ", id: docRef.id, game: newGame });
  } catch (error) {
    console.error("Error adding game:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการเพิ่มเกม" });
  }
});

// อัปเดตเกม
router.put('/:id', upload.single('image'), async (req: Request, res: Response) => {
  const id = req.params.id;
  const { title, description, price, category } = req.body;
  const image = req.file?.path; // ถ้ามีไฟล์ใหม่ จะได้ URL จาก Cloudinary

  if (!title || !price || !category) {
    return res.status(400).json({ error: 'ข้อมูลไม่ครบถ้วน' });
  }

  try {
    const gameRef = db.collection('games').doc(id);
    const doc = await gameRef.get();

    if (!doc.exists) return res.status(404).json({ error: 'Game not found' });

    await gameRef.update({
      title,
      description: description || '',
      price: Number(price),
      category,
      image: image || doc.data()?.image || '', // ถ้าไม่มี image ให้ใช้เดิม
      updatedAt: new Date().toISOString(),
    });

    const updatedGame = await gameRef.get();
    res.json({ message: 'อัปเดตเกมเรียบร้อย', game: updatedGame.data() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์' });
  }
});

// DELETE เกมตาม ID
router.delete('/:id', async (req: Request, res: Response) => {
  const id = req.params.id;

  try {
    const gameRef = db.collection('games').doc(id);
    const doc = await gameRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Game not found' });
    }

    // ลบเกม
    await gameRef.delete();

    res.json({ message: 'ลบเกมเรียบร้อย' });
  } catch (err) {
    console.error('❌ Error deleting game:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์' });
  }
});
router.get("/topselling", async (req, res) => {
  try {
    const snapshot = await db.collection("games")
      .orderBy("salesCount", "desc")  // ต้องมี field salesCount
      .limit(10)
      .get();

    const topGames = snapshot.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as any)
    }));

    res.json(topGames);
  } catch (err) {
    console.error("โหลดเกมขายดีล้มเหลว:", err);
    res.status(500).json({ error: "โหลดเกมขายดีล้มเหลว" });
  }
});


// ดึงเกมตาม id (วางก่อน /)
router.get("/:id", async (req, res) => {
  try {
    const doc = await db.collection("games").doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: "Game not found" });
    res.status(200).json({ id: doc.id, ...doc.data() });
  } catch (err) {
    res.status(500).json({ error: "Cannot fetch game" });
  }
});

// ดึงเกมทั้งหมด (วางหลัง /:id)
router.get("/", async (req: Request, res: Response) => {
  try {
    const snapshot = await db.collection("games").orderBy("createdAt", "desc").get();
    const games = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(games);
  } catch (error) {
    console.error("Error fetching games:", error);
    res.status(500).json({ error: "ไม่สามารถดึงข้อมูลเกมได้" });
  }
});




export default router;
