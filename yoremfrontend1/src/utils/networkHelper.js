import { API_URL } from '../config/api';

/**
 * Backend bağlantısını test eder
 * @returns {Promise<{success: boolean, message: string, details?: any}>}
 */
export const testBackendConnection = async () => {
  try {
    console.log('🔍 Backend bağlantısı test ediliyor:', API_URL);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const startTime = Date.now();
    
    try {
      // Basit bir health check endpoint'i dene (eğer yoksa categories endpoint'ini kullan)
      const response = await fetch(`${API_URL}/api/categories`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      clearTimeout(timeoutId);
      const endTime = Date.now();
      
      if (response.ok) {
        console.log(`✅ Backend bağlantısı başarılı (${endTime - startTime}ms)`);
        return {
          success: true,
          message: 'Backend bağlantısı başarılı',
          responseTime: endTime - startTime
        };
      } else {
        console.warn(`⚠️ Backend yanıt verdi ama hata kodu: ${response.status}`);
        return {
          success: false,
          message: `Backend yanıt verdi ama hata kodu: ${response.status}`,
          status: response.status
        };
      }
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        console.error('❌ Backend bağlantısı zaman aşımına uğradı (3 saniye)');
        return {
          success: false,
          message: 'Backend\'e bağlanılamadı: Zaman aşımı (3 saniye)',
          error: 'TIMEOUT',
          details: {
            apiUrl: API_URL,
            suggestion: 'Backend çalışıyor mu? IP adresi doğru mu? Aynı Wi-Fi ağında mısınız?'
          }
        };
      }
      
      throw fetchError;
    }
  } catch (error) {
    console.error('❌ Backend bağlantı hatası:', error);
    
    let errorMessage = 'Backend\'e bağlanılamadı';
    let errorType = 'UNKNOWN';
    
    if (error.message.includes('Network request failed') || 
        error.message.includes('fetch') ||
        error.message.includes('Failed to connect')) {
      errorMessage = 'Ağ bağlantısı hatası';
      errorType = 'NETWORK_ERROR';
    } else if (error.message.includes('timeout')) {
      errorMessage = 'Bağlantı zaman aşımı';
      errorType = 'TIMEOUT';
    }
    
    return {
      success: false,
      message: errorMessage,
      error: errorType,
      details: {
        apiUrl: API_URL,
        originalError: error.message,
        suggestions: [
          'Backend sunucusunun çalıştığından emin olun',
          `IP adresinin doğru olduğunu kontrol edin: ${API_URL}`,
          'Telefon ve PC\'nin aynı Wi-Fi ağında olduğundan emin olun',
          'PC\'deki firewall\'un 3000 portunu engellemediğinden emin olun',
          'Backend\'in 0.0.0.0 veya PC\'nin IP adresinde dinlediğinden emin olun (localhost değil)'
        ]
      }
    };
  }
};

/**
 * Fetch isteği yaparken daha iyi hata yönetimi sağlar
 * @param {string} url - İstek URL'i
 * @param {RequestInit} options - Fetch seçenekleri
 * @returns {Promise<Response>}
 */
export const safeFetch = async (url, options = {}) => {
  const timeoutDuration = options.timeout || 5000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new Error(`İstek zaman aşımına uğradı (${timeoutDuration}ms): ${url}`);
    }
    
    if (error.message.includes('Network request failed') || 
        error.message.includes('Failed to connect')) {
      throw new Error(`Backend'e bağlanılamadı: ${API_URL}. Backend çalışıyor mu?`);
    }
    
    throw error;
  }
};







