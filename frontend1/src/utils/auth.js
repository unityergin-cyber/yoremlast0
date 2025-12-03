export const isTokenExpired = (token) => {
  if (!token) return true;
  
  try {
    // Debug için log ekleyelim
    console.log("Token kontrol ediliyor:", token.substring(0, 15) + "...");
    
    const parts = token.split(".");
    if (parts.length !== 3) {
      console.error("Geçersiz token formatı, JWT değil");
      return true;
    }
    
    // Base64 decode işlemi
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map(function (c) {
          return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join("")
    );
    
    const decoded = JSON.parse(jsonPayload);
    console.log("Token payload:", decoded);
    
    if (!decoded.exp) {
      console.warn("Token'da exp (expiration) alanı bulunamadı");
      return false; // exp yoksa süresi dolmamış kabul et
    }
    
    const exp = decoded.exp * 1000; // saniyeyi milisaniyeye çevir
    const now = Date.now();
    
    console.log("Token bitiş tarihi:", new Date(exp).toLocaleString());
    console.log("Şimdiki tarih:", new Date(now).toLocaleString());
    console.log("Token süresi dolmuş mu:", now > exp);
    
    return now > exp;
  } catch (error) {
    console.error("Token çözümleme hatası:", error);
    // Hata durumunda token'ı geçerli olarak kabul et, böylece çıkış yapmaz
    return false;
  }
};