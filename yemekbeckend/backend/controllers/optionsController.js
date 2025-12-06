const db = require("../config/db");
const moment = require("moment");

// ==================== OPTIONS CRUD ====================

// Tüm seçenekleri getir (değerleriyle birlikte)
const getAllOptions = (req, res) => {
  const optionsQuery = `
    SELECT id, name, description, type, is_active, created_at, updated_at
    FROM options 
    WHERE is_active = TRUE
    ORDER BY created_at DESC
  `;

  db.query(optionsQuery, (err, options) => {
    if (err) {
      console.error("Seçenekler sorgusu hatası:", err);
      return res.status(500).json({ error: "Seçenekler getirilemedi" });
    }

    if (options.length === 0) {
      return res.status(200).json([]);
    }

    const optionIds = options.map(o => o.id);
    const valuesQuery = `
      SELECT id, option_id, name, price_modifier, is_active
      FROM option_values
      WHERE option_id IN (?) AND is_active = TRUE
    `;

    db.query(valuesQuery, [optionIds], (err, values) => {
      if (err) {
        console.error("Seçenek değerleri sorgusu hatası:", err);
        return res.status(500).json({ error: "Seçenek değerleri getirilemedi" });
      }

      const optionsMap = new Map(options.map(o => [o.id, {...o, values: []}]));
      
      values.forEach(v => {
        if (optionsMap.has(v.option_id)) {
          const { option_id, ...value } = v;
          optionsMap.get(v.option_id).values.push(value);
        }
      });

      res.status(200).json(Array.from(optionsMap.values()));
    });
  });
};

// Seçenek oluştur
const createOption = (req, res) => {
  const { name, description, type } = req.body;

  if (!name || !type) {
    return res.status(400).json({ error: "Seçenek adı ve türü zorunludur" });
  }

  if (!["single", "multiple"].includes(type)) {
    return res.status(400).json({ error: "Seçenek türü 'single' veya 'multiple' olmalıdır" });
  }

  const query = `
    INSERT INTO options (name, description, type, is_active, created_at, updated_at)
    VALUES (?, ?, ?, TRUE, ?, ?)
  `;

  db.query(
    query,
    [name, description || null, type, moment().toDate(), moment().toDate()],
    (err, result) => {
      if (err) {
        console.error("Seçenek ekleme hatası:", err);
        return res.status(500).json({ error: "Seçenek eklenemedi" });
      }

      res.status(201).json({
        status: "success",
        message: "Seçenek başarıyla eklendi",
        option_id: result.insertId,
      });
    }
  );
};

// Seçeneği güncelle
const updateOption = (req, res) => {
  const { id } = req.params;
  const { name, description, type } = req.body;

  if (!name || !type) {
    return res.status(400).json({ error: "Seçenek adı ve türü zorunludur" });
  }

  if (!["single", "multiple"].includes(type)) {
    return res.status(400).json({ error: "Seçenek türü 'single' veya 'multiple' olmalıdır" });
  }

  const query = `
    UPDATE options
    SET name = ?, description = ?, type = ?, updated_at = ?
    WHERE id = ?
  `;

  db.query(
    query,
    [name, description || null, type, moment().toDate(), id],
    (err, result) => {
      if (err) {
        console.error("Seçenek güncelleme hatası:", err);
        return res.status(500).json({ error: "Seçenek güncellenemedi" });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Seçenek bulunamadı" });
      }

      res.status(200).json({
        status: "success",
        message: "Seçenek başarıyla güncellendi",
      });
    }
  );
};

// Seçeneği sil (soft delete)
const deleteOption = (req, res) => {
  const { id } = req.params;

  const query = `
    UPDATE options
    SET is_active = FALSE, updated_at = ?
    WHERE id = ?
  `;

  db.query(query, [moment().toDate(), id], (err, result) => {
    if (err) {
      console.error("Seçenek silme hatası:", err);
      return res.status(500).json({ error: "Seçenek silinemedi" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Seçenek bulunamadı" });
    }

    res.status(200).json({
      status: "success",
      message: "Seçenek başarıyla silindi",
    });
  });
};

// ==================== OPTION VALUES CRUD ====================

// Seçenek değeri ekle
const createOptionValue = (req, res) => {
  const { optionId } = req.params;
  const { name, price_modifier } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Değer adı zorunludur" });
  }

  const priceModifier = parseFloat(price_modifier) || 0;

  // Seçeneği kontrol et
  db.query(
    "SELECT id FROM options WHERE id = ?",
    [optionId],
    (err, options) => {
      if (err || options.length === 0) {
        return res.status(404).json({ error: "Seçenek bulunamadı" });
      }

      const query = `
        INSERT INTO option_values (option_id, name, price_modifier, is_active, created_at, updated_at)
        VALUES (?, ?, ?, TRUE, ?, ?)
      `;

      db.query(
        query,
        [optionId, name, priceModifier, moment().toDate(), moment().toDate()],
        (err, result) => {
          if (err) {
            console.error("Değer ekleme hatası:", err);
            return res.status(500).json({ error: "Değer eklenemedi" });
          }

          res.status(201).json({
            status: "success",
            message: "Değer başarıyla eklendi",
            value_id: result.insertId,
          });
        }
      );
    }
  );
};

// Seçenek değerini güncelle
const updateOptionValue = (req, res) => {
  const { valueId } = req.params;
  const { name, price_modifier } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Değer adı zorunludur" });
  }

  const priceModifier = parseFloat(price_modifier) || 0;

  const query = `
    UPDATE option_values
    SET name = ?, price_modifier = ?, updated_at = ?
    WHERE id = ?
  `;

  db.query(
    query,
    [name, priceModifier, moment().toDate(), valueId],
    (err, result) => {
      if (err) {
        console.error("Değer güncelleme hatası:", err);
        return res.status(500).json({ error: "Değer güncellenemedi" });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Değer bulunamadı" });
      }

      res.status(200).json({
        status: "success",
        message: "Değer başarıyla güncellendi",
      });
    }
  );
};

// Seçenek değerini sil
const deleteOptionValue = (req, res) => {
  const { valueId } = req.params;

  const query = `
    UPDATE option_values
    SET is_active = FALSE, updated_at = ?
    WHERE id = ?
  `;

  db.query(query, [moment().toDate(), valueId], (err, result) => {
    if (err) {
      console.error("Değer silme hatası:", err);
      return res.status(500).json({ error: "Değer silinemedi" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Değer bulunamadı" });
    }

    res.status(200).json({
      status: "success",
      message: "Değer başarıyla silindi",
    });
  });
};

// ==================== PRODUCT OPTIONS ====================

// ✅ DÜZELTME: Boş array'i kabul et ve tüm seçenekleri kaldır
const assignOptionsToProduct = (req, res) => {
  const { productId } = req.params;
  const { options } = req.body;

  // ✅ Array kontrolü yap ama boş array'e izin ver
  if (!Array.isArray(options)) {
    return res.status(400).json({ error: "Seçenekler dizisi gereklidir" });
  }

  // Ürün kontrol et
  db.query(
    "SELECT id FROM products WHERE id = ?",
    [productId],
    (err, products) => {
      if (err) {
        return res.status(500).json({ error: "Veritabanı hatası" });
      }

      if (products.length === 0) {
        return res.status(404).json({ error: "Ürün bulunamadı" });
      }

      // Mevcut seçenekleri sil
      db.query(
        "DELETE FROM product_options WHERE product_id = ?",
        [productId],
        (deleteErr) => {
          if (deleteErr) {
            return res.status(500).json({ error: "Seçenekler silinirken hata oluştu" });
          }

          // ✅ Eğer options boşsa, sadece silme işlemi yap ve başarılı dön
          if (options.length === 0) {
            return res.status(200).json({
              status: "success",
              message: "Ürün seçenekleri başarıyla kaldırıldı",
            });
          }

          // Yeni seçenekleri ekle
          const insertPromises = options.map(
            (opt) =>
              new Promise((resolve, reject) => {
                const query = `
                  INSERT INTO product_options (product_id, option_id, is_required, created_at)
                  VALUES (?, ?, ?, ?)
                `;

                db.query(
                  query,
                  [productId, opt.option_id, opt.is_required ? 1 : 0, moment().toDate()],
                  (insertErr, result) => {
                    if (insertErr) reject(insertErr);
                    else resolve(result);
                  }
                );
              })
          );

          Promise.all(insertPromises)
            .then(() => {
              res.status(200).json({
                status: "success",
                message: "Seçenekler başarıyla atandı",
              });
            })
            .catch((error) => {
              console.error("Seçenek ekleme hatası:", error);
              res.status(500).json({ error: "Seçenekler eklenirken hata oluştu" });
            });
        }
      );
    }
  );
};

// Ürünün seçeneklerini getir (değerleriyle birlikte)
const getProductOptions = (req, res) => {
  const { productId } = req.params;

  const optionsQuery = `
    SELECT 
      o.id,
      o.name,
      o.description,
      o.type,
      po.is_required,
      po.created_at
    FROM options o
    INNER JOIN product_options po ON o.id = po.option_id
    WHERE po.product_id = ? AND o.is_active = TRUE
    ORDER BY po.created_at
  `;

  db.query(optionsQuery, [productId], (err, options) => {
    if (err) {
      console.error("Ürün seçenekleri sorgusu hatası:", err);
      return res.status(500).json({ error: "Seçenekler getirilemedi" });
    }

    // ✅ Seçenek yoksa boş array dön (hata değil)
    if (options.length === 0) {
      return res.status(200).json([]);
    }

    const optionIds = options.map(o => o.id);
    const valuesQuery = `
      SELECT id, option_id, name, price_modifier
      FROM option_values
      WHERE option_id IN (?) AND is_active = TRUE
    `;

    db.query(valuesQuery, [optionIds], (err, values) => {
      if (err) {
        console.error("Ürün seçenek değerleri sorgusu hatası:", err);
        return res.status(500).json({ error: "Seçenek değerleri getirilemedi" });
      }

      const optionsMap = new Map(options.map(o => [o.id, {...o, values: []}]));
      
      values.forEach(v => {
        if (optionsMap.has(v.option_id)) {
          const { option_id, ...value } = v;
          optionsMap.get(v.option_id).values.push(value);
        }
      });

      res.status(200).json(Array.from(optionsMap.values()));
    });
  });
};

// Ürünün seçeneğini güncelle (zorunlu/isteğe bağlı)
const updateProductOption = (req, res) => {
  const { productId, optionId } = req.params;
  const { is_required } = req.body;

  const query = `
    UPDATE product_options
    SET is_required = ?
    WHERE product_id = ? AND option_id = ?
  `;

  db.query(query, [is_required ? 1 : 0, productId, optionId], (err, result) => {
    if (err) {
      console.error("Seçenek güncelleme hatası:", err);
      return res.status(500).json({ error: "Seçenek güncellenemedi" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Ürün seçeneği bulunamadı" });
    }

    res.status(200).json({
      status: "success",
      message: "Seçenek başarıyla güncellendi",
    });
  });
};

// Ürünün seçeneğini kaldır
const removeProductOption = (req, res) => {
  const { productId, optionId } = req.params;

  const query = `
    DELETE FROM product_options
    WHERE product_id = ? AND option_id = ?
  `;

  db.query(query, [productId, optionId], (err, result) => {
    if (err) {
      console.error("Seçenek silme hatası:", err);
      return res.status(500).json({ error: "Seçenek silinemedi" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Ürün seçeneği bulunamadı" });
    }

    res.status(200).json({
      status: "success",
      message: "Seçenek başarıyla kaldırıldı",
    });
  });
};

module.exports = {
  getAllOptions,
  createOption,
  updateOption,
  deleteOption,
  createOptionValue,
  updateOptionValue,
  deleteOptionValue,
  assignOptionsToProduct,
  getProductOptions,
  updateProductOption,
  removeProductOption,
};