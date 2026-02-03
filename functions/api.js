// --- 1. ส่วน Import (สำคัญมาก ห้ามหาย!) ---
const express = require('express');
const serverless = require('serverless-http');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// --- 2. Config Middleware ---
app.use(cors());
app.use(express.json());

// --- 3. Database Connection (Cached) ---
let conn = null;

const connectDB = async () => {
  if (conn == null) {
    console.log("🔄 Creating new DB connection...");
    conn = mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000
    }).then(() => mongoose);
    await conn;
  }
  console.log("✅ Using cached DB connection");
  return conn;
};

// --- 4. Schema Definition ---
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

let TransactionModel;

// --- 5. Routing ---
const router = express.Router();

// Route: Check Status
router.get('/', (req, res) => {
  res.json({ status: "ok", message: "API is running!", time: new Date() });
});

// Route: Save Data
router.post('/save-stock', async (req, res) => {
  try {
    await connectDB();
    
    if (!TransactionModel) {
        TransactionModel = mongoose.model('StockTransaction', TransactionSchema);
    } else {
        TransactionModel = mongoose.model('StockTransaction');
    }

    const data = req.body;
    console.log("📥 Receiving data:", JSON.stringify(data)); // Log ดูข้อมูลที่เข้า

    const newTransaction = new TransactionModel({
      officer: data.officer,
      remark: data.remark,
      items: data.items,
      source: "NetlifyFunction"
    });

    const savedDoc = await newTransaction.save();
    console.log("✅ Saved ID:", savedDoc._id);
    
    res.status(200).json({ success: true, id: savedDoc._id });

  } catch (error) {
    console.error("❌ Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- 6. Export Handler (แก้ path ให้ครอบคลุม) ---
app.use('/.netlify/functions/api', router);
app.use('/api', router);
app.use('/', router);

module.exports.handler = serverless(app);