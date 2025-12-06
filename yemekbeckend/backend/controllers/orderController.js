const db = require("../config/db");
const moment = require("moment");

// Transaction işlemleri için yardımcı fonksiyon
// Promise-based veritabanı sorgusu fonksiyonu
const query = (connection, sql, params = []) => {
  return new Promise((resolve, reject) => {
    connection.query(sql, params, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
};

// Promise-based transaction yönetimi
const withTransaction = async (callback, timeoutMs = 15000) => {
  let connection;

  // Timeout promise'i
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(
      () =>
        reject(new Error("Transaction timeout - işlem zaman aşımına uğradı")),
      timeoutMs
    );
  });

  try {
    // Bağlantı al
    connection = await new Promise((resolve, reject) => {
      db.getConnection((err, conn) => {
        if (err) reject(err);
        else resolve(conn);
      });
    });

    // Transaction başlat
    await new Promise((resolve, reject) => {
      connection.beginTransaction((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Callback'i çağır ve timeout ile race
    const result = await Promise.race([
      callback(connection, query),
      timeoutPromise,
    ]);

    // Transaction'ı commit et
    await new Promise((resolve, reject) => {
      connection.commit((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    return result;
  } catch (error) {
    // Hata durumunda rollback yap
    if (connection) {
      await new Promise((resolve) => {
        connection.rollback(() => resolve());
      });
    }
    throw error;
  } finally {
    // Her durumda bağlantıyı serbest bırak
    if (connection) connection.release();
  }
};

// orderController.js - createOrder fonksiyonunu güncelleyin

const createOrder = async (req, res) => {
  try {
    const { address_id, payment_type, note, coupon_code } = req.body;
    const user = req.user;
    console.log("CreateOrder FULL Request Body:", req.body);
    console.log("CreateOrder User:", req.user);
    console.log("Sipariş oluşturma isteği:", { body: req.body, user });

    // Kullanıcı ve yetkilendirme kontrolü
    if (!user) {
      return res.status(401).json({ 
        status: "error",
        error: "Yetkisiz erişim.",
        message: "Yetkisiz erişim."
      });
    }

    // Zorunlu alan kontrolleri
    if (!address_id) {
      return res.status(400).json({ 
        status: "error",
        error: "Teslimat adresi zorunludur.",
        message: "Teslimat adresi zorunludur."
      });
    }

    if (!payment_type || !["cash", "credit_card"].includes(payment_type)) {
      return res.status(400).json({
        status: "error",
        error: "Geçersiz ödeme tipi. 'cash' veya 'credit_card' olmalı.",
        message: "Geçersiz ödeme tipi. 'cash' veya 'credit_card' olmalı."
      });
    }

    // Kullanıcı bilgilerini belirle
    const userId = user.isGuest ? null : user.id;
    const guestId = user.isGuest ? user.id : null;
    const userType = user.isGuest ? "guest" : "registered";

    console.log("Sipariş parametreleri:", {
      userId,
      guestId,
      userType,
      address_id,
      payment_type,
    });

    const result = await withTransaction(async (connection, query) => {
  // 1. Adres kontrolü - VIEW'dan oku
  const addressQuery =
    userType === "guest"
      ? `SELECT * FROM address_with_neighborhood 
         WHERE id = ? AND guest_id = ?`
      : `SELECT * FROM address_with_neighborhood 
         WHERE id = ? AND user_id = ?`;
  
  const addressQueryId = userType === "guest" ? guestId : userId;

  const addressResult = await query(connection, addressQuery, [
    address_id,
    addressQueryId,
  ]);

  if (addressResult.length === 0) {
    const error = new Error("Adres bulunamadı veya size ait değil.");
    error.statusCode = 404;
    throw error;
  }

  console.log("Adres doğrulandı:", addressResult[0]);

  // ✅ Minimum sipariş tutarını sakla
  const minOrderAmount = parseFloat(addressResult[0].minimum_order_amount) || 0;
  console.log("Mahalle minimum sipariş tutarı:", minOrderAmount);

  // 2. Sepet ürünlerini getir
 // 2. Sepet ürünlerini getir
const cartQuery =
  userType === "guest"
    ? "SELECT c.*, p.base_price, p.options AS product_options FROM cart c JOIN products p ON c.product_id = p.id WHERE c.guest_id = ? AND c.user_type = ?"
    : "SELECT c.*, p.base_price, p.options AS product_options FROM cart c JOIN products p ON c.product_id = p.id WHERE c.user_id = ? AND c.user_type = ?";

const cartItems = await query(connection, cartQuery, [
  userType === "guest" ? guestId : userId,
  userType,
]);

if (cartItems.length === 0) {
  const error = new Error("Sepetiniz boş, sipariş oluşturamazsınız.");
  error.statusCode = 400;
  throw error;
}

console.log(`Sepette ${cartItems.length} ürün bulundu.`);

// 3. Toplam tutarı hesapla
let totalAmount = 0;
const orderItemsData = cartItems.map((item) => {
  let unitPrice = parseFloat(item.base_price);

  // ✅ Seçenek fiyatlarını hesapla
  let optionsPrice = 0;
  if (item.options) {
    try {
      const parsedOptions = typeof item.options === 'string' 
        ? JSON.parse(item.options) 
        : item.options;
      
      if (Array.isArray(parsedOptions)) {
        parsedOptions.forEach(option => {
          if (option && option.values && Array.isArray(option.values)) {
            option.values.forEach(val => {
              if (val && val.price_adjustment) {
                optionsPrice += parseFloat(val.price_adjustment);
              }
            });
          }
        });
      }
    } catch (e) {
      console.error('Seçenek fiyatı hesaplama hatası:', e);
    }
  }

  // ✅ Toplam birim fiyat = base_price + seçenek fiyatları
  const toplamBirimFiyat = unitPrice + optionsPrice;
  const itemPrice = toplamBirimFiyat * item.quantity;
  totalAmount += itemPrice;

  return [
    null,
    item.product_id,
    item.quantity,
    toplamBirimFiyat, // ✅ Seçenek dahil fiyat
    item.options,
    item.note,
  ];
});

console.log("Toplam sipariş tutarı:", totalAmount);

  // ✅ ÖNEMLI: Minimum sipariş tutarı kontrolü (kupon uygulanmadan ÖNCE)
  if (minOrderAmount > 0 && totalAmount < minOrderAmount) {
    const error = new Error(
      `Bu mahalle için minimum sipariş tutarı ₺${minOrderAmount.toFixed(2)}'dir. ` +
      `Sepet toplamınız: ₺${totalAmount.toFixed(2)}. ` +
      `Lütfen sepetinize en az ₺${(minOrderAmount - totalAmount).toFixed(2)} daha ürün ekleyiniz.`
    );
    error.statusCode = 400;
    throw error;
  }

  // 4. Kupon kontrolü
  let discountAmount = 0;
  let appliedCouponCode = null;

  if (coupon_code) {
    const couponQuery = `
      SELECT * FROM coupons 
      WHERE code = ? AND active = 1 AND start_date <= NOW() AND end_date >= NOW()
    `;

    const couponResult = await query(connection, couponQuery, [
      coupon_code,
    ]);

    if (couponResult.length === 0) {
      const error = new Error("Geçersiz kupon kodu.");
      error.statusCode = 400;
      throw error;
    }

    const coupon = couponResult[0];

    if (coupon.min_order_amount > totalAmount) {
      const error = new Error(
        `Bu kupon için minimum sipariş tutarı ${coupon.min_order_amount} TL'dir.`
      );
      error.statusCode = 400;
      throw error;
    }

    if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
      const error = new Error("Kupon kullanım limiti doldu.");
      error.statusCode = 400;
      throw error;
    }

    if (coupon.discount_type === "percentage") {
      discountAmount = (totalAmount * coupon.discount_amount) / 100;
    } else if (coupon.discount_type === "fixed") {
      discountAmount = coupon.discount_amount;
    }

    totalAmount = Math.max(totalAmount - discountAmount, 0);

    // Kupon kullanım sayısını güncelle
    await query(
      connection,
      "UPDATE coupons SET usage_count = usage_count + 1 WHERE id = ?",
      [coupon.id]
    );

    appliedCouponCode = coupon.code;
  }

  // 5. Sipariş oluşturma
  const orderQuery = `
    INSERT INTO orders (
      user_id, user_type, address_id, order_time, total_amount, 
      payment_type, order_status, note, coupon_code, guest_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const orderValues = [
    userId,
    userType,
    address_id,
    moment().toDate(),
    totalAmount,
    payment_type,
    "pending",
    note || null,
    appliedCouponCode,
    guestId,
  ];

  const orderResult = await query(connection, orderQuery, orderValues);
  const orderId = orderResult.insertId;

  // 6. Sipariş öğelerini ekle
  const orderItemsQuery = `
    INSERT INTO order_items (
      order_id, product_id, quantity, unit_price, options, note
    ) VALUES ?
  `;

  const finalOrderItemsData = orderItemsData.map((item) => [
    orderId,
    ...item.slice(1),
  ]);
  await query(connection, orderItemsQuery, [finalOrderItemsData]);

  // 7. Sipariş durum geçmişi oluştur
  const statusHistoryQuery = `
    INSERT INTO order_status_history 
    (order_id, old_status, new_status, changed_at, note) 
    VALUES (?, ?, ?, ?, ?)
  `;

  await query(connection, statusHistoryQuery, [
    orderId,
    null,
    "pending",
    moment().toDate(),
    "Sipariş oluşturuldu",
  ]);

  // 8. Sepeti temizle
  const clearCartQuery =
    userType === "guest"
      ? "DELETE FROM cart WHERE guest_id = ? AND user_type = ?"
      : "DELETE FROM cart WHERE user_id = ? AND user_type = ?";

  await query(connection, clearCartQuery, [
    userType === "guest" ? guestId : userId,
    userType,
  ]);

  // İşlem sonucunu döndür
  return {
    order_id: orderId,
    total_amount: totalAmount,
    applied_discount: discountAmount || 0,
    coupon_code: appliedCouponCode,
  };
});

    // Transaction başarıyla tamamlandı
    res.status(201).json({
      status: "success",
      message: "Sipariş başarıyla oluşturuldu.",
      ...result,
    });
  } catch (err) {
    // Genel hata yakalama
    console.error("FULL ERROR DETAILS:", err);
    console.error("Error Stack:", err.stack);
    console.error("Error Message:", err.message);
    console.error("Error Status Code:", err.statusCode);
    
    // Hata durumunu ve mesajını belirle
    const statusCode = err.statusCode || 500;
    const errorMessage = err.message || "Sipariş oluşturulurken beklenmeyen bir hata oluştu.";
    
    return res.status(statusCode).json({
      status: "error",
      error: errorMessage,
      message: errorMessage,
      fullErrorMessage: err.message,
      errorStack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

// Kullanıcının siparişlerini getir - DÜZELTİLMİŞ VERSİYON
const getOrders = (req, res) => {
  const user = req.user;

  console.log("getOrders çağrıldı, user:", user);

  // Kullanıcı kontrolü
  if (!user) {
    return res.status(401).json({ 
      status: "error",
      error: "Yetkisiz erişim." 
    });
  }

  const userId = user.isGuest ? null : user.id;
  const guestId = user.isGuest ? user.id : null;
  const userType = user.isGuest ? "guest" : "registered";

  console.log("Siparişler getiriliyor:", { userId, guestId, userType });

  const ordersQuery = `
    SELECT 
      o.*,
      a.title AS address_title,
      a.city,
      a.district,
      a.neighborhood,
      a.street,
      a.address_detail,
      s.full_name AS staff_name,
      c.code AS coupon_code,
      c.discount_type,
      c.discount_amount,
      c.created_by AS coupon_created_by,
      sc.full_name AS coupon_created_by_name
    FROM 
      orders o
    JOIN 
      addresses a ON o.address_id = a.id
    LEFT JOIN 
      staff s ON o.staff_id = s.id
    LEFT JOIN 
      coupons c ON o.coupon_code = c.code
    LEFT JOIN 
      staff sc ON c.created_by = sc.id
    WHERE 
      (o.user_id = ? AND o.user_type = ?) OR (o.guest_id = ? AND o.user_type = ?)
    ORDER BY 
      o.order_time DESC
  `;

  db.query(
    ordersQuery,
    [userId, userType, guestId, userType],
    (err, orders) => {
      if (err) {
        console.error("Sipariş sorgulama hatası:", err.message, err.stack);
        return res.status(500).json({ 
          status: "error",
          error: "Siparişler bulunamadı: " + err.message,
          data: [] // ✅ Hata durumunda boş array dön
        });
      }

      console.log(`${orders ? orders.length : 0} sipariş bulundu.`);

      // ✅ HATA KONTROLÜ: orders undefined veya null ise boş array dön
      if (!orders || !Array.isArray(orders)) {
        console.error("UYARI: orders undefined veya array değil!");
        return res.status(200).json({ 
          status: "success", 
          data: [] 
        });
      }

      if (orders.length === 0) {
        return res.status(200).json({ 
          status: "success", 
          data: [] 
        });
      }

      const orderIds = orders.map((order) => order.id);

      // Sipariş öğelerini getir
      db.query(
        "SELECT oi.* FROM order_items oi WHERE oi.order_id IN (?)",
        [orderIds],
        (err, orderItems) => {
          if (err) {
            console.error("Sipariş öğeleri sorgulama hatası:", err.message, err.stack);
            return res.status(500).json({ 
              status: "error",
              error: "Sipariş öğeleri bulunamadı: " + err.message,
              data: [] // ✅ Hata durumunda boş array dön
            });
          }

          // ✅ orderItems kontrolü
          const safeOrderItems = orderItems || [];

          // Sipariş durumu geçmişini getir
          db.query(
            "SELECT osh.* FROM order_status_history osh WHERE osh.order_id IN (?)",
            [orderIds],
            (err, statusHistory) => {
              if (err) {
                console.error("Durum geçmişi sorgulama hatası:", err.message, err.stack);
                return res.status(500).json({ 
                  status: "error",
                  error: "Durum geçmişi bulunamadı: " + err.message,
                  data: [] // ✅ Hata durumunda boş array dön
                });
              }

              // ✅ statusHistory kontrolü
              const safeStatusHistory = statusHistory || [];

              // Her sipariş için öğeleri ve durum geçmişini birleştir
              const parsedResults = orders.map((order) => ({
                ...order,
                order_items: safeOrderItems.filter(
                  (item) => item.order_id === order.id
                ),
                status_history: safeStatusHistory.filter(
                  (item) => item.order_id === order.id
                ),
              }));

              res.status(200).json({
                status: "success",
                data: parsedResults,
              });
            }
          );
        }
      );
    }
  );
};

// Tüm siparişleri getir (admin)
const getAllOrders = (req, res) => {
  const query = `
    SELECT 
      o.*,
      a.title AS address_title,
      a.city,
      a.district,
      a.neighborhood,
      a.street,
      a.address_detail,
      s.full_name AS staff_name,
      su.full_name AS updated_by_name,
      c.code AS coupon_code,
      c.discount_type,
      c.discount_amount,
      c.created_by AS coupon_created_by,
      sc.full_name AS coupon_created_by_name,
      u.full_name AS user_full_name,
      u.email AS user_email,
      a.address_description,
      u.phone AS user_phone
    FROM 
      orders o
    JOIN 
      addresses a ON o.address_id = a.id
    LEFT JOIN 
      staff s ON o.staff_id = s.id
    LEFT JOIN 
      staff su ON o.updated_by = su.id
    LEFT JOIN 
      coupons c ON o.coupon_code = c.code
    LEFT JOIN 
      staff sc ON c.created_by = sc.id
    LEFT JOIN 
      users u ON o.user_id = u.id
    ORDER BY 
      o.order_time DESC
  `;

  db.query(query, (err, orders) => {
    if (err) {
      console.error("Sipariş sorgulama hatası:", err.message, err.stack);
      return res.status(500).json({ error: "Siparişler sorgulanamadı." });
    }

    if (!orders.length) {
      return res.status(200).json({ status: "success", data: [] });
    }

    const orderIds = orders.map((order) => order.id);

    db.query(
      "SELECT oi.* FROM order_items oi WHERE oi.order_id IN (?)",
      [orderIds],
      (err, orderItems) => {
        if (err) {
          console.error(
            "Sipariş öğeleri sorgulama hatası:",
            err.message,
            err.stack
          );
          return res.status(500).json({ error: "Sipariş öğeleri sorgulanamadı." });
        }

        db.query(
          "SELECT osh.* FROM order_status_history osh WHERE osh.order_id IN (?)",
          [orderIds],
          (err, statusHistory) => {
            if (err) {
              console.error(
                "Durum geçmişi sorgulama hatası:",
                err.message,
                err.stack
              );
              return res
                .status(500)
                .json({ error: "Durum geçmişi sorgulanamadı." });
            }

            const parsedResults = orders.map((order) => ({
              ...order,
              order_items: orderItems.filter(
                (item) => item.order_id === order.id
              ),
              status_history: statusHistory.filter(
                (item) => item.order_id === order.id
              ),
            }));

            res.status(200).json({
              status: "success",
              data: parsedResults,
            });
          }
        );
      }
    );
  });
};
// Sipariş durumunu güncelle
const updateOrderStatus = async (req, res) => {
  const { order_id } = req.params;
  const { order_status, note } = req.body;
  const user = req.user;

  try {
    // Mevcut durumu al için promise wrapper
    const getCurrentStatus = () => {
      return new Promise((resolve, reject) => {
        db.query(
          'SELECT new_status as current_status FROM order_status_history WHERE order_id = ? ORDER BY id DESC LIMIT 1', 
          [order_id],
          (err, results) => {
            if (err) reject(err);
            resolve(results);
          }
        );
      });
    };

    // Yeni durum kaydını ekle için promise wrapper
    const insertStatusHistory = (oldStatus) => {
      return new Promise((resolve, reject) => {
        db.query(
          'INSERT INTO order_status_history (order_id, old_status, new_status, changed_at, staff_id, note) VALUES (?, ?, ?, NOW(), ?, ?)',
          [order_id, oldStatus, order_status, user.id, note || 'Durum güncellendi'],
          (err, result) => {
            if (err) reject(err);
            resolve(result);
          }
        );
      });
    };

    // Orders tablosunu güncelle için promise wrapper
    const updateOrderStatusInTable = () => {
      return new Promise((resolve, reject) => {
        db.query(
          'UPDATE orders SET order_status = ? WHERE id = ?', 
          [order_status, order_id],
          (err, result) => {
            if (err) reject(err);
            resolve(result);
          }
        );
      });
    };

    // Mevcut durumu al
    const currentStatusRows = await getCurrentStatus();
    const oldStatus = currentStatusRows.length > 0 
      ? currentStatusRows[0].current_status 
      : null;

    // Sırayla işlemleri yap
    await insertStatusHistory(oldStatus);
    await updateOrderStatusInTable();

    res.status(200).json({
      status: "success", 
      message: "Sipariş durumu başarıyla güncellendi."
    });

  } catch (error) {
    console.error("Durum güncelleme hatası:", error);
    res.status(500).json({ 
      status: "error", 
      message: error.message || "Sipariş durumu güncellenirken bir hata oluştu." 
    });
  }
};
// Siparişi iptal et
const cancelOrder = (req, res) => {
  const { order_id } = req.params;
  const user = req.user;

  console.log("cancelOrder çağrıldı:", { order_id, user });

  if (!user) {
    return res.status(401).json({ error: "Yetkisiz erişim." });
  }

  const userId = user.isGuest ? null : user.id;
  const guestId = user.isGuest ? user.id : null;
  const userType = user.isGuest ? "guest" : "registered";

  withTransaction(
    (connection, cb) => {
      connection.query(
        `
      SELECT * FROM orders 
      WHERE id = ? AND ((user_id = ? AND user_type = ?) OR (guest_id = ? AND user_type = ?))
      `,
        [order_id, userId, userType, guestId, userType],
        (err, results) => {
          if (err) {
            return cb(err);
          }

          if (results.length === 0) {
            return cb(new Error("Sipariş bulunamadı veya size ait değil."));
          }

          const order = results[0];

          if (order.order_status === "delivered") {
            return cb(new Error("Teslim edilmiş siparişler iptal edilemez."));
          }

          if (order.order_status === "cancelled") {
            return cb(new Error("Sipariş zaten iptal edilmiş."));
          }

          connection.query(
            "UPDATE orders SET order_status = 'cancelled', updated_at = ? WHERE id = ?",
            [moment().toDate(), order_id],
            (err) => {
              if (err) {
                return cb(err);
              }

              connection.query(
                "INSERT INTO order_status_history (order_id, old_status, new_status, changed_at, staff_id, note) VALUES (?, ?, ?, ?, ?, ?)",
                [
                  order_id,
                  order.order_status,
                  "cancelled",
                  moment().toDate(),
                  null,
                  "Sipariş kullanıcı tarafından iptal edildi",
                ],
                (err) => {
                  if (err) {
                    return cb(err);
                  }

                  cb(null);
                }
              );
            }
          );
        }
      );
    },
    (err) => {
      if (err) {
        console.error("Sipariş iptal etme hatası:", err.message, err.stack);
        return res
          .status(err.message.includes("bulunamadı") ? 404 : 500)
          .json({ error: err.message });
      }

      res.status(200).json({
        status: "success",
        message: "Sipariş başarıyla iptal edildi.",
      });
    }
  );
};

const getOrderById = (req, res) => {
  const { id } = req.params;
  const user = req.user;

  console.log("getOrderById çağrıldı:", { id, user });

  if (!user || user.role !== "admin") {
    return res.status(403).json({ error: "Bu işlem için yetkiniz yok." });
  }

  const orderQuery = `
  SELECT 
    o.*,
    a.title AS address_title,
    a.city,
    a.district,
    a.neighborhood,
    a.street,
    a.address_detail,
    s.full_name AS staff_name,
    su.full_name AS updated_by_name,
    c.code AS coupon_code,
    c.discount_type,
    c.discount_amount,
    c.created_by AS coupon_created_by,
    sc.full_name AS coupon_created_by_name,
    u.full_name AS user_full_name,
    u.email AS user_email,
    a.address_description,
    u.phone AS user_phone
  FROM 
    orders o
  JOIN 
    addresses a ON o.address_id = a.id
  LEFT JOIN 
    staff s ON o.staff_id = s.id
  LEFT JOIN 
    staff su ON o.updated_by = su.id
  LEFT JOIN 
    coupons c ON o.coupon_code = c.code
  LEFT JOIN 
    staff sc ON c.created_by = sc.id
  LEFT JOIN 
    users u ON o.user_id = u.id
  WHERE 
    o.id = ?
`;
  db.query(orderQuery, [id], (err, orders) => {
    if (err) {
      console.error("Sipariş sorgulama hatası:", err.message, err.stack);
      return res.status(500).json({ error: "Sipariş sorgulanamadı." });
    }

    if (!orders.length) {
      return res.status(404).json({ error: "Sipariş bulunamadı." });
    }

    const order = orders[0];

    // Sipariş öğelerini getir
    db.query(
      `
      SELECT 
        oi.*,
        p.name AS product_name,
        p.base_price AS product_base_price
      FROM 
        order_items oi
      JOIN 
        products p ON oi.product_id = p.id
      WHERE 
        oi.order_id = ?
      `,
      [id],
      (err, orderItems) => {
        if (err) {
          console.error(
            "Sipariş öğeleri sorgulama hatası:",
            err.message,
            err.stack
          );
          return res
            .status(500)
            .json({ error: "Sipariş öğeleri sorgulanamadı." });
        }

        // Sipariş durumu geçmişini getir
        db.query(
          "SELECT osh.* FROM order_status_history osh WHERE osh.order_id = ?",
          [id],
          (err, statusHistory) => {
            if (err) {
              console.error(
                "Durum geçmişi sorgulama hatası:",
                err.message,
                err.stack
              );
              return res
                .status(500)
                .json({ error: "Durum geçmişi sorgulanamadı." });
            }

            const parsedOrder = {
              ...order,
              order_items: orderItems,
              status_history: statusHistory,
            };

            res.status(200).json({
              status: "success",
              data: parsedOrder,
            });
          }
        );
      }
    );
  });
};

// Sipariş durumlarını getir
const getOrderStatuses = (req, res) => {
  const orderStatuses = [
    { value: 'pending', label: 'Beklemede' },
    { value: 'preparing', label: 'Hazırlanıyor' },
    { value: 'on_the_way', label: 'Yolda' },
    { value: 'delivered', label: 'Teslim Edildi' },
    { value: 'cancelled', label: 'İptal Edildi' }
  ];
  
  return res.status(200).json({
    status: "success",
    data: orderStatuses
  });
};

const getOrderDetails = async (req, res) => {
  const orderId = req.params.orderId;

  try {
    const [orderRows] = await db.query(
      `SELECT o.id, o.order_date, o.order_time, o.note, o.payment_type, o.phone, o.address, u.name AS customer
       FROM orders o
       JOIN users u ON o.user_id = u.id
       WHERE o.id = ?`,
      [orderId]
    );

    const [items] = await db.query(
      `SELECT oi.quantity, p.name AS product_name, oi.price
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = ?`,
      [orderId]
    );

    if (orderRows.length === 0) {
      return res.status(404).json({ message: 'Sipariş bulunamadı.' });
    }

    res.json({
      ...orderRows[0],
      items,
    });
  } catch (error) {
    console.error('Sipariş detayı hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
};

// Siparişi sil (Admin)
const deleteOrder = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await withTransaction(async (connection, query) => {
      // 1. Siparişin var olup olmadığını kontrol et
      const orderExists = await query(connection, "SELECT id FROM orders WHERE id = ?", [id]);
      if (orderExists.length === 0) {
        const error = new Error("Sipariş bulunamadı.");
        error.statusCode = 404;
        throw error;
      }

      // 2. İlişkili order_items kayıtlarını sil
      await query(connection, "DELETE FROM order_items WHERE order_id = ?", [id]);

      // 3. İlişkili order_status_history kayıtlarını sil
      await query(connection, "DELETE FROM order_status_history WHERE order_id = ?", [id]);

      // 4. Ana sipariş kaydını sil
      const deleteResult = await query(connection, "DELETE FROM orders WHERE id = ?", [id]);

      return deleteResult;
    });

    if (result.affectedRows === 0) {
      // Bu durum withTransaction içindeki kontrolle zaten yakalanmalı ama yine de ekleyelim
      return res.status(404).json({
        status: "error",
        message: "Sipariş bulunamadı.",
      });
    }

    res.status(200).json({
      status: "success",
      message: `Sipariş (ID: ${id}) başarıyla silindi.`,
    });

  } catch (err) {
    const statusCode = err.statusCode || 500;
    const errorMessage = err.message || "Sipariş silinirken bir hata oluştu.";
    console.error("Sipariş silme hatası:", err);
    res.status(statusCode).json({
      status: "error",
      message: errorMessage,
    });
  }
};

// Modül export
module.exports = {
  createOrder,
  getOrders,
  getAllOrders,
  updateOrderStatus,
  cancelOrder,
  getOrderDetails,
  getOrderById,
  getOrderStatuses, // Yeni eklenen fonksiyon
  deleteOrder
};



