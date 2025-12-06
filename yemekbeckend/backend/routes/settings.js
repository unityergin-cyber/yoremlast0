const express = require("express");
const router = express.Router();
const db = require("../config/db");
const authenticateAdmin = require("../middleware/authAdmin"); // ✅ DEĞIŞTI

// ========================================
// GENEL AYARLAR
// ========================================

// Tüm genel ayarları getir (Admin kontrolü ile)
router.get("/general", authenticateAdmin, (req, res) => {
  // ✅ authenticateAdmin middleware zaten kontrol ediyor, req.user.role = admin
  
  const query = `
    SELECT setting_key, setting_value 
    FROM settings 
    WHERE setting_key IN ('product_options_enabled', 'address_description_enabled', 'working_hours_check_enabled')
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error("Ayarlar getirme hatası:", err);
      return res.status(500).json({
        status: "error",
        error: "Ayarlar getirilemedi"
      });
    }

    // Sonuçları objeye çevir
    const settings = {};
    results.forEach(row => {
      // "1" string değerini boolean'a çevir
      settings[row.setting_key] = row.setting_value === "1" || row.setting_value === 1;
    });

    // Varsayılan değerler ekle (eğer veritabanında yoksa)
    const defaultSettings = {
      product_options_enabled: false,
      address_description_enabled: false,
      working_hours_check_enabled: true
    };

    res.json({
      status: "success",
      data: { ...defaultSettings, ...settings }
    });
  });
});

// Genel ayarları güncelle (Admin kontrolü ile)
router.put("/general", authenticateAdmin, (req, res) => {
  // ✅ authenticateAdmin middleware zaten kontrol ediyor
  
  const { product_options_enabled, address_description_enabled, working_hours_check_enabled } = req.body;

  // Güncellenecek ayarlar
  const settingsToUpdate = [];
  
  if (product_options_enabled !== undefined) {
    settingsToUpdate.push({
      key: "product_options_enabled",
      value: product_options_enabled ? "1" : "0"
    });
  }
  
  if (address_description_enabled !== undefined) {
    settingsToUpdate.push({
      key: 'address_description_enabled',
      value: address_description_enabled ? "1" : "0"
    });
  }

  if (working_hours_check_enabled !== undefined) {
    settingsToUpdate.push({
      key: 'working_hours_check_enabled',
      value: working_hours_check_enabled ? "1" : "0"
    });
  }

  if (settingsToUpdate.length === 0) {
    return res.status(400).json({
      status: "error",
      error: "Güncellenecek ayar bulunamadı"
    });
  }

  // Her ayar için INSERT ... ON DUPLICATE KEY UPDATE sorgusu
  const promises = settingsToUpdate.map(setting => {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO settings (setting_key, setting_value) 
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE setting_value = ?
      `;
      
      db.query(query, [setting.key, setting.value, setting.value], (err, result) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });

  Promise.all(promises)
    .then(() => {
      res.json({
        status: "success",
        message: "Ayarlar başarıyla kaydedildi",
        data: req.body
      });
    })
    .catch(err => {
      console.error("Ayar güncelleme hatası:", err);
      res.status(500).json({
        status: "error",
        error: "Ayarlar güncellenirken bir hata oluştu"
      });
    });
});

// ========================================
// TEKİL AYARLAR (MOBİL UYGULAMA İÇİN - PUBLIC)
// ========================================

// Adres tarif ayarını getir (Herkes erişebilir - mobil uygulama için)
// ✅ BU ENDPOINT KORUMASIZ KALACAK - Mobil uygulama için public olması gerek
router.get("/address-description-enabled", (req, res) => {
  const query = `
    SELECT setting_value 
    FROM settings 
    WHERE setting_key = 'address_description_enabled'
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error("Ayar getirme hatası:", err);
      return res.status(500).json({
        status: "error",
        message: "Ayar getirilemedi",
        enabled: false
      });
    }

    const enabled = results.length > 0 && (results[0].setting_value === "1" || results[0].setting_value === 1);
    res.json({ 
      status: "success",
      enabled 
    });
  });
});

// Admin: Adres tarif ayarını güncelle (Sadece admin)
router.put("/address-description-enabled", authenticateAdmin, (req, res) => {
  // ✅ authenticateAdmin middleware zaten kontrol ediyor
  
  const { enabled } = req.body;
  
  const query = `
    INSERT INTO settings (setting_key, setting_value) 
    VALUES ('address_description_enabled', ?)
    ON DUPLICATE KEY UPDATE setting_value = ?
  `;

  db.query(query, [enabled ? "1" : "0", enabled ? "1" : "0"], (err) => {
    if (err) {
      console.error("Ayar güncelleme hatası:", err);
      return res.status(500).json({
        status: "error",
        message: "Ayar güncellenemedi"
      });
    }

    res.json({
      status: "success",
      message: "Ayar güncellendi",
      enabled: enabled
    });
  });
});

module.exports = router;
