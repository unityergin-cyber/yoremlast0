const db = require("../config/db");
const moment = require("moment");

// Tüm çalışma saatlerini getir
const getAllWorkingHours = (req, res) => {
  const query = `
    SELECT 
      id,
      day_of_week,
      opening_time,
      closing_time,
      is_closed
    FROM 
      restaurant_working_hours
    ORDER BY 
      day_of_week
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error("Çalışma saatleri sorgulama hatası:", err);
      return res.status(500).json({ error: "Veritabanı hatası" });
    }

    res.status(200).json({
      status: "success",
      data: results
    });
  });
};

// Çalışma saatlerini güncelle (admin için)
const updateWorkingHours = (req, res) => {
  const { id } = req.params;
  const { opening_time, closing_time, is_closed } = req.body;

  db.query(
    "SELECT * FROM restaurant_working_hours WHERE id = ?",
    [id],
    (err, results) => {
      if (err) {
        console.error("Çalışma saati sorgulama hatası:", err);
        return res.status(500).json({ error: "Veritabanı hatası" });
      }

      if (results.length === 0) {
        return res.status(404).json({ error: "Çalışma saati bulunamadı" });
      }

      const query = `
        UPDATE restaurant_working_hours 
        SET 
          opening_time = ?,
          closing_time = ?,
          is_closed = ?,
          updated_at = ?
        WHERE 
          id = ?
      `;

      const values = [
        opening_time || results[0].opening_time,
        closing_time || results[0].closing_time,
        is_closed !== undefined ? is_closed : results[0].is_closed,
        moment().toDate(),
        id
      ];

      db.query(query, values, (err) => {
        if (err) {
          console.error("Çalışma saati güncelleme hatası:", err);
          return res.status(500).json({ error: "Çalışma saati güncellenemedi." });
        }

        res.status(200).json({
          status: "success",
          message: "Çalışma saati başarıyla güncellendi."
        });
      });
    }
  );
};

// Şu anki çalışma durumunu kontrol et (açık mı kapalı mı)
const checkRestaurantOpen = (req, res) => {
  // 1. Önce ayarı kontrol et
  db.query(
    "SELECT setting_value FROM settings WHERE setting_key = 'working_hours_check_enabled'",
    (err, settingsResults = []) => {
      if (err) {
        console.error("Ayar sorgulama hatası:", err);
      }

      const settingValue = settingsResults?.[0]?.setting_value;
      const isCheckEnabled =
        settingValue === undefined
          ? true
          : settingValue === "1" ||
            settingValue === 1 ||
            settingValue === true ||
            settingValue === "true";

      // Eğer ayar kapalıysa, her zaman açık olarak kabul et
      if (!isCheckEnabled) {
        console.log("Çalışma saati kontrolü devre dışı. Restoran açık kabul ediliyor.");
        return res.status(200).json({
          status: "success",
          message: "Çalışma saati kontrolü devre dışı.",
          is_open: true,
        });
      }

      // 2. Ayar açıksa, normal kontrolü yap
      const now = new Date();
      const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
      const turkeyTime = new Date(utcMs + 3 * 60 * 60 * 1000);
      const currentDay = turkeyTime.getDay();
      const currentTimeInMinutes = turkeyTime.getHours() * 60 + turkeyTime.getMinutes();

      const query = `
        SELECT opening_time, closing_time, is_closed
        FROM restaurant_working_hours
        WHERE day_of_week = ?
      `;

      db.query(query, [currentDay], (err, results) => {
        if (err) {
          console.error("Çalışma saati sorgulama hatası:", err);
          return res.status(500).json({ error: "Veritabanı hatası" });
        }

        if (results.length === 0) {
          return res.status(404).json({ 
            status: "error",
            message: "Bu gün için çalışma saati bilgisi bulunamadı",
            is_open: false
          });
        }

        const workingHours = results[0];
        
        if (workingHours.is_closed) {
          return res.status(200).json({
            status: "success",
            message: "Restoran bugün kapalı",
            is_open: false,
            working_hours: workingHours
          });
        }

        const openingTimeParts = workingHours.opening_time.split(":");
        const openingTimeInMinutes = parseInt(openingTimeParts[0]) * 60 + parseInt(openingTimeParts[1]);

        const closingTimeParts = workingHours.closing_time.split(":");
        const closingTimeInMinutes = parseInt(closingTimeParts[0]) * 60 + parseInt(closingTimeParts[1]);

        let isOpen = false;
        if (openingTimeInMinutes < closingTimeInMinutes) {
          isOpen = currentTimeInMinutes >= openingTimeInMinutes && currentTimeInMinutes <= closingTimeInMinutes;
        } else {
          isOpen = currentTimeInMinutes >= openingTimeInMinutes || currentTimeInMinutes <= closingTimeInMinutes;
        }

        res.status(200).json({
          status: "success",
          message: isOpen ? "Restoran şu anda açık" : "Restoran şu anda kapalı",
          is_open: isOpen,
          working_hours: workingHours,
        });
      });
    }
  );
};

module.exports = {
  getAllWorkingHours,
  updateWorkingHours,
  checkRestaurantOpen
};
