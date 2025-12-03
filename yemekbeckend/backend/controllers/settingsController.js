const db = require("../config/db");

// Genel ayarları getir (Admin için)
exports.getGeneralSettings = (req, res) => {
  try {
    const query = `
      SELECT setting_key, setting_value 
      FROM settings 
      WHERE setting_key IN ('product_options_enabled', 'address_description_enabled')
    `;
    
    db.query(query, (err, results) => {
      if (err) {
        console.error("Ayarlar getirme hatası:", err);
        return res.status(500).json({ 
          status: 'error',
          error: "Ayarlar alınamadı"
        });
      }

      // Sonuçları objeye çevir
      const settings = {};
      results.forEach(row => {
        settings[row.setting_key] = row.setting_value === "1" || row.setting_value === 1;
      });

      // Varsayılan değerler
      const defaultSettings = {
        product_options_enabled: false,
        address_description_enabled: false
      };

      res.status(200).json({
        status: 'success',
        data: { ...defaultSettings, ...settings }
      });
    });
  } catch (error) {
    console.error("Ayarlar getirme hatası:", error);
    res.status(500).json({ 
      status: 'error',
      error: "Ayarlar alınamadı"
    });
  }
};

// Genel ayarları güncelle (Admin için)
exports.updateGeneralSettings = (req, res) => {
  try {
    const { address_description_enabled, product_options_enabled } = req.body;

    const settingsToUpdate = [];
    
    if (address_description_enabled !== undefined) {
      settingsToUpdate.push({
        key: 'address_description_enabled',
        value: address_description_enabled ? "1" : "0"
      });
    }
    
    if (product_options_enabled !== undefined) {
      settingsToUpdate.push({
        key: "product_options_enabled",
        value: product_options_enabled ? "1" : "0"
      });
    }

    if (settingsToUpdate.length === 0) {
      return res.status(400).json({
        status: "error",
        error: "Güncellenecek ayar bulunamadı"
      });
    }

    const promises = settingsToUpdate.map(setting => {
      return new Promise((resolve, reject) => {
        const query = `
          INSERT INTO settings (setting_key, setting_value) 
          VALUES (?, ?)
          ON DUPLICATE KEY UPDATE setting_value = ?
        `;
        
        db.query(query, [setting.key, setting.value, setting.value], (err) => {
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
  } catch (error) {
    console.error("Ayar güncelleme hatası:", error);
    res.status(500).json({ 
      status: 'error',
      error: "Ayar güncellenemedi"
    });
  }
};

// Mobil uygulama için basit endpoint
exports.getAddressDescriptionEnabled = (req, res) => {
  try {
    const query = `
      SELECT setting_value 
      FROM settings 
      WHERE setting_key = 'address_description_enabled'
    `;
    
    db.query(query, (err, results) => {
      if (err) {
        console.error("Ayar getirme hatası:", err);
        return res.status(500).json({ 
          enabled: false,
          status: "error",
          message: "Ayar alınamadı"
        });
      }

      const enabled = results.length > 0 && 
                     (results[0].setting_value === "1" || results[0].setting_value === 1);
      
      res.json({ enabled });
    });
  } catch (error) {
    console.error("Ayar getirme hatası:", error);
    res.status(500).json({ 
      enabled: false,
      status: "error",
      message: "Ayar alınamadı"
    });
  }
};

module.exports = {
  getGeneralSettings: exports.getGeneralSettings,
  updateGeneralSettings: exports.updateGeneralSettings,
  getAddressDescriptionEnabled: exports.getAddressDescriptionEnabled
};