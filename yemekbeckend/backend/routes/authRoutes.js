const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");
const db = require("../config/db");

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/guest-login", authController.guestLogin);
router.post("/verify-code", authController.verifyCode);
router.get("/users", authController.getAllUsers);
router.post("/logout", authMiddleware, authController.logout);

router.get("/profile", authMiddleware, (req, res) => {
    try {
        const query = "SELECT id, full_name, phone, email FROM users WHERE id = ?";
        
        db.query(query, [req.user.id], (err, results) => {
            if (err) {
                console.error("Profil sorgu hatası:", err);
                return res.status(500).json({ error: "Profil bilgileri alınamadı" });
            }

            if (results.length === 0) {
                return res.status(404).json({ error: "Kullanıcı bulunamadı" });
            }

            const kullanici = results[0];
            
            res.json({
                id: kullanici.id,
                full_name: kullanici.full_name,
                phone: kullanici.phone,
                email: kullanici.email
            });
        });
    } catch (error) {
        console.error("Profil endpoint hatası:", error);
        res.status(500).json({ error: "Sunucu hatası" });
    }
});

// Kullanıcı hesabını silme
router.delete("/delete-account", authMiddleware, async (req, res) => {
    console.log("🔴 Delete account endpoint çağrıldı");
    console.log("🔴 User ID:", req.user?.id);
    
    try {
        const userId = req.user.id;
        
        if (!userId) {
            return res.status(400).json({ 
                success: false,
                message: 'Kullanıcı ID bulunamadı' 
            });
        }
        
        // Önce kullanıcının telefon numarasını al (verification_codes için gerekli)
        const userResult = await new Promise((resolve, reject) => {
            db.query('SELECT phone FROM users WHERE id = ?', [userId], (err, results) => {
                if (err) reject(err);
                else resolve(results);
            });
        });

        if (userResult.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: 'Kullanıcı bulunamadı' 
            });
        }

        const userPhone = userResult[0].phone;
        
        console.log("🔴 Silme işlemi başlıyor...");
        
        // İlişkili verileri sil (hataları görmezden gel - tablo/sütun yoksa devam et)
        await new Promise((resolve) => {
            db.query(`DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE user_id = ?)`, [userId], (err) => {
                if (err) console.warn("⚠️ order_items silme hatası (görmezden geliniyor):", err.message);
                resolve();
            });
        });

        await new Promise((resolve) => {
            db.query(`DELETE FROM order_status_history WHERE order_id IN (SELECT id FROM orders WHERE user_id = ?)`, [userId], (err) => {
                if (err) console.warn("⚠️ order_status_history silme hatası (görmezden geliniyor):", err.message);
                resolve();
            });
        });

        await new Promise((resolve) => {
            db.query('DELETE FROM orders WHERE user_id = ?', [userId], (err) => {
                if (err) console.warn("⚠️ orders silme hatası (görmezden geliniyor):", err.message);
                resolve();
            });
        });

        await new Promise((resolve) => {
            db.query('DELETE FROM cart WHERE user_id = ?', [userId], (err) => {
                if (err) console.warn("⚠️ cart silme hatası (görmezden geliniyor):", err.message);
                resolve();
            });
        });

        await new Promise((resolve) => {
            db.query('DELETE FROM addresses WHERE user_id = ?', [userId], (err) => {
                if (err) console.warn("⚠️ addresses silme hatası (görmezden geliniyor):", err.message);
                resolve();
            });
        });

        // notifications tablosu recipient_id ve recipient_type kullanıyor
        await new Promise((resolve) => {
            db.query("DELETE FROM notifications WHERE recipient_id = ? AND recipient_type = 'customer'", [userId], (err) => {
                if (err) console.warn("⚠️ notifications silme hatası (görmezden geliniyor):", err.message);
                resolve();
            });
        });

        await new Promise((resolve) => {
            db.query('DELETE FROM reviews WHERE user_id = ?', [userId], (err) => {
                if (err) console.warn("⚠️ reviews silme hatası (görmezden geliniyor):", err.message);
                resolve();
            });
        });

        await new Promise((resolve) => {
            db.query('DELETE FROM sessions WHERE user_id = ?', [userId], (err) => {
                if (err) console.warn("⚠️ sessions silme hatası (görmezden geliniyor):", err.message);
                resolve();
            });
        });

        // verification_codes tablosu phone kullanıyor, user_id değil
        if (userPhone) {
            await new Promise((resolve) => {
                db.query('DELETE FROM verification_codes WHERE phone = ?', [userPhone], (err) => {
                    if (err) console.warn("⚠️ verification_codes silme hatası (görmezden geliniyor):", err.message);
                    resolve();
                });
            });
        }

        // Son olarak kullanıcıyı sil
        await new Promise((resolve, reject) => {
            db.query('DELETE FROM users WHERE id = ?', [userId], (err, result) => {
                if (err) {
                    console.error("❌ Kullanıcı silme hatası:", err);
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        });
        
        console.log("🎉 Hesap başarıyla silindi!");
        
        res.json({ 
            success: true, 
            message: 'Hesap başarıyla silindi' 
        });
    } catch (error) {
        console.error('❌ Hesap silme hatası:', error);
        res.status(500).json({ 
            success: false,
            message: 'Hesap silinirken hata oluştu',
            error: error.message
        });
    }
});

module.exports = router;