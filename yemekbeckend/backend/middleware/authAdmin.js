const jwt = require("jsonwebtoken");

const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Erişim token'ı bulunamadı." });
  }

  jwt.verify(token, process.env.JWT_SECRET || "your_jwt_secret", (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Geçersiz veya süresi dolmuş token." });
    }

    if (!user.isStaff) {
      return res.status(403).json({ error: "Bu işlem için yetkiniz yok. Yalnızca personel erişebilir." });
    }

    if (user.role !== "admin" && user.role !== "staff") {
      return res.status(403).json({ error: "Bu işlem için yetkiniz yok." });
    }

    req.user = user;
    next();
  });
};

// Opsiyonel token
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next(); // Token yok ama devam et
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (!err) {
      req.user = user; // Token geçerliyse user'ı ekle
    }
    next(); // Token geçersiz olsa bile devam et
  });
};

module.exports = authenticateAdmin;