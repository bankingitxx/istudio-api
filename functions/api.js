const express = require('express');
const serverless = require('serverless-http');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// อนุญาตให้ Google Script ยิงเข้ามาได้
app.use(cors());
app.use(express.json());

// --- 🔴 ส่วนสำคัญ: ตั้งค่า Database แบบ Serverless ---
let conn = null;

const connectDB = async () => {
  if (conn == null) {
    console.log("Creating new DB connection...");
    conn = mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000
    }).then(() => mongoose);
    await conn;
  }
  console.log("Using cached DB connection");
  return conn;
};
// ----------------------------------------------------

// สร้าง Schema ให้ตรงกับข้อมูล Stock
const TransactionSchema = new mongoose.Schema({
  officer: String,
  remark: String,
  items: [{
    code: String,
    name: String,
    qty: Number,
    remark: String
  }],
  timestamp: { type: Date, default: Date.now },
  source: String
});

// สร้างตัวแปร Model รอไว้
let TransactionModel;

// สร้าง Router
const router = express.Router();

// Route: เช็คว่า API ทำงานไหม (GET /)
router.get('/', (req, res) => {
  res.json({ status: "ok", message: "iStudio Stock API is running on Netlify!" });
});

// Route: บันทึกข้อมูล (POST /save-stock)
router.post('/save-stock', async (req, res) => {
  try {
    // 1. เชื่อมต่อ DB
    await connectDB();
    
    // 2. Initialize Model (กัน Error ถ้าเรียกซ้ำ)
    if (!TransactionModel) {
        TransactionModel = mongoose.model('StockTransaction', TransactionSchema);
    } else {
        TransactionModel = mongoose.model('StockTransaction');
    }

    // 3. รับข้อมูลและบันทึก
    const data = req.body;
    const newTransaction = new TransactionModel({
      officer: data.officer,
      remark: data.remark,
      items: data.items,
      source: "NetlifyFunction"
    });

    const savedDoc = await newTransaction.save();
    
    console.log("Saved Doc ID:", savedDoc._id);
    res.status(200).json({ success: true, id: savedDoc._id });

  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// เชื่อม Router เข้ากับ App
// ต้องระบุ path /.netlify/functions/api เพราะเป็น Default ของ Netlify
app.use('/.netlify/functions/api', router);

// Export Handler (ไม่ต้องใช้ app.listen)
module.exports.handler = serverless(app);