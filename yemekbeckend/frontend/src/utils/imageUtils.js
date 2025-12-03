// Resim URL'lerini düzeltmek için utility fonksiyonu
// Sadece gerekli durumlarda base URL ekler, mevcut çalışan yapıya dokunmaz
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

/**
 * Backend'den gelen resim yolunu tam URL'ye çevirir
 * Mevcut çalışan URL'lere dokunmaz, sadece eksik olanlara base URL ekler
 * @param {string} imagePath - Backend'den gelen resim yolu
 * @returns {string} - Tam URL veya orijinal yol
 */
export const getImageUrl = (imagePath) => {
  if (!imagePath) {
    return "https://via.placeholder.com/300?text=Resim+Yok";
  }

  // Eğer zaten tam URL ise (http:// veya https:// ile başlıyorsa), olduğu gibi döndür
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    return imagePath;
  }

  // Eğer yol zaten doğru formatta ise (örneğin backend'den tam URL geliyorsa), olduğu gibi döndür
  // Sadece relative path'ler için base URL ekle
  // Bu şekilde mevcut çalışan yapıya zarar vermez
  if (imagePath.startsWith("/uploads")) {
    // Sadece relative path ise base URL ekle
    // Eğer zaten çalışıyorsa, bu satır hiç çalışmayacak çünkü yukarıdaki kontrol geçerli olacak
    return `${API_BASE_URL}${imagePath}`;
  }

  // Diğer durumlarda orijinal yolu döndür (mevcut çalışan yapıyı koru)
  return imagePath;
};

/**
 * Resim yükleme hatası için error handler
 * @param {Event} event - Image onerror event
 */
export const handleImageError = (event) => {
  console.warn("Resim yükleme hatası:", event.target.src);
  event.target.src = "https://via.placeholder.com/300?text=Resim+Yüklenemedi";
  event.target.onerror = null; // Sonsuz döngüyü önle
};

