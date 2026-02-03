// 1. ส่วน Import Library (ห้ามลบ!)
const express = require('express');
const serverless = require('serverless-http');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// อนุญาตให้ Google Script ยิงเข้ามาได้
app.use(cors());
app.use(express.json());

// 2. ส่วนเชื่อมต่อ Database แบบ Cached (สำหรับ Serverless)
let conn = null;

const connectDB = async () => {
  if (conn == null) {
    console.log("Creating new DB connection...");
    // เชื่อมต่อ MongoDB
    conn = mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000
    }).then(() => mongoose);
    
    await conn;
  }
  console.log("Using cached DB connection");
  return conn;
};

// 3. สร้าง Schema
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

// ประกาศตัวแปร Model รอไว้
let TransactionModel;

// 4. สร้าง Router
const router = express.Router();

// Route: เช็คว่า API ทำงานไหม
router.get('/', (req, res) => {
  res.json({ 
    status: "ok", 
    message: "iStudio Stock API is running!",
    debug_path: req.path 
  });
});

// Route: บันทึกข้อมูล
router.post('/save-stock', async (req, res) => {
  try {
    // เชื่อมต่อ DB
    await connectDB();
    
    // Initialize Model
    if (!TransactionModel) {
        TransactionModel = mongoose.model('StockTransaction', TransactionSchema);
    } else {
        TransactionModel = mongoose.model('StockTransaction');
    }

    // รับข้อมูลและบันทึก
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

// 5. จัดการ Route ให้รองรับทั้ง Netlify และ Express (แก้ปัญหา Cannot GET)
app.use('/.netlify/functions/api', router);
app.use('/api', router);
app.use('/', router);

// Export Handler
module.exports.handler = serverless(app);