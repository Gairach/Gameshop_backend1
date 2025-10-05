"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const user_1 = __importDefault(require("./routes/user"));
const cors_1 = __importDefault(require("cors"));
const app = (0, express_1.default)();
app.use(express_1.default.json());
// อนุญาตทุก origin (สำหรับ dev)
app.use((0, cors_1.default)({
    origin: "http://localhost:4200",
    credentials: true
}));
app.use("/users", user_1.default);
const PORT = 3000;
const HOST = "localhost"; // เปลี่ยนจาก 0.0.0.0
app.listen(PORT, HOST, () => {
    console.log(`🚀 Server running on http://${HOST}:${PORT}`);
});
