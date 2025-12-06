const db = require("../config/db");
const moment = require("moment");
const multer = require("multer");
const path = require("path");

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Store files in uploads/ directory
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname)); // Unique filename
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error("Yalnızca JPEG, JPG ve PNG dosyaları destekleniyor!"));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
}).single("image"); // Expect a single file with field name "image"

// Ensure uploads directory exists
const fs = require("fs");
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

// productController.js dosyanızda değiştirmeniz gereken fonksiyon

const getAllProducts = (req, res) => {
  const { category_id } = req.query;

  // Sorgu hatalarını gidermek için hata ayıklama
  console.log("Ürün sorgusu çalıştırılıyor, kategori_id:", category_id);

  try {
    // Veritabanı bağlantısını kontrol et
    if (!db || !db.query) {
      console.error("Veritabanı bağlantısı yok veya geçersiz!");
      return res.status(500).json({ error: "Veritabanı bağlantı hatası" });
    }

    // `stock` alanı kaldırıldı çünkü veritabanında mevcut değil
    let query = `
      SELECT 
        p.id,
        p.name,
        p.description,
        p.base_price,
        p.image_url,
        p.options,
        p.ingredients,
        p.is_active,
        p.created_at,
        p.updated_at,
        p.category_id
      FROM 
        products p
      WHERE 
        1=1
    `;

    const queryParams = [];

    // Kategori filtresi ekleme
    if (category_id) {
      query += " AND p.category_id = ?";
      queryParams.push(category_id);
    }

    // Aktif ürünleri filtreleme
    query += " AND p.is_active = TRUE";

    console.log("SQL Sorgusu:", query);
    console.log("Parametreler:", queryParams);

    db.query(query, queryParams, (err, results) => {
      if (err) {
        console.error("Sorgu çalıştırılırken hata oluştu:", err);
        return res
          .status(500)
          .json({ error: "Veritabanı hatası: " + err.message });
      }

      // Sonuç boş olabilir
      if (!results || results.length === 0) {
        return res.status(200).json({
          status: "success",
          data: [],
          message: "Bu kategoride ürün bulunamadı",
        });
      }

      // JSON alanlarını ayrıştırma
      const parsedResults = results.map((product) => {
        try {
          return {
            ...product,
            stock: 0, // Veritabanında olmadığı için varsayılan bir değer ekliyoruz
            options: product.options ? JSON.parse(product.options) : [],
            ingredients: product.ingredients
              ? JSON.parse(product.ingredients)
              : [],
          };
        } catch (e) {
          console.error("JSON ayrıştırma hatası:", e, "Ürün:", product.id);
          return {
            ...product,
            stock: 0,
            options: [],
            ingredients: [],
            _parseError: true,
          };
        }
      });

      res.status(200).json({
        status: "success",
        data: parsedResults,
      });
    });
  } catch (error) {
    console.error("Kritik hata:", error);
    res.status(500).json({
      error: "Sunucu hatası: " + error.message,
    });
  }
};

// Bu fonksiyonu productController.js dosyanızda getAllProducts
// fonksiyonu ile değiştirin ve API'yi yeniden başlatın.

const getProductById = (req, res) => {
  const productId = req.params.id;
  console.log("Ürün detayları getiriliyor, ID:", productId);

  // ID kontrolü
  if (!productId || isNaN(parseInt(productId))) {
    console.log("Geçersiz ürün ID'si:", productId);
    return res.status(400).json({ error: "Geçersiz ürün ID'si" });
  }

  const isAdmin = req.user && req.user.role === "admin";

  // stock alanını kaldırdık (products tablosunda yok)
  const query = `
    SELECT 
      p.id,
      p.name,
      p.description,
      p.base_price,
      p.image_url,
      p.options,
      p.ingredients,
      p.is_active,
      p.created_at,
      p.updated_at,
      p.category_id,
      c.name AS category_name
    FROM 
      products p
    JOIN 
      categories c ON p.category_id = c.id
    WHERE 
      p.id = ? ${isAdmin ? "" : "AND p.is_active = TRUE AND c.is_active = TRUE"}
  `;

  db.query(query, [productId], (err, results) => {
    if (err) {
      console.error("Ürün detayları sorgusu hatası:", err);
      return res
        .status(500)
        .json({ error: "Veritabanı hatası: " + err.message });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: "Ürün bulunamadı" });
    }

    const product = results[0];

    try {
      product.options = product.options ? JSON.parse(product.options) : [];
      product.ingredients = product.ingredients
        ? JSON.parse(product.ingredients)
        : [];
    } catch (e) {
      console.error("JSON çözümleme hatası:", e);
      product.options = [];
      product.ingredients = [];
    }

    res.status(200).json({
      status: "success",
      data: product,
    });
  });
};
const createProduct = (req, res) => {
  upload(req, res, (err) => {
    if (err) {
      console.error("Dosya yükleme hatası:", err);
      return res
        .status(400)
        .json({ error: err.message || "Dosya yükleme hatası." });
    }

    const {
      name,
      description,
      base_price,
      options,        // Eski yapı için geriye uyumluluk
      optionGroups,   // Yeni hiyerarşik yapı
      ingredients,
      is_active = true,
      category_id,
    } = req.body;

    // Validation
    if (!name || !base_price || !category_id) {
      return res.status(400).json({
        error: "Ürün adı, temel fiyat ve kategori ID'si zorunludur.",
      });
    }

    if (isNaN(base_price) || base_price <= 0) {
      return res
        .status(400)
        .json({ error: "Temel fiyat pozitif bir sayı olmalı." });
    }

    // Kategori kontrol et
    db.query(
      "SELECT * FROM categories WHERE id = ? AND is_active = TRUE",
      [category_id],
      (err, categoryResult) => {
        if (err) {
          console.error("Kategori sorgulama hatası:", err);
          return res.status(500).json({ error: "Veritabanı hatası" });
        }

        if (categoryResult.length === 0) {
          return res
            .status(400)
            .json({ error: "Geçersiz veya aktif olmayan kategori ID'si." });
        }

        const image_url = req.file ? `/uploads/${req.file.filename}` : null;

        // ✅ Yeni yapıyı tercih et, yoksa eskiyi kullan
        const optionsData = optionGroups || options;
        const optionsJSONString = optionsData ? JSON.stringify(optionsData) : null; // ✅ İsim değişti
        const ingredientsJSONString = ingredients ? JSON.stringify(ingredients) : null;

        const query = `
          INSERT INTO products (
            name,
            description,
            base_price,
            image_url,
            options,
            ingredients,
            is_active,
            category_id,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
          name,
          description || null,
          Number(base_price),
          image_url,
          optionsJSONString,        // ✅ Yeni isim
          ingredientsJSONString,    // ✅ Yeni isim
          is_active,
          category_id,
          moment().toDate(),
          moment().toDate(),
        ];

        console.log("SQL Sorgusu:", query);
        console.log("Değerler:", values);

        db.query(query, values, (err, result) => {
          if (err) {
            console.error("Ürün eklenirken hata oluştu:", err);
            return res
              .status(500)
              .json({ error: `Ürün eklenemedi: ${err.message}` });
          }

          res.status(201).json({
            status: "success",
            message: "Ürün başarıyla eklendi.",
            product_id: result.insertId,
          });
        });
      }
    );
  });
};

const updateProduct = (req, res) => {
  upload(req, res, (err) => {
    if (err) {
      console.error("Dosya yükleme hatası:", err);
      return res
        .status(400)
        .json({ error: err.message || "Dosya yükleme hatası." });
    }

       const productId = req.params.id;
    const {
      name,
      description,
      base_price,
      options,        // Eski yapı
      optionGroups,   // Yeni yapı
      ingredients,
      is_active,
      category_id,
    } = req.body;


    // is_active'yi 0 veya 1 olarak dönüştürme
    const isActiveBoolean = ["1", "true", true].includes(is_active) ? 1 : 0;
    console.log(
      "Received is_active:",
      is_active,
      "Converted to:",
      isActiveBoolean
    );

    db.query(
      "SELECT * FROM products WHERE id = ?",
      [productId],
      (err, results) => {
        if (err) {
          console.error("Ürün sorgulama hatası:", err);
          return res.status(500).json({ error: "Veritabanı hatası" });
        }

        if (results.length === 0) {
          return res.status(404).json({ error: "Ürün bulunamadı" });
        }

        const existingProduct = results[0];

        if (base_price && (isNaN(base_price) || base_price <= 0)) {
          return res
            .status(400)
            .json({ error: "Temel fiyat pozitif bir sayı olmalı." });
        }

        if (options) {
          try {
            const parsedOptions = JSON.parse(options);
            if (!Array.isArray(parsedOptions)) {
              return res
                .status(400)
                .json({ error: "Seçenekler bir dizi olmalıdır." });
            }
            for (const opt of parsedOptions) {
              if (
                !opt.name ||
                typeof opt.is_default !== "boolean" ||
                typeof opt.price_modifier !== "number"
              ) {
                return res.status(400).json({
                  error:
                    "Seçenekler {name, is_default, price_modifier} formatında olmalıdır.",
                });
              }
              if (opt.price_modifier < 0) {
                return res
                  .status(400)
                  .json({ error: "price_modifier negatif olamaz." });
              }
            }
            const defaultOptions = parsedOptions.filter(
              (opt) => opt.is_default
            );
            if (defaultOptions.length > 1) {
              return res
                .status(400)
                .json({ error: "Yalnızca bir seçenek varsayılan olabilir." });
            }
          } catch (e) {
            return res
              .status(400)
              .json({ error: "Seçenekler geçersiz JSON formatında." });
          }
        }

        if (ingredients) {
          try {
            const parsedIngredients = JSON.parse(ingredients);
            if (!Array.isArray(parsedIngredients)) {
              return res
                .status(400)
                .json({ error: "Malzemeler bir dizi olmalıdır." });
            }
            for (const ing of parsedIngredients) {
              if (!ing.name) {
                return res.status(400).json({
                  error: "Malzemeler {name} formatında olmalıdır.",
                });
              }
            }
          } catch (e) {
            return res
              .status(400)
              .json({ error: "Malzemeler geçersiz JSON formatında." });
          }
        }

        if (category_id) {
          db.query(
            "SELECT * FROM categories WHERE id = ? AND is_active = TRUE",
            [category_id],
            (err, categoryResult) => {
              if (err) {
                console.error("Kategori sorgulama hatası:", err);
                return res.status(500).json({ error: "Veritabanı hatası" });
              }

              if (categoryResult.length === 0) {
                return res.status(400).json({
                  error: "Geçersiz veya aktif olmayan kategori ID'si.",
                });
              }

              updateProductDetails();
            }
          );
        } else {
          updateProductDetails();
        }

        function updateProductDetails() {
      const image_url = req.file
        ? `/uploads/${req.file.filename}`
        : existingProduct.image_url;

      if (req.file && existingProduct.image_url) {
        const oldImagePath = path.join(
          __dirname,
          "..",
          existingProduct.image_url
        );
        fs.unlink(oldImagePath, (err) => {
          if (err) {
            console.error("Eski resim silinirken hata oluştu:", err);
          }
        });
      }

          // ✅ Yeni yapıyı tercih et, yoksa eskiyi kullan
      const optionsData = optionGroups || options;
      const optionsToSave = optionsData || existingProduct.options; // ✅ Farklı isim

      const query = `
        UPDATE products 
        SET 
          name = ?,
          description = ?,
          base_price = ?,
          image_url = ?,
          options = ?,
          ingredients = ?,
          is_active = ?,
          category_id = ?,
          updated_at = ? 
        WHERE 
          id = ?`;

      const values = [
        name || existingProduct.name,
        description !== undefined
          ? description
          : existingProduct.description,
        base_price || existingProduct.base_price,
        image_url,
        optionsToSave, // ✅ Yeni isim
        ingredients || existingProduct.ingredients,
        isActiveBoolean,
        category_id || existingProduct.category_id,
        moment().toDate(),
        productId,
      ];

      console.log("Updating product with values:", values);

      db.query(query, values, (err, result) => {
        if (err) {
          console.error("Ürün güncellenirken hata oluştu:", err);
          return res.status(500).json({ error: "Ürün güncellenemedi." });
        }

        res.status(200).json({
          status: "success",
          message: "Ürün başarıyla güncellendi.",
            });
          });
        }
      }
    );
  });
};
const deleteProduct = (req, res) => {
  const productId = req.params.id;

  db.query(
    "SELECT * FROM products WHERE id = ?",
    [productId],
    (err, results) => {
      if (err) {
        console.error("Ürün sorgulama hatası:", err);
        return res.status(500).json({ error: "Veritabanı hatası" });
      }

      if (results.length === 0) {
        return res.status(404).json({ error: "Ürün bulunamadı" });
      }

      const query =
        "UPDATE products SET is_active = FALSE, updated_at = ? WHERE id = ?";
      db.query(query, [moment().toDate(), productId], (err, result) => {
        if (err) {
          console.error("Ürün silinirken hata oluştu:", err);
          return res.status(500).json({ error: "Ürün silinemedi." });
        }

        res.status(200).json({
          status: "success",
          message: "Ürün başarıyla silindi.",
        });
      });
    }
  );
};

const updateCartItem = (req, res) => {
  const { id } = req.params;
  const { quantity } = req.body;
  const user = req.user;

  // Miktar kontrolü
  if (!quantity || quantity <= 0) {
    return res.status(400).json({
      error: "Geçersiz miktar",
      details: "Miktar 0'dan büyük olmalıdır",
    });
  }

  try {
    // Kullanıcı bilgilerini belirle
    const userId = user.isGuest ? null : user.id;
    const guestId = user.isGuest ? user.id : null;
    const userType = user.isGuest ? "guest" : "registered";

    // Önce sepet öğesinin varlığını ve kullanıcıya ait olup olmadığını kontrol et
    const checkQuery =
      userType === "guest"
        ? "SELECT * FROM cart WHERE id = ? AND guest_id = ?"
        : "SELECT * FROM cart WHERE id = ? AND user_id = ?";

    db.query(
      checkQuery,
      [id, userType === "guest" ? guestId : userId],
      (checkErr, checkResult) => {
        if (checkErr) {
          console.error("Sepet öğesi kontrol hatası:", checkErr);
          return res.status(500).json({
            error: "Sepet kontrolünde hata oluştu",
            details: checkErr.message,
          });
        }

        // Sepet öğesi bulunamadıysa
        if (checkResult.length === 0) {
          return res.status(404).json({
            error: "Sepet öğesi bulunamadı",
            details: "Belirtilen sepet öğesi size ait değil",
          });
        }

        // Güncelleme sorgusu
        const updateQuery =
          userType === "guest"
            ? "UPDATE cart SET quantity = ? WHERE id = ? AND guest_id = ?"
            : "UPDATE cart SET quantity = ? WHERE id = ? AND user_id = ?";

        db.query(
          updateQuery,
          [quantity, id, userType === "guest" ? guestId : userId],
          (updateErr, updateResult) => {
            if (updateErr) {
              console.error("Sepet güncelleme hatası:", updateErr);
              return res.status(500).json({
                error: "Sepet güncellenemedi",
                details: updateErr.message,
              });
            }

            // Başarılı güncelleme
            res.status(200).json({
              message: "Sepet miktarı başarıyla güncellendi",
              updatedQuantity: quantity,
            });
          }
        );
      }
    );
  } catch (error) {
    console.error("Kritik sepet güncelleme hatası:", error);
    res.status(500).json({
      error: "Sunucu hatası",
      details: error.message,
    });
  }
};

const addToCart = (req, res) => {
  console.log("Sepete Ekleme - DETAYLI İstek Bilgileri:", {
    body: JSON.stringify(req.body),
    user: JSON.stringify(req.user),
  });

  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: "Yetkisiz erişim" });
  }

  const { product_id, quantity, options, note } = req.body;

  // Zorunlu alan kontrolleri
  if (!product_id) {
    return res.status(400).json({ error: "Ürün ID'si zorunludur" });
  }

  if (!quantity || quantity <= 0) {
    return res.status(400).json({ error: "Geçerli bir miktar belirtin" });
  }

  // Kullanıcı tipine göre ID belirleme
  const user_id = user.type === "registered" ? user.id : null;
  const guest_id = user.type === "guest" ? user.id : null;
  const user_type = user.type;

  console.log("Sepete Ekleme - Kullanıcı Detayları:", {
    user_id,
    guest_id,
    user_type,
  });

  // Ürün kontrolü ve sepete ekleme
  const checkProductQuery =
    "SELECT * FROM products WHERE id = ? AND is_active = TRUE";

  db.query(checkProductQuery, [product_id], (checkErr, productResults) => {
    if (checkErr) {
      console.error("Ürün kontrol hatası:", checkErr);
      return res.status(500).json({ error: "Ürün kontrolünde hata oluştu" });
    }

    if (productResults.length === 0) {
      return res.status(404).json({ error: "Ürün bulunamadı" });
    }

    // Sepete ekleme sorgusu
    const insertQuery = `
          INSERT INTO cart (
              user_id, 
              user_type, 
              product_id, 
              quantity, 
              options, 
              note, 
              added_at,
              guest_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

    const values = [
      user_id,
      user_type,
      product_id,
      quantity,
      options ? JSON.stringify(options) : null,
      note || null,
      new Date(),
      guest_id,
    ];

    console.log("Sepete Ekleme - SQL Sorgu Detayları:", {
      query: insertQuery,
      values: values,
    });

    db.query(insertQuery, values, (insertErr, result) => {
      if (insertErr) {
        console.error("Sepete ekleme DETAYLI hatası:", insertErr);
        return res.status(500).json({
          error: "Sepete ürün eklenirken hata oluştu",
          details: {
            message: insertErr.message,
            code: insertErr.code,
            sqlState: insertErr.sqlState,
          },
        });
      }

      console.log("Sepete Ekleme - TAM Sonuç:", {
        insertId: result.insertId,
        affectedRows: result.affectedRows,
        changedRows: result.changedRows,
        warningCount: result.warningCount,
        message: result.message,
      });

      res.status(201).json({
        message: "Ürün sepete eklendi",
        cart_id: result.insertId,
        details: {
          affectedRows: result.affectedRows,
        },
      });
    });
  });
};
const getCart = (req, res) => {
  const user = req.user;

  console.log("getCart çağrıldı, req.user:", user);

  if (!user) {
    return res.status(401).json({
      error: "Yetkisiz erişim",
      details: "Kullanıcı bilgisi bulunamadı",
    });
  }

  const userId = user.isGuest ? null : user.id;
  const guestId = user.isGuest ? user.id : null;
  const userType = user.isGuest ? "guest" : "registered";

  console.log("Sepet sorgusu parametreleri:", { userId, guestId, userType });

  const cartQuery = `
    SELECT id, user_id, guest_id, product_id, quantity, options, note
    FROM cart
    WHERE 
      ${user.isGuest ? "guest_id = ?" : "user_id = ?"}
      AND user_type = ?
  `;

  const params = [user.isGuest ? guestId : userId, userType];

  db.query(cartQuery, params, (err, cartItems) => {
    if (err) {
      console.error("Sepet sorgusu hatası:", err);
      return res
        .status(500)
        .json({ error: "Sepet sorgulanamadı: " + err.message });
    }

    console.log("Bulunan sepet öğeleri:", cartItems.length);

    if (cartItems.length === 0) {
      return res.json({
        cart: [],
        total: 0,
      });
    }

    const productIds = cartItems.map((item) => item.product_id);

    const productQuery = `
      SELECT 
        id, 
        name, 
        base_price, 
        image_url,
        category_id
      FROM products
      WHERE id IN (?)
    `;

    db.query(productQuery, [productIds], (err, products) => {
      if (err) {
        console.error("Ürün bilgileri sorgusu hatası:", err);
        return res
          .status(500)
          .json({ error: "Ürün bilgileri getirilemedi: " + err.message });
      }

      const enrichedCart = cartItems.map((cartItem) => {
        const product = products.find((p) => p.id === cartItem.product_id) || {};
        
        let optionsPrice = 0;
        let parseError = false;
        
        if (cartItem.options) {
          try {
            // ✅ 1. RAW OPTIONS LOG
            console.log('=== CART ITEM OPTIONS DEBUG ===');
            console.log('Cart Item ID:', cartItem.id);
            console.log('Raw options type:', typeof cartItem.options);
            console.log('Raw options length:', cartItem.options.length);
            console.log('Raw options (first 200 chars):', cartItem.options.substring(0, 200));
            console.log('Raw options (last 50 chars):', cartItem.options.substring(cartItem.options.length - 50));
            
            // ✅ 2. PARSE ET
            let parsedOptions = cartItem.options;
            if (typeof cartItem.options === 'string') {
              // JSON'ın tamamlanmış olup olmadığını kontrol et
              const startsCorrect = cartItem.options.trim().startsWith('[');
              const endsCorrect = cartItem.options.trim().endsWith(']');
              
              if (!startsCorrect || !endsCorrect) {
                console.error('❌ JSON incomplete! Starts with [:', startsCorrect, 'Ends with ]:', endsCorrect);
                parseError = true;
                throw new Error('JSON string is incomplete');
              }
              
              parsedOptions = JSON.parse(cartItem.options);
              console.log('✅ Successfully parsed options');
            }
            
            // ✅ 3. FIYATLARI HESAPLA
            if (Array.isArray(parsedOptions)) {
              console.log('Options array length:', parsedOptions.length);
              
              parsedOptions.forEach((option, optIndex) => {
                console.log(`\nProcessing option ${optIndex}:`, option.name);
                
                if (option && option.values && Array.isArray(option.values)) {
                  console.log(`  - Values count:`, option.values.length);
                  
                  option.values.forEach((val, valIndex) => {
                    console.log(`  - Value ${valIndex}:`, val.value, 'price_adjustment:', val.price_adjustment);
                    
                    if (val && val.price_adjustment !== undefined && val.price_adjustment !== null) {
                      const priceAdj = parseFloat(val.price_adjustment);
                      if (!isNaN(priceAdj)) {
                        optionsPrice += priceAdj;
                        console.log(`    ✅ Added ${priceAdj} TL (total: ${optionsPrice} TL)`);
                      }
                    }
                  });
                }
              });
            }
            
            console.log(`\n🎯 FINAL options price for cart item ${cartItem.id}: ${optionsPrice} TL`);
            console.log('=================================\n');
            
          } catch (e) {
            console.error('❌ OPTIONS PARSE ERROR for cart item:', cartItem.id);
            console.error('Error message:', e.message);
            console.error('Error stack:', e.stack);
            console.error('Raw options that failed:', cartItem.options);
            parseError = true;
          }
        }
        
        const baseFiyat = parseFloat(product.base_price || 0);
        const toplamBirimFiyat = baseFiyat + optionsPrice;
        
        return {
          id: cartItem.id,
          name: product.name || "Ürün bulunamadı",
          base_price: toplamBirimFiyat,
          unit_price: toplamBirimFiyat,
          price: toplamBirimFiyat,
          quantity: cartItem.quantity,
          options: cartItem.options,
          image_url: product.image_url,
          product_id: cartItem.product_id,
          options_price: optionsPrice,
          base_price_without_options: baseFiyat,
          parse_error: parseError, // ✅ Hata varsa flagle
        };
      });

      const total = enrichedCart.reduce(
        (sum, item) => sum + item.base_price * item.quantity,
        0
      );

      res.json({
        cart: enrichedCart,
        total: total,
      });
    });
  });
};

const removeFromCart = (req, res) => {
  const { id } = req.params;
  const user = req.user;
  const userId = user.isGuest ? null : user.id;
  const guestId = user.isGuest ? user.id : null;
  // removeFromCart fonksiyonunda
  const userType = user.isGuest ? "guest" : "registered"; // "normal" yerine "registered" kullanın

  db.query(
    "DELETE FROM cart WHERE id = ? AND ((user_id = ? AND user_type = ?) OR (guest_id = ? AND user_type = ?))",
    [id, userId, userType, guestId, userType],
    (err, result) => {
      if (err) {
        console.error("Sepetten silme hatası:", err);
        return res.status(500).json({ error: "Ürün sepetten silinemedi." });
      }

      if (result.affectedRows === 0) {
        return res
          .status(404)
          .json({ error: "Sepet öğesi bulunamadı veya size ait değil." });
      }

      res.json({ message: "Ürün sepetten silindi." });
    }
  );
};
const testCartOptions = (req, res) => {
  const testOptions = "[{\"option_id\":1,\"name\":\"Boyut\",\"type\":\"single\",\"values\":[{\"value_id\":6,\"value\":\"Büyük\",\"price_adjustment\":10}]},{\"option_id\":3,\"name\":\"Ekstralar\",\"type\":\"multiple\",\"values\":[{\"value_id\":10,\"value\":\"Cheese\",\"price_adjustment\":3},{\"value_id\":11,\"value\":\"Bacon\",\"price_adjustment\":5}]}]";
  
  let optionsPrice = 0;
  
  try {
    const parsed = JSON.parse(testOptions);
    console.log('Parsed:', JSON.stringify(parsed, null, 2));
    
    if (Array.isArray(parsed)) {
      parsed.forEach(option => {
        console.log('Processing option:', option.name);
        if (option && option.values && Array.isArray(option.values)) {
          option.values.forEach(val => {
            console.log('Processing value:', val.value, 'price:', val.price_adjustment);
            if (val && val.price_adjustment !== undefined) {
              const priceAdj = parseFloat(val.price_adjustment);
              if (!isNaN(priceAdj)) {
                optionsPrice += priceAdj;
                console.log(`Added ${priceAdj}, total now: ${optionsPrice}`);
              }
            }
          });
        }
      });
    }
  } catch (e) {
    console.error('Error:', e);
  }
  
  res.json({
    raw: testOptions,
    parsed: JSON.parse(testOptions),
    calculated_price: optionsPrice
  });
};

// Sonra routes'a ekle
// router.get('/test-options', testCartOptions);
const getAllProductsAdmin = (req, res) => {
  const { category_id } = req.query;

  console.log("Admin ürün sorgusu çalıştırılıyor, kategori_id:", category_id);

  try {
    if (!db || !db.query) {
      console.error("Veritabanı bağlantısı yok veya geçersiz!");
      return res.status(500).json({ error: "Veritabanı bağlantı hatası" });
    }

    let query = `
      SELECT 
        p.id,
        p.name,
        p.description,
        p.base_price,
        p.image_url,
        p.options,
        p.ingredients,
        p.is_active,
        p.created_at,
        p.updated_at,
        p.category_id
      FROM 
        products p
      WHERE 
        1=1
    `;

    const queryParams = [];

    if (category_id) {
      query += " AND p.category_id = ?";
      queryParams.push(category_id);
    }

    // Adminler için is_active filtresi yok, tüm ürünler dönecek
    console.log("Admin SQL Sorgusu:", query);
    console.log("Parametreler:", queryParams);

    db.query(query, queryParams, (err, results) => {
      if (err) {
        console.error("Sorgu çalıştırılırken hata oluştu:", err);
        return res
          .status(500)
          .json({ error: "Veritabanı hatası: " + err.message });
      }

      if (!results || results.length === 0) {
        return res.status(200).json({
          status: "success",
          data: [],
          message: "Bu kategoride ürün bulunamadı",
        });
      }

      const parsedResults = results.map((product) => {
        try {
          return {
            ...product,
            stock: 0,
            options: product.options ? JSON.parse(product.options) : [],
            ingredients: product.ingredients
              ? JSON.parse(product.ingredients)
              : [],
          };
        } catch (e) {
          console.error("JSON ayrıştırma hatası:", e, "Ürün:", product.id);
          return {
            ...product,
            stock: 0,
            options: [],
            ingredients: [],
            _parseError: true,
          };
        }
      });

      res.status(200).json({
        status: "success",
        data: parsedResults,
      });
    });
  } catch (error) {
    console.error("Kritik hata:", error);
    res.status(500).json({
      error: "Sunucu hatası: " + error.message,
    });
  }
};

const getProductByIdAdmin = (req, res) => {
  const productId = req.params.id;

  console.log("Admin ürün sorgusu çalıştırılıyor, ürün ID:", productId);

  try {
    if (!db || !db.query) {
      console.error("Veritabanı bağlantısı yok veya geçersiz!");
      return res.status(500).json({ error: "Veritabanı bağlantı hatası" });
    }

    const query = `
      SELECT 
        p.id,
        p.name,
        p.description,
        p.base_price,
        p.image_url,
        p.options,
        p.ingredients,
        p.is_active,
        p.created_at,
        p.updated_at,
        p.category_id
      FROM 
        products p
      WHERE 
        p.id = ?
    `;

    db.query(query, [productId], (err, results) => {
      if (err) {
        console.error("Sorgu çalıştırılırken hata oluştu:", err);
        return res
          .status(500)
          .json({ error: "Veritabanı hatası: " + err.message });
      }

      if (!results || results.length === 0) {
        return res.status(404).json({
          error: "Ürün bulunamadı",
        });
      }

      const product = results[0];
      try {
        const parsedProduct = {
          ...product,
          stock: 0, // Veritabanında yoksa varsayılan değer
          options: product.options ? JSON.parse(product.options) : [],
          ingredients: product.ingredients
            ? JSON.parse(product.ingredients)
            : [],
        };
        res.status(200).json({
          status: "success",
          data: parsedProduct,
        });
      } catch (e) {
        console.error("JSON ayrıştırma hatası:", e, "Ürün:", product.id);
        res.status(500).json({
          error: "Ürün verisi ayrıştırılamadı",
        });
      }
    });
  } catch (error) {
    console.error("Kritik hata:", error);
    res.status(500).json({
      error: "Sunucu hatası: " + error.message,
    });
  }
};

module.exports = {
  getAllProducts,
  getAllProductsAdmin,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductById,
  getProductByIdAdmin,
  getCart,
  addToCart,
  removeFromCart,
  updateCartItem
};
