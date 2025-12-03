const express = require("express");
const router = express.Router();
const settingsController = require("../controllers/settingsController");
const authenticateToken = require("../middleware/authMiddleware");

// Admin için genel ayarlar
router.get("/general", authenticateToken, settingsController.getGeneralSettings);
router.put("/general", authenticateToken, settingsController.updateGeneralSettings);

// Mobil uygulama için - herkes erişebilir
router.get("/address-description-enabled", authenticateToken, settingsController.getAddressDescriptionEnabled);

module.exports = router;