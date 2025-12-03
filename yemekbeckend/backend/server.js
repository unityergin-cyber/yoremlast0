const express = require("express");
require("dotenv").config();
const db = require("./config/db");
const cors = require("cors");
const config = require("./config/config");
const authRoutes = require("./routes/authRoutes");
const addressRoute = require("./routes/addressRoute");
const productRouter = require("./routes/productRoutes");
const categoryRouter = require("./routes/categoryRoute");
const ordersRouter = require("./routes/orderRoute");
const couponRouter = require("./routes/couponRoute");
const staffRouter = require("./routes/staffRoute");
const path = require("path");
const restaurantHoursRouter = require("./routes/restaurantHoursRoute");
const sliderRouter = require("./routes/sliderRoute");
const testRoutes = require("./routes/testRoutes");
const locationRouter = require("./routes/locationRoute");

// ✅ SADECE BİR KEZ IMPORT EDİN - './routes/settings' kullanın (mevcut dosya)
const settingsRoutes = require('./routes/settings');

const app = express();

// CORS ayarları
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      
      const allowedOrigins = [
        "http://ec2-3-91-81-174.compute-1.amazonaws.com",
        "http://localhost:5173",
        "https://reliable-dusk-ceab1f.netlify.app",
        /^http:\/\/192\.168\.\d+\.\d+:\d+$/,
        /^http:\/\/localhost:\d+$/,
      ];
      
      const isAllowed = allowedOrigins.some(allowed => {
        if (allowed instanceof RegExp) {
          return allowed.test(origin);
        }
        return allowed === origin;
      });
      
      if (isAllowed) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// JSON ayrıştırma
app.use(express.json());

// Uploads klasörünün varlığını kontrol et ve oluştur
const fs = require("fs");
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log("📁 uploads klasörü oluşturuldu");
}

// Statik dosyalar
app.use("/uploads", express.static(uploadsDir, {
  etag: true,
  lastModified: true,
  maxAge: 86400000,
}));

// Uploads klasörü debug endpoint
app.get("/api/uploads/check", (req, res) => {
  const files = fs.readdirSync(uploadsDir);
  res.json({
    uploadsDir: uploadsDir,
    fileCount: files.length,
    files: files.slice(0, 10)
  });
});

// ✅ ROTALAR - HER BİRİ TEK BİR KEZ
app.use("/api/locations", locationRouter);
app.use("/api/settings", settingsRoutes); // ✅ Sadece bir kez
app.use("/auth", authRoutes);
app.use("/api/addresses", addressRoute);
app.use("/api/products", productRouter);
app.use("/api/categories", categoryRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/coupon", couponRouter);
app.use("/api/staff", staffRouter);
app.use("/api/sliders", sliderRouter);
app.use("/api/test", testRoutes);
app.use("/api/restaurant-hours", restaurantHoursRouter);

// Ana sayfa
app.get("/", (req, res) => {
  db.query("SELECT 'Bağlantı başarılı!' AS mesaj", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results[0]);
  });
});

// Sunucuyu başlat
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server ${PORT} portunda çalışıyor...`);
  console.log("MySQL bağlantısı başarılı!");
});