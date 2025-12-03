module.exports = {
  JWT_SECRET: process.env.JWT_SECRET || "your_super_secret_jwt_key_change_this_in_production",
  JWT_EXPIRATION: "1h",
};

