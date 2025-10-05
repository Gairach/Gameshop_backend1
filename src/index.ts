import express from "express";
import userRouter from "./routes/user";
import cors from "cors";

const app = express();
app.use(express.json());

// อนุญาตทุก origin (สำหรับ dev)
app.use(cors({
  origin: "http://localhost:4200",
  credentials: true
}));

app.use("/users", userRouter);

const PORT = 3000;
const HOST = "localhost"; // เปลี่ยนจาก 0.0.0.0
app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
});
