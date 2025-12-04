const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");
const optionsController = require("../controllers/optionsController");
const authenticateToken = require("../middleware/authMiddleware");
const authenticateAdmin = require("../middleware/authAdmin");

const optionalAuth = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    req.user = null;
    return next();
  }

  authenticateToken(req, res, (err) => {
    if (err) {
      req.user = null;
    }
    next();
  });
};

// ==================== SEPET İŞLEMLERİ ====================

router.get("/cart", authenticateToken, productController.getCart);
router.post("/cart", authenticateToken, productController.addToCart);
router.delete("/cart/:id", authenticateToken, productController.removeFromCart);
router.put("/cart/:id", authenticateToken, productController.updateCartItem);

// ==================== ÜRÜN CRUD İŞLEMLERİ ====================

router.post("/", authenticateAdmin, productController.createProduct);
router.put("/:id", authenticateAdmin, productController.updateProduct);
router.delete("/:id", authenticateAdmin, productController.deleteProduct);

// Tüm ürünleri getir (public)
router.get("/", productController.getAllProducts);

// ==================== ADMIN ÜRÜN İŞLEMLERİ ====================

// Adminler için tüm ürünleri döndüren endpoint
router.get("/admin", authenticateAdmin, productController.getAllProductsAdmin);

// Adminler için tek ürün getiren endpoint
router.get("/admin/:id", authenticateAdmin, productController.getProductByIdAdmin);

// ==================== PARAMETRE İÇEREN ROTALAR (EN SONDA) ====================

// ✅ Ürünün seçeneklerini getir (mobil için)
router.get("/:productId/options", optionsController.getProductOptions);

// Ürün detaylarını getir (public - isteğe bağlı auth)
router.get("/:id", optionalAuth, productController.getProductById);

module.exports = router;