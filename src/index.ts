import express from "express";
import userRouter from "./routes/user";
import cors from "cors";

const app = express();
app.use(express.json());

// ตรวจสอบ environment
const isProduction = process.env.NODE_ENV === "production";

// ตั้งค่า CORS
app.use(cors({
  origin: isProduction
    ? "*" // สำหรับ production อนุญาตทุก domain หรือใส่ domain จริงของคุณ
    : "http://localhost:4200", // สำหรับ dev
  credentials: true
}));

// Route ทดสอบ
app.get("/", (req, res) => {
  res.send("Hello GameShop");
});

app.use("/users", userRouter);

// ใช้พอร์ตจาก environment variable ของ Render หรือ fallback เป็น 3000 สำหรับ local
const PORT = Number(process.env.PORT) || 3000;
// สำหรับ Render ต้อง bind กับ 0.0.0.0
const HOST = isProduction ? "0.0.0.0" : "localhost";

app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
  console.log(`Environment: ${isProduction ? "Production" : "Development"}`);
});
