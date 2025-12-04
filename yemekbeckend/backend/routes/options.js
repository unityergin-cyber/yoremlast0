const express = require("express");
const router = express.Router();
const optionsController = require("../controllers/optionsController");
const authenticateAdmin = require("../middleware/authAdmin");

// ✅ CORS Middleware - Tüm options route'ları için
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Preflight request'leri hemen döndür
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// ==================== OPTIONS CRUD ====================

// Tüm seçenekleri getir (değerleriyle birlikte)
router.get("/", optionsController.getAllOptions);

// Seçenek oluştur
router.post("/", authenticateAdmin, optionsController.createOption);

// Seçeneği güncelle
router.put("/:id", authenticateAdmin, optionsController.updateOption);

// Seçeneği sil
router.delete("/:id", authenticateAdmin, optionsController.deleteOption);

// ==================== OPTION VALUES CRUD ====================

// Seçeneğe değer ekle
router.post("/:optionId/values", authenticateAdmin, optionsController.createOptionValue);

// Seçenek değerini güncelle
router.put("/values/:valueId", authenticateAdmin, optionsController.updateOptionValue);

// Seçenek değerini sil
router.delete("/values/:valueId", authenticateAdmin, optionsController.deleteOptionValue);

// ==================== PRODUCT OPTIONS ====================

// Ürünün seçeneklerini getir (değerleriyle birlikte)
router.get("/product/:productId", optionsController.getProductOptions);

// Ürüne seçenekleri ata
router.post("/product/:productId/assign", authenticateAdmin, optionsController.assignOptionsToProduct);

// Ürünün seçeneğini güncelle (zorunlu/isteğe bağlı)
router.put("/product/:productId/options/:optionId", authenticateAdmin, optionsController.updateProductOption);

// Ürünün seçeneğini kaldır
router.delete("/product/:productId/options/:optionId", authenticateAdmin, optionsController.removeProductOption);

module.exports = router;