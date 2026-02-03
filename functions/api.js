// ... (โค้ดส่วน connectDB และ Schema เหมือนเดิมด้านบน) ...

const router = express.Router();

// Route: เช็คว่า API ทำงานไหม (GET /)
router.get('/', (req, res) => {
  res.json({ 
    status: "ok", 
    message: "iStudio Stock API is running!",
    debug_path: req.path // ส่ง path กลับมาดูว่า Express เห็นเป็นอะไร
  });
});

// Route: บันทึกข้อมูล (POST /save-stock)
router.post('/save-stock', async (req, res) => {
  // ... (โค้ดบันทึกเหมือนเดิม) ...
  // ใส่แค่ Logic การบันทึก ไม่ต้องแก้
  try {
    await connectDB();
    if (!TransactionModel) {
        TransactionModel = mongoose.model('StockTransaction', TransactionSchema);
    } else {
        TransactionModel = mongoose.model('StockTransaction');
    }
    const data = req.body;
    const newTransaction = new TransactionModel({
      officer: data.officer,
      remark: data.remark,
      items: data.items,
      source: "NetlifyFunction"
    });
    const savedDoc = await newTransaction.save();
    res.status(200).json({ success: true, id: savedDoc._id });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- 🔴 ส่วนที่แก้ไขสำคัญที่สุด 🔴 ---

// ให้ Router ทำงานไม่ว่าจะเรียกมาด้วยชื่อไหน
app.use('/.netlify/functions/api', router); // กรณีเรียกตรง หรือ Redirect แบบ Full Path
app.use('/api', router);                    // กรณี Redirect ตัด Path มา
app.use('/', router);                       // กรณี Fallback สุดท้าย (เผื่อ path ว่าง)

module.exports.handler = serverless(app);